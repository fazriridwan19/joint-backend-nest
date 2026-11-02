import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource } from 'typeorm';
import { Contact } from '../entities/contact.entity';

@Injectable()
export class ContactRepository extends BaseRepository<Contact> {
  constructor(readonly dataSource: DataSource) {
    super(Contact, dataSource);
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Contact | null> {
    return this.repo.findOneBy({ id, userId });
  }

  async findAllByUserId(userId: string, query?: string): Promise<Contact[]> {
    const builder = this.repo
      .createQueryBuilder('contact')
      .where('contact.user_id = :userId', { userId })
      .orderBy('contact.name', 'ASC')
      .take(100);
    if (query?.trim()) {
      builder.andWhere('LOWER(contact.name) LIKE LOWER(:query)', {
        query: `%${query}%`,
      });
    }
    return builder.getMany();
  }

  async findByIdsAndUserId(ids: string[], userId: string): Promise<Contact[]> {
    if (ids.length === 0) return [];
    return this.repo
      .createQueryBuilder('contact')
      .where('contact.user_id = :userId', { userId })
      .andWhere('contact.id IN (:...ids)', { ids })
      .orderBy('contact.name', 'ASC')
      .getMany();
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
