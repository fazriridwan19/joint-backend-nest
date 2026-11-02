import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'master_contacts', schema: 'j_application' })
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  role!: string | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({
    name: 'linkedin_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  linkedinUrl!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
    update: false,
  })
  createdAt!: Date;
}
