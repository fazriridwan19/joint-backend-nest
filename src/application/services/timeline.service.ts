import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { TimelineCreateRequest, TimelineResponse } from '../application.dto';
import { ApplicationActivity } from '../entities/application-activity.entity';
import { JobApplication } from '../entities/job-application.entity';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(ApplicationActivity)
    private readonly activities: Repository<ApplicationActivity>,
    @InjectRepository(JobApplication)
    private readonly applications: Repository<JobApplication>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    userId: string,
    applicationId: string,
    request: TimelineCreateRequest,
  ): Promise<TimelineResponse> {
    return this.dataSource.transaction(async (manager) => {
      await this.requireApplicationOwner(userId, applicationId, manager);
      const now = new Date();
      const repository = manager.getRepository(ApplicationActivity);
      const activity = await repository.save(
        repository.create({
          applicationId,
          eventType: request.eventType,
          description: request.description ?? null,
          actorType: 'USER',
          previousStatus: null,
          newStatus: null,
          eventDate: now,
          createdAt: now,
          updatedAt: now,
        }),
      );
      return this.toResponse(activity);
    });
  }

  async list(
    userId: string,
    applicationId: string,
  ): Promise<TimelineResponse[]> {
    await this.requireApplicationOwner(userId, applicationId);
    const activities = await this.activities.find({
      where: { applicationId },
      order: { eventDate: 'DESC' },
    });
    return activities.map((activity) => this.toResponse(activity));
  }

  private async requireApplicationOwner(
    userId: string,
    applicationId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager
      ? manager.getRepository(JobApplication)
      : this.applications;
    const application = await repository.findOneBy({
      id: applicationId,
      userId,
      deletedAt: IsNull(),
    });
    if (!application) {
      throw new ApiException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        404,
        'Application tidak ditemukan.',
      );
    }
  }

  private toResponse(activity: ApplicationActivity): TimelineResponse {
    return {
      id: activity.id,
      eventType: activity.eventType,
      description: activity.description,
      actorType: activity.actorType,
      previousStatus: activity.previousStatus,
      newStatus: activity.newStatus,
      eventDate: activity.eventDate,
    };
  }
}
