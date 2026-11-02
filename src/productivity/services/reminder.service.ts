import { Injectable } from '@nestjs/common';
import { Transactional } from '../../shared/config/transactional.config';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import {
  DeleteResponse,
  ReminderListRequest,
  ReminderPatchRequest,
  ReminderRequest,
  ReminderResponse,
  ReminderSnoozeRequest,
} from '../productivity.dto';
import { Reminder } from '../entities/reminder.entity';
import { ProductivityAccess } from '../productivity-access.service';
import { ReminderRepository } from '../repositories/reminder.repository';

@Injectable()
export class ReminderService {
  constructor(
    private readonly reminders: ReminderRepository,
    private readonly access: ProductivityAccess,
  ) {}

  async list(
    userId: string,
    request: ReminderListRequest,
  ): Promise<{
    data: ReminderResponse[];
    meta: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const page = Math.max(request.page - 1, 0);
    const pageSize = Math.min(request.page_size ?? request.pageSize, 100);
    const [reminders, totalItems] =
      await this.reminders.findAllByUserIdOrderByDueAt(
        userId,
        request.pending,
        page,
        pageSize,
      );
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      data: reminders.map((reminder) => this.toResponse(reminder)),
      meta: {
        page: page + 1,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page + 1 < totalPages,
        hasPrevious: page > 0,
      },
    };
  }

  @Transactional()
  async create(
    userId: string,
    request: ReminderRequest,
  ): Promise<ReminderResponse> {
    if (request.applicationId) {
      await this.access.requireOwner(userId, request.applicationId);
    }
    const reminder = this.reminders.create({
      userId,
      applicationId: request.applicationId ?? null,
      type: request.type,
      message: request.message ?? null,
      dueAt: new Date(request.dueAt),
      completed: false,
      snoozedUntil: null,
      createdAt: new Date(),
    });
    return this.toResponse(await this.reminders.save(reminder));
  }

  @Transactional()
  async update(
    userId: string,
    id: string,
    request: ReminderPatchRequest,
  ): Promise<ReminderResponse> {
    const reminder = await this.requireReminder(userId, id);
    if (request.type != null) reminder.type = request.type;
    if (request.dueAt != null) reminder.dueAt = new Date(request.dueAt);
    if (request.message != null) reminder.message = request.message;
    return this.toResponse(await this.reminders.save(reminder));
  }

  @Transactional()
  async complete(userId: string, id: string): Promise<ReminderResponse> {
    const reminder = await this.requireReminder(userId, id);
    reminder.completed = true;
    return this.toResponse(await this.reminders.save(reminder));
  }

  @Transactional()
  async snooze(
    userId: string,
    id: string,
    request: ReminderSnoozeRequest,
  ): Promise<ReminderResponse> {
    const reminder = await this.requireReminder(userId, id);
    reminder.snoozedUntil = new Date(request.snoozedUntil);
    return this.toResponse(await this.reminders.save(reminder));
  }

  @Transactional()
  async delete(userId: string, id: string): Promise<DeleteResponse> {
    const reminder = await this.requireReminder(userId, id);
    await this.reminders.deleteById(reminder.id);
    return { id, deleted: true };
  }

  private async requireReminder(userId: string, id: string): Promise<Reminder> {
    const reminder = await this.reminders.findByIdAndUserId(id, userId);
    if (!reminder) {
      throw new ApiException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        404,
        'Reminder tidak ditemukan.',
      );
    }
    return reminder;
  }

  private toResponse(reminder: Reminder): ReminderResponse {
    return {
      id: reminder.id,
      applicationId: reminder.applicationId,
      type: reminder.type,
      message: reminder.message,
      dueAt: reminder.dueAt,
      completed: reminder.completed,
      snoozedUntil: reminder.snoozedUntil,
      createdAt: reminder.createdAt,
    };
  }
}
