import { DataSource, EntityManager, Repository } from 'typeorm';
import { TimelineCreateRequest } from '../application.dto';
import { ApplicationActivity } from '../entities/application-activity.entity';
import { JobApplication } from '../entities/job-application.entity';
import { TimelineService } from './timeline.service';

describe('TimelineService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const applicationId = '550e8400-e29b-41d4-a716-446655440001';
  let service: TimelineService;
  let activityRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    const applicationRepository = {
      findOneBy: jest.fn().mockResolvedValue({ id: applicationId, userId }),
    };
    activityRepository = {
      create: jest.fn((value: Partial<ApplicationActivity>) => value),
      save: jest.fn((value: Partial<ApplicationActivity>) => ({
        ...value,
        id: '550e8400-e29b-41d4-a716-446655440002',
      })),
    };
    const manager = {
      getRepository: jest.fn(
        (entity: typeof ApplicationActivity | typeof JobApplication) =>
          entity === ApplicationActivity
            ? activityRepository
            : applicationRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: EntityManager) => Promise<unknown>) =>
          operation(manager),
      ),
    } as unknown as DataSource;
    service = new TimelineService(
      activityRepository as unknown as Repository<ApplicationActivity>,
      applicationRepository as unknown as Repository<JobApplication>,
      dataSource,
    );
  });

  it('records user-created timeline events after checking application ownership', async () => {
    const request: TimelineCreateRequest = {
      eventType: 'RECRUITER_CALL',
      description: 'Discussed interview availability',
    };

    const response = await service.create(userId, applicationId, request);

    expect(response).toMatchObject({
      eventType: 'RECRUITER_CALL',
      description: 'Discussed interview availability',
      actorType: 'USER',
      previousStatus: null,
      newStatus: null,
    });
    expect(activityRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId, actorType: 'USER' }),
    );
  });
});
