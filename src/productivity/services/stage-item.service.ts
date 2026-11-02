import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Transactional } from '../../shared/config/transactional.config';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import {
  DeleteResponse,
  ItemCategoryResponse,
  PatchStageItemRequest,
  StageItemListRequest,
  StageItemResponse,
  StageItemStatus,
  StageItemRequest,
} from '../productivity.dto';
import { ItemCategory } from '../entities/item-category.entity';
import { Roadmap } from '../entities/roadmap.entity';
import { RoadmapStage } from '../entities/roadmap-stage.entity';
import { StageItem } from '../entities/stage-item.entity';
import { ProductivityAccess } from '../productivity-access.service';
import { ItemCategoryRepository } from '../repositories/item-category.repository';
import { RoadmapRepository } from '../repositories/roadmap.repository';
import { RoadmapStageRepository } from '../repositories/roadmap-stage.repository';
import { StageItemRepository } from '../repositories/stage-item.repository';

@Injectable()
export class StageItemService {
  constructor(
    private readonly stageItems: StageItemRepository,
    private readonly categories: ItemCategoryRepository,
    private readonly roadmaps: RoadmapRepository,
    private readonly stages: RoadmapStageRepository,
    private readonly access: ProductivityAccess,
  ) {}

  async list(
    userId: string,
    applicationId: string,
    request: StageItemListRequest,
    pathStageId?: string,
  ): Promise<StageItemResponse[]> {
    await this.access.requireOwner(userId, applicationId);
    const stageId = pathStageId ?? request.stageId;
    if (pathStageId) await this.requireOwnedStage(applicationId, pathStageId);
    const items = stageId
      ? await this.stageItems.findAllByApplicationIdAndStageId(
          applicationId,
          stageId,
        )
      : await this.stageItems.findAllByApplicationId(applicationId);
    if (items.length === 0) return [];
    const categories = await this.categories.findByIds(
      items.map((item) => item.categoryId),
    );
    return items
      .filter((item) => {
        const category = categories.find(
          (candidate) => candidate.id === item.categoryId,
        );
        if (!category) {
          throw new Error(`Category not found for stage item ${item.id}.`);
        }
        return (
          (!request.categoryCode ||
            request.categoryCode.toLowerCase() ===
              category.code.toLowerCase()) &&
          (!request.categoryGroup ||
            request.categoryGroup === category.group) &&
          (!request.status || request.status === item.status)
        );
      })
      .map((item) => {
        const category = categories.find(
          (candidate) => candidate.id === item.categoryId,
        );
        if (!category) {
          throw new Error(`Category not found for stage item ${item.id}.`);
        }
        return this.toResponse(item, category);
      });
  }

  async listCategories(): Promise<ItemCategoryResponse[]> {
    const categories = await this.categories.findAllActiveByGroupAndOrder();
    return categories.map((category) => ({
      id: category.id,
      code: category.code,
      label: category.label,
      group: category.group,
      icon: category.icon,
      sortOrder: category.sortOrder,
    }));
  }

  @Transactional()
  async create(
    userId: string,
    applicationId: string,
    request: StageItemRequest,
  ): Promise<StageItemResponse> {
    await this.access.requireOwner(userId, applicationId);
    await this.requireOwnedStage(applicationId, request.roadmapStageId);
    const category = await this.requireCategory(request.categoryId);
    this.validateTimeZone(request.timezone);
    const item = this.stageItems.create({
      id: randomUUID(),
      roadmapStageId: request.roadmapStageId,
      jobApplicationId: applicationId,
      userId,
      categoryId: request.categoryId,
      title: request.title?.trim() || category.label,
      content: request.content ?? null,
      status: StageItemStatus.TODO,
      scheduledAt: request.scheduledAt,
      startTime: this.normalizeTime(request.startTime),
      endTime: this.normalizeTime(request.endTime),
      timezone: request.timezone ?? null,
      url: request.url ?? null,
      assignee: request.assignee ?? null,
      location: request.location ?? null,
      priority: request.priority,
      completedAt: null,
      remindedAt: null,
      createdAt: new Date(),
    });
    return this.toResponse(await this.stageItems.save(item), category);
  }

