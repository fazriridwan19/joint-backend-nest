import { DataSource } from 'typeorm';
import { ApplicationActivity } from '../../application/entities/application-activity.entity';
import { ApplicationActivityRepository } from '../../application/repositories/application-activity.repository';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import { DataSourceHolder } from '../../shared/config/transactional.config';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowUpChannel, FollowUpStatus } from '../productivity.dto';
import { ProductivityAccess } from '../productivity-access.service';
import { FollowUpRepository } from '../repositories/follow-up.repository';
import { FollowUpService } from './follow-up.service';

describe('FollowUpService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const applicationId = '550e8400-e29b-41d4-a716-446655440001';
  const followUpId = '550e8400-e29b-41d4-a716-446655440002';
  let service: FollowUpService;
  let access: { requireOwner: jest.Mock };
  let followUps: {
    create: jest.Mock;
    findByIdAndApplicationId: jest.Mock;
    save: jest.Mock;
  };
  let activities: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: object;
  };

  beforeEach(() => {
    const followUp = {
      id: followUpId,
      applicationId,
      contactId: null,
      followUpDate: '2026-11-02',
      channel: FollowUpChannel.EMAIL,
      message: null,
      result: null,
      nextFollowUpDate: null,
      status: FollowUpStatus.PLANNED,
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    };
    followUps = {
      create: jest.fn((value: Partial<FollowUp>) => value),
      findByIdAndApplicationId: jest.fn().mockResolvedValue(followUp),
      save: jest.fn(async (value: FollowUp) => value),
    };
    activities = {
      create: jest.fn((value: Partial<ApplicationActivity>) => value),
      save: jest.fn(async (value: Partial<ApplicationActivity>) => value),
    };
    access = { requireOwner: jest.fn().mockResolvedValue(undefined) };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {},
    };
    const dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    } as unknown as DataSource;
    DataSourceHolder.set(dataSource);
    service = new FollowUpService(
      followUps as unknown as FollowUpRepository,
      access as unknown as ProductivityAccess,
      activities as unknown as ApplicationActivityRepository,
    );
  });

  it('completes follow-up and records its timeline activity atomically', async () => {
    const response = await service.complete(userId, applicationId, followUpId, {
      result: 'Rekruter akan mengirim kabar.',
      nextFollowUpDate: '2026-11-10',
    });

    expect(response.status).toBe(FollowUpStatus.COMPLETED);
    expect(response.result).toBe('Rekruter akan mengirim kabar.');
    expect(activities.save).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId,
        eventType: 'FOLLOW_UP_COMPLETED',
        description:
          'Follow-up via EMAIL selesai. Hasil: Rekruter akan mengirim kabar.',
      }),
    );
    expect(access.requireOwner).toHaveBeenCalledWith(userId, applicationId);
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('does not complete follow-ups on applications the user does not own', async () => {
    access.requireOwner.mockRejectedValue(
      new ApiException(BusinessErrorCode.RESOURCE_NOT_FOUND, 404, 'Not found'),
    );

    await expect(
      service.complete(userId, applicationId, followUpId, {}),
    ).rejects.toBeInstanceOf(ApiException);
    expect(followUps.save).not.toHaveBeenCalled();
  });
});
