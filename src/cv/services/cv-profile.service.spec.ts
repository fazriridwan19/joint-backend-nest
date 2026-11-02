import { DataSource } from 'typeorm';
import { ApiException } from '../../shared/api/api-exception';
import { DataSourceHolder } from '../../shared/config/transactional.config';
import { CvProfileStage, CvProfileStatus } from '../cv.enums';
import { CvProfileService } from './cv-profile.service';

describe('CvProfileService', () => {
  const applicationId = '550e8400-e29b-41d4-a716-446655440001';
  const profileId = '550e8400-e29b-41d4-a716-446655440002';
  let service: CvProfileService;
  let profiles: { findByIdAndApplicationId: jest.Mock; save: jest.Mock };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: object;
  };

  beforeEach(() => {
    profiles = {
      findByIdAndApplicationId: jest.fn(),
      save: jest.fn((value: unknown) => Promise.resolve(value)),
    };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {},
    };
    DataSourceHolder.set({
      createQueryRunner: jest.fn(() => queryRunner),
    } as unknown as DataSource);
    service = new CvProfileService(
      profiles as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('moves a completed extraction to the queued analysis stage', async () => {
    const profile = {
      id: profileId,
      applicationId,
      stage: CvProfileStage.EXTRACTION,
      status: CvProfileStatus.COMPLETED,
      retryCount: 0,
      lastError: null,
      processingStartedAt: null,
      summary: null,
      strengths: null,
      weaknesses: null,
    };
    profiles.findByIdAndApplicationId.mockResolvedValue(profile);

    const response = await service.requestAnalysis(profileId, applicationId);

    expect(response).toEqual({
      profileId,
      stage: CvProfileStage.ANALYZE,
      status: CvProfileStatus.PENDING,
      summary: null,
      strengths: null,
      weaknesses: null,
    });
    expect(profiles.save).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: CvProfileStage.ANALYZE,
        status: CvProfileStatus.PENDING,
      }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('does not schedule analysis before extraction is complete', async () => {
    profiles.findByIdAndApplicationId.mockResolvedValue({
      id: profileId,
      stage: CvProfileStage.EXTRACTION,
      status: CvProfileStatus.IN_PROGRESS,
    });

    await expect(
      service.requestAnalysis(profileId, applicationId),
    ).rejects.toBeInstanceOf(ApiException);
    expect(profiles.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
  });
});
