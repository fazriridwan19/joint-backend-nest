import { Job } from 'bullmq';
import { CvProfileStage } from './cv.enums';

jest.mock('./services/cv-processor.service', () => ({
  CvProcessorService: class CvProcessorService {},
}));
jest.mock('./cv.scheduler', () => ({
  CvScheduler: class CvScheduler {},
}));

import { CvQueueProcessor } from './cv.processor';

describe('CvQueueProcessor', () => {
  it('records an attempt and rethrows processing failures for BullMQ retries', async () => {
    const failure = new Error('Gemini unavailable');
    const processor = { process: jest.fn().mockRejectedValue(failure) };
    const profiles = {
      recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
    };
    const scheduler = { recoverStalePendingProfiles: jest.fn() };
    const worker = new CvQueueProcessor(
      processor as never,
      profiles as never,
      scheduler as never,
    );
    const job = {
      data: {
        profileId: '550e8400-e29b-41d4-a716-446655440001',
        stage: CvProfileStage.EXTRACTION,
      },
      opts: { attempts: 5 },
    } as Job<{ profileId: string; stage: CvProfileStage }>;

    await expect(worker.process(job)).rejects.toBe(failure);
    expect(profiles.recordFailedAttempt).toHaveBeenCalledWith(
      job.data.profileId,
      failure,
      5,
    );
  });

  it('handles the recurring BullMQ recovery job', async () => {
    const processor = { process: jest.fn() };
    const profiles = { recordFailedAttempt: jest.fn() };
    const scheduler = {
      recoverStalePendingProfiles: jest.fn().mockResolvedValue(undefined),
    };
    const worker = new CvQueueProcessor(
      processor as never,
      profiles as never,
      scheduler as never,
    );
    const job = {
      name: 'recover-stale-pending-profiles',
      data: {},
      opts: {},
    } as Job<Record<string, never>>;

    await worker.process(job);

    expect(scheduler.recoverStalePendingProfiles).toHaveBeenCalledTimes(1);
    expect(processor.process).not.toHaveBeenCalled();
  });
});
