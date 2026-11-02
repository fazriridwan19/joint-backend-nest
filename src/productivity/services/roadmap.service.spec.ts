import { DataSource } from 'typeorm';
import { ApplicationActivityRepository } from '../../application/repositories/application-activity.repository';
import { DataSourceHolder } from '../../shared/config/transactional.config';
import { Roadmap } from '../entities/roadmap.entity';
import { RoadmapStage } from '../entities/roadmap-stage.entity';
import { ProductivityAccess } from '../productivity-access.service';
import { RoadmapStageStatus } from '../productivity.dto';
import { RoadmapRepository } from '../repositories/roadmap.repository';
import { RoadmapStageRepository } from '../repositories/roadmap-stage.repository';
import { StageItemRepository } from '../repositories/stage-item.repository';
import { RoadmapService } from './roadmap.service';

describe('RoadmapService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const applicationId = '550e8400-e29b-41d4-a716-446655440001';
  const roadmapId = '550e8400-e29b-41d4-a716-446655440002';
  let service: RoadmapService;
  let stages: {
    create: jest.Mock;
    save: jest.Mock;
    findAllByRoadmapIdOrderByStageOrder: jest.Mock;
  };
  let roadmaps: {
    create: jest.Mock;
    save: jest.Mock;
    findByApplicationId: jest.Mock;
  };
  let access: { requireOwner: jest.Mock };

  beforeEach(() => {
    const savedStages: Partial<RoadmapStage>[] = [];
    stages = {
      create: jest.fn((value: Partial<RoadmapStage>) => value),
      save: jest.fn(async (values: Partial<RoadmapStage>[]) => {
        savedStages.push(...values);
        return values;
      }),
      findAllByRoadmapIdOrderByStageOrder: jest.fn(async () => savedStages),
    };
    const roadmap: Partial<Roadmap> = {
      id: roadmapId,
      applicationId,
      custom: false,
    };
    roadmaps = {
      create: jest.fn((value: Partial<Roadmap>) => value),
      save: jest.fn(async () => roadmap),
      findByApplicationId: jest.fn().mockResolvedValue(null),
    };
    access = { requireOwner: jest.fn().mockResolvedValue(undefined) };
    const queryRunner = {
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
    service = new RoadmapService(
      roadmaps as unknown as RoadmapRepository,
      stages as unknown as RoadmapStageRepository,
      {} as StageItemRepository,
      access as unknown as ProductivityAccess,
      {} as ApplicationActivityRepository,
    );
  });

  it('creates the standard eight-stage roadmap for an owned application', async () => {
    const response = await service.create(userId, applicationId, false);

    expect(access.requireOwner).toHaveBeenCalledWith(userId, applicationId);
    expect(response).toMatchObject({
      id: roadmapId,
      jobApplicationId: applicationId,
      isCustom: false,
      progressPercentage: 0,
    });
    expect(response.stages).toHaveLength(8);
    expect(response.stages[0]).toMatchObject({
      name: 'Applied',
      stageOrder: 1,
      status: RoadmapStageStatus.PENDING,
    });
    expect(response.stages[7]).toMatchObject({
      name: 'Hired',
      stageOrder: 8,
    });
  });
});
