import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  CV_MAX_ATTEMPTS,
  CV_PROCESS_JOB,
  CV_QUEUE_NAME,
} from '../cv-queue.constants';
import { CvProfileStage } from '../cv.enums';

export interface CvProfileJobData {
  profileId: string;
  stage: CvProfileStage;
}

@Injectable()
export class CvQueueService {
  constructor(@InjectQueue(CV_QUEUE_NAME) private readonly queue: Queue) {}

  async enqueueProfile(
    profileId: string,
    stage: CvProfileStage,
  ): Promise<void> {
    const jobId = `${profileId}-${stage}`;
    const existingJob = await this.queue.getJob(jobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'failed' || state === 'completed') {
        await existingJob.remove();
      } else {
        return;
      }
    }

    await this.queue.add(
      CV_PROCESS_JOB,
      { profileId, stage } satisfies CvProfileJobData,
      {
        jobId,
        attempts: CV_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
  }
}
