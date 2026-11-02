import { Reminder } from '../entities/reminder.entity';
import { ReminderListRequest } from '../productivity.dto';
import { ProductivityAccess } from '../productivity-access.service';
import { ReminderRepository } from '../repositories/reminder.repository';
import { ReminderService } from './reminder.service';

describe('ReminderService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  let service: ReminderService;
  let reminders: { findAllByUserIdOrderByDueAt: jest.Mock };

  beforeEach(() => {
    reminders = {
      findAllByUserIdOrderByDueAt: jest.fn().mockResolvedValue([[], 0]),
    };
    service = new ReminderService(
      reminders as unknown as ReminderRepository,
      {} as ProductivityAccess,
    );
  });

  it('lists all reminders when pending=false while preserving page metadata', async () => {
    const result = await service.list(userId, {
      pending: false,
      page: 2,
      pageSize: 20,
    } as ReminderListRequest);

    expect(reminders.findAllByUserIdOrderByDueAt).toHaveBeenCalledWith(
      userId,
      false,
      1,
      20,
    );
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: true,
    });
  });
});
