import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Transactional } from '../shared/config/transactional.config';
import { ReminderType, StageItemStatus } from './productivity.dto';
import { ReminderRepository } from './repositories/reminder.repository';
import { StageItemRepository } from './repositories/stage-item.repository';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private readonly stageItems: StageItemRepository,
    private readonly reminders: ReminderRepository,
  ) {}

  @Cron('0 0 17 * * *', { timeZone: 'Asia/Jakarta' })
  @Transactional()
  async sendEveningReminders(): Promise<void> {
    const today = this.todayInJakarta();
    const maxDate = this.addDays(today, 3);

    const tasks = await this.stageItems.findAllAndLockUpcomingReminderTasks(
      today,
      maxDate,
    );
    if (tasks.length === 0) {
      this.logger.log('No upcoming reminder tasks found.');
      return;
    }

    const reminders = tasks.map((task) => {
      if (!task.scheduledAt || !task.startTime) {
        throw new Error(
          `Upcoming stage item ${task.id} is missing its scheduled date or time.`,
        );
      }
      const timeZone = task.timezone || 'Asia/Jakarta';
      const dueAt = this.localDateTimeToDate(
        task.scheduledAt,
        task.startTime,
        timeZone,
      );
      task.remindedAt = today;
      return this.reminders.create({
        userId: task.userId,
        applicationId: task.jobApplicationId,
        type: ReminderType.RECRUITMENT_STAGE,
        message: `Reminder: Anda memiliki jadwal tugas ${task.title} pada ${task.scheduledAt} pukul ${task.startTime}`,
        dueAt,
        completed: false,
        snoozedUntil: null,
        createdAt: new Date(),
      });
    });

    await this.stageItems.save(tasks);
    await this.reminders.save(reminders);
    this.logger.log(`Created ${reminders.length} stage item reminder(s).`);
  }

  private todayInJakarta(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private addDays(date: string, days: number): string {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  private localDateTimeToDate(
    date: string,
    time: string,
    timeZone: string,
  ): Date {
    const localAsUtc = new Date(`${date}T${time}Z`);
    const getOffset = (instant: Date): number => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(instant);
      const values = new Map(
        parts.map((part) => [part.type, Number(part.value)]),
      );
      const asUtc = Date.UTC(
        values.get('year')!,
        values.get('month')! - 1,
        values.get('day')!,
        values.get('hour')!,
        values.get('minute')!,
        values.get('second')!,
      );
      return asUtc - instant.getTime();
    };

    const offset = getOffset(localAsUtc);
    const candidate = new Date(localAsUtc.getTime() - offset);
    return new Date(localAsUtc.getTime() - getOffset(candidate));
  }
}
