import { Injectable } from '@nestjs/common';
import { ApplicationActivityRepository } from '../../application/repositories/application-activity.repository';
import { Transactional } from '../../shared/config/transactional.config';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import {
  FollowUpCompleteRequest,
  FollowUpPatchRequest,
  FollowUpRequest,
  FollowUpResponse,
  FollowUpStatus,
} from '../productivity.dto';
import { FollowUp } from '../entities/follow-up.entity';
import { ProductivityAccess } from '../productivity-access.service';
import { FollowUpRepository } from '../repositories/follow-up.repository';

@Injectable()
export class FollowUpService {
  constructor(
    private readonly followUps: FollowUpRepository,
    private readonly access: ProductivityAccess,
    private readonly activities: ApplicationActivityRepository,
  ) {}

  async list(
    userId: string,
    applicationId: string,
  ): Promise<FollowUpResponse[]> {
    await this.access.requireOwner(userId, applicationId);
    const followUps =
      await this.followUps.findAllByApplicationIdOrderByFollowUpDateDesc(
        applicationId,
      );
    return followUps.map((followUp) => this.toResponse(followUp));
  }

  @Transactional()
  async create(
    userId: string,
    applicationId: string,
    request: FollowUpRequest,
  ): Promise<FollowUpResponse> {
    await this.access.requireOwner(userId, applicationId);
    const followUp = this.followUps.create({
      applicationId,
      contactId: request.contactId ?? null,
      followUpDate: request.followUpDate,
      channel: request.channel,
      message: request.message ?? null,
      result: null,
      nextFollowUpDate: null,
      status: FollowUpStatus.PLANNED,
      createdAt: new Date(),
    });
    return this.toResponse(await this.followUps.save(followUp));
  }

  @Transactional()
  async update(
    userId: string,
    applicationId: string,
    id: string,
    request: FollowUpPatchRequest,
  ): Promise<FollowUpResponse> {
    await this.access.requireOwner(userId, applicationId);
    const followUp = await this.requireFollowUp(applicationId, id);
    if (request.followUpDate != null)
      followUp.followUpDate = request.followUpDate;
    if (request.channel != null) followUp.channel = request.channel;
    if (request.contactId != null) followUp.contactId = request.contactId;
    if (request.message != null) followUp.message = request.message;
    if (request.result != null) followUp.result = request.result;
    if (request.nextFollowUpDate != null)
      followUp.nextFollowUpDate = request.nextFollowUpDate;
    return this.toResponse(await this.followUps.save(followUp));
  }

  @Transactional()
  async complete(
    userId: string,
    applicationId: string,
    id: string,
    request: FollowUpCompleteRequest,
  ): Promise<FollowUpResponse> {
    await this.access.requireOwner(userId, applicationId);
    const followUp = await this.requireFollowUp(applicationId, id);
    followUp.result = request.result ?? null;
    followUp.nextFollowUpDate = request.nextFollowUpDate ?? null;
    followUp.status = FollowUpStatus.COMPLETED;
    const saved = await this.followUps.save(followUp);
    const now = new Date();
    const description = saved.result?.trim()
      ? `Follow-up via ${saved.channel} selesai. Hasil: ${saved.result}`
      : `Follow-up via ${saved.channel} selesai.`;
    await this.activities.save(
      this.activities.create({
        applicationId,
        eventType: 'FOLLOW_UP_COMPLETED',
        description,
        actorType: 'SYSTEM',
        previousStatus: null,
        newStatus: null,
        eventDate: now,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.toResponse(saved);
  }

  private async requireFollowUp(
    applicationId: string,
    id: string,
  ): Promise<FollowUp> {
    const followUp = await this.followUps.findByIdAndApplicationId(
      id,
      applicationId,
    );
    if (!followUp) throw this.notFound();
    return followUp;
  }

  private toResponse(followUp: FollowUp): FollowUpResponse {
    return {
      id: followUp.id,
      applicationId: followUp.applicationId,
      contactId: followUp.contactId,
      followUpDate: followUp.followUpDate,
      channel: followUp.channel,
      message: followUp.message,
      result: followUp.result,
      nextFollowUpDate: followUp.nextFollowUpDate,
      status: followUp.status,
      createdAt: followUp.createdAt,
    };
  }

  private notFound(): ApiException {
    return new ApiException(
      BusinessErrorCode.RESOURCE_NOT_FOUND,
      404,
      'Follow-up tidak ditemukan.',
    );
  }
}
