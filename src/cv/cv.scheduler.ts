import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import {
  CV_BATCH_SIZE,
  CV_LEGACY_DISPATCH_SCHEDULER_ID,
  CV_RECOVERY_SCHEDULER_ID,
  CV_STALE_PENDING_AGE_MS,
  CV_QUEUE_NAME,
} from './cv-queue.constants';
import { CvProfileStage } from './cv.enums';
import { CvProfileService } from './services/cv-profile.service';
import { CvQueueService } from './services/cv-queue.service';

@Injectable()
export class CvScheduler implements OnModuleInit {
  private readonly logger = new Logger(CvScheduler.name);

  constructor(
    @InjectQueue(CV_QUEUE_NAME) private readonly queue: Queue,
    private readonly profiles: CvProfileService,
    private readonly cvQueue: CvQueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Remove repeat schedulers from earlier versions; stale recovery now runs via cron.
    await this.queue.removeJobScheduler(CV_LEGACY_DISPATCH_SCHEDULER_ID);
    await this.queue.removeJobScheduler(CV_RECOVERY_SCHEDULER_ID);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async recoverStalePendingProfiles(): Promise<void> {
    const olderThan = new Date(Date.now() - CV_STALE_PENDING_AGE_MS);
    await Promise.all(
      [CvProfileStage.EXTRACTION, CvProfileStage.ANALYZE].map(async (stage) => {
        const profiles = await this.profiles.findStalePending(
          stage,
          olderThan,
          CV_BATCH_SIZE,
        );
        await Promise.all(
          profiles.map(async (profile) => {
            try {
              await this.cvQueue.enqueueProfile(profile.id, stage);
            } catch (error) {
              this.logger.error(
                `Failed to requeue stale CV profile ${profile.id} at stage ${stage}`,
                error instanceof Error ? error.stack : String(error),
              );
            }
          }),
        );
      }),
    );
  }
}
