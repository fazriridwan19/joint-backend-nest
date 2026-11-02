import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource, DeepPartial, In } from 'typeorm';
import { ItemCategory } from '../entities/item-category.entity';

@Injectable()
export class ItemCategoryRepository extends BaseRepository<ItemCategory> {
  constructor(readonly dataSource: DataSource) {
    super(ItemCategory, dataSource);
  }

  async findByIds(ids: string[]): Promise<ItemCategory[]> {
    if (ids.length === 0) return [];
    return this.repo.findBy({ id: In(ids) });
  }

  async findAllActiveByGroupAndOrder(): Promise<ItemCategory[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { group: 'ASC', sortOrder: 'ASC' },
    });
  }

  async upsertCategories(
    categories: DeepPartial<ItemCategory>[],
  ): Promise<void> {
    await this.repo.upsert(categories, ['code']);
  }
}