  @Transactional()
  async patch(
    userId: string,
    applicationId: string,
    itemId: string,
    request: PatchStageItemRequest,
  ): Promise<StageItemResponse> {
    await this.access.requireOwner(userId, applicationId);
    const item = await this.requireItem(applicationId, itemId);
    if (request.roadmapStageId != null) {
      await this.requireOwnedStage(applicationId, request.roadmapStageId);
      item.roadmapStageId = request.roadmapStageId;
    }
    if (request.categoryId != null) {
      await this.requireCategory(request.categoryId);
      item.categoryId = request.categoryId;
    }
    if (request.timezone != null) this.validateTimeZone(request.timezone);
    if (request.title != null) item.title = request.title;
    if (request.content != null) item.content = request.content;
    if (request.scheduledAt != null) item.scheduledAt = request.scheduledAt;
    if (request.startTime != null)
      item.startTime = this.normalizeTime(request.startTime);
    if (request.endTime != null)
      item.endTime = this.normalizeTime(request.endTime);
    if (request.timezone != null) item.timezone = request.timezone;
    if (request.url != null) item.url = request.url;
    if (request.assignee != null) item.assignee = request.assignee;
    if (request.location != null) item.location = request.location;
    if (request.priority != null) item.priority = request.priority;
    if (request.status != null) {
      item.status = request.status;
      item.completedAt =
        request.status === StageItemStatus.DONE ? new Date() : null;
    }
    const saved = await this.stageItems.save(item);
    return this.toResponse(saved, await this.requireCategory(saved.categoryId));
  }

  @Transactional()
  async delete(
    userId: string,
    applicationId: string,
    itemId: string,
  ): Promise<DeleteResponse> {
    await this.access.requireOwner(userId, applicationId);
    const item = await this.requireItem(applicationId, itemId);
    await this.stageItems.deleteById(item.id);
    return { id: itemId, deleted: true };
  }

  private async requireOwnedStage(
    applicationId: string,
    stageId: string,
  ): Promise<RoadmapStage> {
    const roadmap = await this.roadmaps.findByApplicationId(applicationId);
    if (!roadmap)
      throw this.notFound(
        `Roadmap tidak ditemukan untuk application: ${applicationId}`,
      );
    const stage = await this.stages.findByIdAndRoadmapId(stageId, roadmap.id);
    if (!stage)
      throw this.notFound(`Roadmap stage tidak ditemukan: ${stageId}`);
    return stage;
  }

  private async requireCategory(id: string): Promise<ItemCategory> {
    const category = await this.categories.findOneBy({ id });
    if (!category) throw this.notFound(`Category tidak ditemukan: ${id}`);
    return category;
  }

  private async requireItem(
    applicationId: string,
    itemId: string,
  ): Promise<StageItem> {
    const item = await this.stageItems.findByIdAndApplicationId(
      itemId,
      applicationId,
    );
    if (!item) {
      throw this.notFound(`Stage item tidak ditemukan: ${itemId}`);
    }
    return item;
  }

  private toResponse(
    item: StageItem,
    category: ItemCategory,
  ): StageItemResponse {
    return {
      id: item.id,
      roadmapStageId: item.roadmapStageId,
      jobApplicationId: item.jobApplicationId,
      userId: item.userId,
      categoryId: category.id,
      categoryCode: category.code,
      categoryLabel: category.label,
      categoryGroup: category.group,
      title: item.title,
      content: item.content,
      scheduledAt: item.scheduledAt,
      startTime: item.startTime,
      endTime: item.endTime,
      timezone: item.timezone,
      url: item.url,
      assignee: item.assignee,
      location: item.location,
      priority: item.priority,
      status: item.status,
    };
  }

  private normalizeTime(value: string): string {
    return value.length === 5 ? `${value}:00` : value;
  }

  private validateTimeZone(timeZone: string | null | undefined): void {
    if (!timeZone) return;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone });
    } catch {
      throw new ApiException(
        BusinessErrorCode.VALIDATION_ERROR,
        400,
        'Timezone tidak valid.',
      );
    }
  }

  private notFound(message: string): ApiException {
    return new ApiException(BusinessErrorCode.RESOURCE_NOT_FOUND, 404, message);
  }
}
