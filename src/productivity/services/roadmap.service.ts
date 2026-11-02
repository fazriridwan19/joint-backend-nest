import { Injectable } from '@nestjs/common';
import { ApplicationActivityRepository } from '../../application/repositories/application-activity.repository';
import { Transactional } from '../../shared/config/transactional.config';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import {
  DeleteResponse,
  RoadmapResponse,
  RoadmapStageResponse,
  RoadmapStageStatus,
  StagePatchRequest,
  StageRequest,
  StageItemStatus,
} from '../productivity.dto';
import { Roadmap } from '../entities/roadmap.entity';
import { RoadmapStage } from '../entities/roadmap-stage.entity';
import { ProductivityAccess } from '../productivity-access.service';
import { RoadmapRepository } from '../repositories/roadmap.repository';
import { RoadmapStageRepository } from '../repositories/roadmap-stage.repository';
import { StageItemRepository } from '../repositories/stage-item.repository';

const DEFAULT_STAGES = [
  'Applied',
  'CV Screening',
  'HR Interview',
  'Assessment',
  'Technical Interview',
  'User Interview',
  'Offering',
  'Hired',
];

@Injectable()
export class RoadmapService {
  constructor(
    private readonly roadmaps: RoadmapRepository,
    private readonly stages: RoadmapStageRepository,
    private readonly stageItems: StageItemRepository,
    private readonly access: ProductivityAccess,
    private readonly activities: ApplicationActivityRepository,
  ) {}

  @Transactional()
  async create(
    userId: string,
    applicationId: string,
    custom: boolean,
  ): Promise<RoadmapResponse> {
    await this.access.requireOwner(userId, applicationId);
    if (await this.roadmaps.findByApplicationId(applicationId)) {
      throw new ApiException(
        BusinessErrorCode.DUPLICATE_RESOURCE,
        409,
        'Application sudah memiliki roadmap.',
      );
    }
    const roadmap = await this.roadmaps.save(
      this.roadmaps.create({ applicationId, custom, createdAt: new Date() }),
    );
    if (!custom) {
      await this.stages.save(
        DEFAULT_STAGES.map((name, index) =>
          this.stages.create({
            roadmapId: roadmap.id,
            name,
            description: null,
            stageOrder: index + 1,
            status: RoadmapStageStatus.PENDING,
            scheduledDate: null,
            startedDate: null,
            completedDate: null,
            notes: null,
          }),
        ),
      );
    }
    return this.toRoadmapResponse(roadmap);
  }

  async get(userId: string, applicationId: string): Promise<RoadmapResponse> {
    await this.access.requireOwner(userId, applicationId);
    const roadmap = await this.roadmaps.findByApplicationId(applicationId);
    if (!roadmap) throw this.notFound('Roadmap tidak ditemukan.');
    return this.toRoadmapResponse(roadmap);
  }

  @Transactional()
  async addStage(
    userId: string,
    applicationId: string,
    request: StageRequest,
  ): Promise<RoadmapStageResponse> {
    const roadmap = await this.requireRoadmapOwner(userId, applicationId);
    let order = request.stageOrder;
    if (order == null || order < 1) {
      const existing = await this.stages.findAllByRoadmapIdOrderByStageOrder(
        roadmap.id,
      );
      order = existing.length
        ? existing[existing.length - 1].stageOrder + 1
        : 1;
    }
    const stage = this.stages.create({
      roadmapId: roadmap.id,
      name: request.name.trim(),
      description: request.description ?? null,
      stageOrder: order,
      status: RoadmapStageStatus.PENDING,
      scheduledDate: request.scheduledDate ?? null,
      startedDate: null,
      completedDate: null,
      notes: request.notes?.trim() || null,
    });
    return this.toStageResponse(await this.stages.save(stage));
  }

