import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  PatchStageItemRequest,
  ReminderListRequest,
  StageItemRequest,
} from './productivity.dto';

describe('ReminderListRequest', () => {
  it('parses false and pagination query values without coercing false to true', async () => {
    const request = plainToInstance(ReminderListRequest, {
      pending: 'false',
      page: '2',
      page_size: '150',
    });

    expect(request.pending).toBe(false);
    expect(request.page).toBe(2);
    expect(request.page_size).toBe(150);
    await expect(validate(request)).resolves.toHaveLength(0);
  });
});

describe('StageItemRequest', () => {
  it('accepts seeded category IDs that use the database UUID format', async () => {
    const request = plainToInstance(StageItemRequest, {
      roadmapStageId: '0c7c6396-c5c8-426c-8483-ac9a0d89b3fb',
      categoryId: '10000000-0000-0000-0000-000000000001',
      content: '',
      endTime: '10:00',
      priority: 'MEDIUM',
      scheduledAt: '2026-11-02',
      startTime: '09:00',
      timezone: 'Asia/Jakarta',
      title: 'Siapkan pemahaman materi teknis',
    });

    await expect(validate(request)).resolves.toHaveLength(0);
  });

  it('accepts seeded category IDs when patching a stage item', async () => {
    const request = plainToInstance(PatchStageItemRequest, {
      categoryId: '10000000-0000-0000-0000-000000000001',
    });

    await expect(validate(request)).resolves.toHaveLength(0);
  });
});
