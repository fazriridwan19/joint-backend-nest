import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'master_companies', schema: 'j_application' })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website!: string | null;

  @Column({ name: 'career_url', type: 'varchar', length: 500, nullable: true })
  careerUrl!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  industry!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt!: Date;
}
