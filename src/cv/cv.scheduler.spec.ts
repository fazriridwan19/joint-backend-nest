import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  CV_BATCH_SIZE,
  CV_LEGACY_DISPATCH_SCHEDULER_ID,
  CV_RECOVERY_SCHEDULER_ID,
  CV_STALE_PENDING_AGE_MS,
} from './cv-queue.constants';
import { CvProfileStage, CvProfileStatus } from './cv.enums';
import { CvScheduler } from './cv.scheduler';

describe('CvScheduler', () => {
  const staleProfile = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    status: CvProfileStatus.PENDING,
    stage: CvProfileStage.EXTRACTION,
  };
  const staleAnalysis = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    status: CvProfileStatus.PENDING,
    stage: CvProfileStage.ANALYZE,
  };
  let scheduler: CvScheduler;
  let queue: {
    removeJobScheduler: jest.Mock;
  };
  let profiles: { findStalePending: jest.Mock };
  let cvQueue: { enqueueProfile: jest.Mock };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    queue = {
      removeJobScheduler: jest.fn().mockResolvedValue(true),
    };
    profiles = {
      findStalePending: jest
        .fn()
        .mockResolvedValueOnce([staleProfile])
        .mockResolvedValueOnce([staleAnalysis]),
    };
    cvQueue = { enqueueProfile: jest.fn().mockResolvedValue(undefined) };
    scheduler = new CvScheduler(
      queue as unknown as Queue,
      profiles as never,
      cvQueue as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('removes old BullMQ repeat schedulers now that cron handles recovery', async () => {
    await scheduler.onModuleInit();

    expect(queue.removeJobScheduler).toHaveBeenCalledWith(
      CV_LEGACY_DISPATCH_SCHEDULER_ID,
    );
    expect(queue.removeJobScheduler).toHaveBeenCalledWith(
      CV_RECOVERY_SCHEDULER_ID,
    );
    expect(queue.removeJobScheduler).toHaveBeenCalledTimes(2);
  });

  it('only requeues pending profiles created more than 30 minutes ago', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await scheduler.recoverStalePendingProfiles();

    expect(profiles.findStalePending).toHaveBeenNthCalledWith(
      1,
      CvProfileStage.EXTRACTION,
      new Date(now - CV_STALE_PENDING_AGE_MS),
      CV_BATCH_SIZE,
    );
    expect(profiles.findStalePending).toHaveBeenNthCalledWith(
      2,
      CvProfileStage.ANALYZE,
      new Date(now - CV_STALE_PENDING_AGE_MS),
      CV_BATCH_SIZE,
    );
    expect(cvQueue.enqueueProfile).toHaveBeenNthCalledWith(
      1,
      staleProfile.id,
      CvProfileStage.EXTRACTION,
    );
    expect(cvQueue.enqueueProfile).toHaveBeenNthCalledWith(
      2,
      staleAnalysis.id,
      CvProfileStage.ANALYZE,
    );
  });

  it('does not claim pending database records while recovering queue jobs', async () => {
    await scheduler.recoverStalePendingProfiles();

    expect(profiles.findStalePending).toHaveBeenCalledTimes(2);
    expect(cvQueue.enqueueProfile).toHaveBeenCalledTimes(2);
  });

  it('logs queue errors and leaves pending profiles available for the next recovery', async () => {
    const logError = jest.spyOn(Logger.prototype, 'error');
    cvQueue.enqueueProfile.mockRejectedValueOnce(
      new Error('Redis unavailable'),
    );

    await expect(
      scheduler.recoverStalePendingProfiles(),
    ).resolves.toBeUndefined();

    expect(cvQueue.enqueueProfile).toHaveBeenCalledTimes(2);
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining(staleProfile.id),
      expect.any(String),
    );
  });
});
