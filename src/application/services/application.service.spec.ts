import { DataSource } from 'typeorm';
import { ApplicationRequest } from '../application.dto';
import { ApplicationStatus } from '../application.enums';
import { ApplicationActivity } from '../entities/application-activity.entity';
import { Company } from '../../company/company.entity';
import { JobApplication } from '../entities/job-application.entity';
import { ApiException } from '../../shared/api/api-exception';
import { DataSourceHolder } from '../../shared/config/transactional.config';
import { CompanyRepository } from '../../company/company.repository';
import { ApplicationActivityRepository } from '../repositories/application-activity.repository';
import { ApplicationRepository } from '../repositories/application.repository';
import { ApplicationService } from './application.service';

describe('ApplicationService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const companyId = '550e8400-e29b-41d4-a716-446655440001';
  let service: ApplicationService;
  let companyRepository: {
    findByIdAndUserId: jest.Mock;
    findOneBy: jest.Mock;
  };
  let applicationRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let activityRepository: { create: jest.Mock; save: jest.Mock };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: object;
  };

  beforeEach(() => {
    const company = {
      id: companyId,
      userId,
      name: 'Example Inc',
    } as Company;
    companyRepository = {
      findByIdAndUserId: jest.fn().mockResolvedValue(company),
      findOneBy: jest.fn().mockResolvedValue(company),
    };
    applicationRepository = {
      create: jest.fn((value: Partial<JobApplication>) => value),
      save: jest.fn((value: Partial<JobApplication>) => ({
        ...value,
        id: '550e8400-e29b-41d4-a716-446655440002',
      })),
      findOneBy: jest.fn(),
    };
    activityRepository = {
      create: jest.fn((value: Partial<ApplicationActivity>) => value),
      save: jest.fn((value: Partial<ApplicationActivity>) => value),
    };
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
    service = new ApplicationService(
      applicationRepository as unknown as ApplicationRepository,
      companyRepository as unknown as CompanyRepository,
      activityRepository as unknown as ApplicationActivityRepository,
    );
  });

  it('creates an owned application and its automatic timeline event together', async () => {
    const request: ApplicationRequest = {
      companyId,
      position: '  Software Engineer  ',
      appliedDate: '2026-11-02',
    };

    const response = await service.create(userId, request);

    expect(response).toMatchObject({
      id: '550e8400-e29b-41d4-a716-446655440002',
      companyId,
      companyName: 'Example Inc',
      position: 'Software Engineer',
      status: ApplicationStatus.WISHLIST,
      priority: 'MEDIUM',
    });
    expect(activityRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: response.id,
        eventType: 'APPLICATION_CREATED',
        actorType: 'SYSTEM',
        previousStatus: null,
        newStatus: null,
        description:
          'Lamaran untuk posisi Software Engineer di Example Inc berhasil dibuat.',
      }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('records structured status changes and returns the previous status', async () => {
    const application = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      userId,
      companyId,
      position: 'Engineer',
      status: ApplicationStatus.APPLIED,
      updatedAt: new Date('2026-11-01T00:00:00.000Z'),
    } as JobApplication;
    applicationRepository.findOneBy.mockResolvedValue(application);

    const response = await service.changeStatus(userId, application.id, {
      status: ApplicationStatus.INTERVIEW,
    });

    expect(response).toMatchObject({
      id: application.id,
      previousStatus: ApplicationStatus.APPLIED,
      status: ApplicationStatus.INTERVIEW,
    });
    expect(activityRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'STATUS_CHANGED',
        actorType: 'SYSTEM',
        previousStatus: ApplicationStatus.APPLIED,
        newStatus: ApplicationStatus.INTERVIEW,
        description: 'Status berubah dari APPLIED menjadi INTERVIEW.',
      }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a company not owned by the authenticated user', async () => {
    companyRepository.findByIdAndUserId.mockResolvedValue(null);

    await expect(
      service.create(userId, {
        companyId,
        position: 'Engineer',
        appliedDate: '2026-11-02',
      }),
    ).rejects.toBeInstanceOf(ApiException);

    expect(applicationRepository.save).not.toHaveBeenCalled();
  });

  it('rolls back application creation when its timeline event cannot be saved', async () => {
    activityRepository.save.mockRejectedValue(
      new Error('Timeline write failed'),
    );

    await expect(
      service.create(userId, {
        companyId,
        position: 'Engineer',
        appliedDate: '2026-11-02',
      }),
    ).rejects.toThrow('Timeline write failed');

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });
});
