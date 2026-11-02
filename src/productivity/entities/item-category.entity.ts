import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ItemCategoryGroup } from '../productivity.dto';

@Entity({ name: 'master_stage_item_categories', schema: 'j_application' })
export class ItemCategory {
  @PrimaryColumn({ type: 'uuid', nullable: false })
  id!: string;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  code!: string;

  @Column({ name: 'label_item', type: 'varchar', length: 100, nullable: false })
  label!: string;

  @Column({ name: 'group_item', type: 'varchar', length: 30, nullable: false })
  group!: ItemCategoryGroup;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon!: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: false })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'integer', nullable: false })
  sortOrder!: number;
}
