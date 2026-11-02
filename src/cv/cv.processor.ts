import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CvLlmService } from 'src/cv/services/cv-llm.service';
import { CvPdfService } from 'src/cv/services/cv-pdf.service';
import { CvStorageService } from 'src/cv/services/cv-storage.service';
import {
  CV_LEGACY_DISPATCH_JOB,
  CV_MAX_ATTEMPTS,
  CV_QUEUE_NAME,
  CV_RECOVERY_JOB,
} from './cv-queue.constants';
import { CvProfileStage, CvProfileStatus } from './cv.enums';
import { CvScheduler } from './cv.scheduler';
import { CvProfileService } from './services/cv-profile.service';

interface CvJobData {
  profileId: string;
  stage: CvProfileStage;
}

@Processor(CV_QUEUE_NAME, { concurrency: 5 })
export class CvQueueProcessor extends WorkerHost {
  constructor(
    private readonly profiles: CvProfileService,
    private readonly scheduler: CvScheduler,
    private readonly storage: CvStorageService,
    private readonly pdf: CvPdfService,
    private readonly llm: CvLlmService,
  ) {
    super();
  }

  async process(job: Job<CvJobData | Record<string, never>>): Promise<void> {
    if (job.name === CV_RECOVERY_JOB || job.name === CV_LEGACY_DISPATCH_JOB) {
      await this.scheduler.recoverStalePendingProfiles();
      return;
    }

    const data = job.data as CvJobData;
    try {
      await this.startProcessing(data.profileId, data.stage);
    } catch (error) {
      await this.profiles.recordFailedAttempt(
        data.profileId,
        error,
        job.opts.attempts ?? CV_MAX_ATTEMPTS,
      );
      throw error;
    }
  }

  async startProcessing(
    profileId: string,
    stage: CvProfileStage,
  ): Promise<void> {
    const claimed = await this.profiles.claimForProcessing(profileId, stage);
    if (!claimed) return;
    const profile = await this.profiles.findForProcessing(profileId);
    if (
      profile.stage !== stage ||
      profile.status !== CvProfileStatus.IN_PROGRESS
    ) {
      return;
    }

    if (stage === CvProfileStage.EXTRACTION) {
      const file = await this.storage.download(profile.filePath);
      const text = await this.pdf.extractText(file);
      const extraction = await this.llm.extract({ cvText: text });
      await this.profiles.saveExtraction(profileId, extraction);
      return;
    }

    if (stage === CvProfileStage.ANALYZE) {
      const input = await this.profiles.getAnalysisInput(profileId);
      const analysis = await this.llm.analyze(input);
      await this.profiles.saveAnalysis(profileId, analysis);
      return;
    }

    throw new Error(`Unsupported CV processing stage: ${stage}`);
  }
}
