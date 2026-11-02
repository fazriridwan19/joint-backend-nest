import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource } from 'typeorm';
import { Reminder } from '../entities/reminder.entity';

@Injectable()
export class ReminderRepository extends BaseRepository<Reminder> {
  constructor(readonly dataSource: DataSource) {
    super(Reminder, dataSource);
  }

  async findAllByUserIdOrderByDueAt(
    userId: string,
    pending: boolean,
    page: number,
    pageSize: number,
  ): Promise<[Reminder[], number]> {
    const query = this.repo
      .createQueryBuilder('reminder')
      .where('reminder.user_id = :userId', { userId })
      .orderBy('reminder.due_at', 'ASC');
    if (pending) query.andWhere('reminder.is_completed = false');
    return query
      .skip(page * pageSize)
      .take(pageSize)
      .getManyAndCount();
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Reminder | null> {
    return this.repo.findOneBy({ id, userId });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