  @Transactional()
  async updateStage(
    userId: string,
    stageId: string,
    patch: StagePatchRequest,
  ): Promise<RoadmapStageResponse> {
    const stage = await this.requireOwnedStage(userId, stageId);
    if (patch.name?.trim()) stage.name = patch.name.trim();
    if (patch.description != null)
      stage.description = patch.description.trim() || null;
    if (patch.stageOrder != null && patch.stageOrder > 0)
      stage.stageOrder = patch.stageOrder;
    if (patch.scheduledDate != null) stage.scheduledDate = patch.scheduledDate;
    if (patch.notes != null) stage.notes = patch.notes.trim() || null;
    return this.toStageResponse(await this.stages.save(stage));
  }

  @Transactional()
  async deleteStage(userId: string, stageId: string): Promise<DeleteResponse> {
    const stage = await this.requireOwnedStage(userId, stageId);
    await this.stages.deleteById(stage.id);
    return { id: stageId, deleted: true };
  }

  @Transactional()
  async complete(
    userId: string,
    stageId: string,
  ): Promise<RoadmapStageResponse> {
    const stage = await this.requireOwnedStage(userId, stageId);
    const items = await this.stageItems.findAllByRoadmapStageId(stageId);
    if (
      items.some(
        (item) =>
          item.status === StageItemStatus.TODO ||
          item.status === StageItemStatus.IN_PROGRESS,
      )
    ) {
      throw new ApiException(
        BusinessErrorCode.NOT_ACCEPTABLE,
        406,
        'Tidak dapat menyelesaikan stage karena masih ada stage item yang belum selesai.',
      );
    }
    stage.status = RoadmapStageStatus.COMPLETED;
    stage.completedDate = this.today();
    const saved = await this.stages.save(stage);
    const roadmap = await this.roadmaps.findOneBy({ id: stage.roadmapId });
    if (roadmap) {
      const now = new Date();
      await this.activities.save(
        this.activities.create({
          applicationId: roadmap.applicationId,
          eventType: 'STAGE_COMPLETED',
          description: `Tahap rekrutmen "${stage.name}" (urutan ${stage.stageOrder}) berhasil diselesaikan.`,
          actorType: 'SYSTEM',
          previousStatus: null,
          newStatus: null,
          eventDate: now,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    return this.toStageResponse(saved);
  }

  private async requireRoadmapOwner(
    userId: string,
    applicationId: string,
  ): Promise<Roadmap> {
    await this.access.requireOwner(userId, applicationId);
    const roadmap = await this.roadmaps.findByApplicationId(applicationId);
    if (!roadmap) throw this.notFound('Roadmap tidak ditemukan.');
    return roadmap;
  }

  private async requireOwnedStage(
    userId: string,
    stageId: string,
  ): Promise<RoadmapStage> {
    const stage = await this.stages.findOneBy({ id: stageId });
    if (!stage) throw this.notFound('Stage tidak ditemukan.');
    const roadmap = await this.roadmaps.findOneBy({ id: stage.roadmapId });
    if (!roadmap) throw this.notFound('Roadmap tidak ditemukan.');
    await this.access.requireOwner(userId, roadmap.applicationId);
    return stage;
  }

  private async toRoadmapResponse(roadmap: Roadmap): Promise<RoadmapResponse> {
    const stages = await this.stages.findAllByRoadmapIdOrderByStageOrder(
      roadmap.id,
    );
    const completed = stages.filter(
      (stage) => stage.status === RoadmapStageStatus.COMPLETED,
    ).length;
    return {
      id: roadmap.id,
      jobApplicationId: roadmap.applicationId,
      isCustom: roadmap.custom,
      progressPercentage: stages.length ? (completed * 100) / stages.length : 0,
      stages: stages.map((stage) => this.toStageResponse(stage)),
    };
  }

  private toStageResponse(stage: RoadmapStage): RoadmapStageResponse {
    return {
      id: stage.id,
      name: stage.name,
      description: stage.description,
      stageOrder: stage.stageOrder,
      status: stage.status,
      scheduledDate: stage.scheduledDate,
      completedDate: stage.completedDate,
      notes: stage.notes,
    };
  }

  private today(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private notFound(message: string): ApiException {
    return new ApiException(BusinessErrorCode.RESOURCE_NOT_FOUND, 404, message);
  }
}
