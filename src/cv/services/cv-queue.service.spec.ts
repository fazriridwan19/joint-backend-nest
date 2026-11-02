import { Queue } from 'bullmq';
import { CvProfileStage } from '../cv.enums';
import { CvQueueService } from './cv-queue.service';

describe('CvQueueService', () => {
  const profileId = '550e8400-e29b-41d4-a716-446655440001';
  let queue: { add: jest.Mock; getJob: jest.Mock };
  let service: CvQueueService;

  beforeEach(() => {
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockResolvedValue(null),
    };
    service = new CvQueueService(queue as unknown as Queue);
  });

  it('adds one stable BullMQ job for the requested profile stage', async () => {
    await service.enqueueProfile(profileId, CvProfileStage.EXTRACTION);

    expect(queue.add).toHaveBeenCalledWith(
      'process-profile',
      { profileId, stage: CvProfileStage.EXTRACTION },
      expect.objectContaining({
        jobId: `${profileId}-${CvProfileStage.EXTRACTION}`,
        attempts: 5,
      }),
    );
  });

  it('does not enqueue a duplicate while an equivalent job is active', async () => {
    queue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('active'),
      remove: jest.fn(),
    });

    await service.enqueueProfile(profileId, CvProfileStage.ANALYZE);

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('replaces an old failed job so a pending profile can be recovered', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    queue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('failed'),
      remove,
    });

    await service.enqueueProfile(profileId, CvProfileStage.EXTRACTION);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
});
