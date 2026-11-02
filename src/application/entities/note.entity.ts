import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'trx_notes', schema: 'j_application' })
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_application_id', type: 'uuid', nullable: false })
  applicationId!: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: false })
  authorId!: string;

  @Column({ type: 'text', nullable: false })
  content!: string;

  @Column({ name: 'is_pinned', type: 'boolean', nullable: false })
  pinned!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt!: Date;
}
