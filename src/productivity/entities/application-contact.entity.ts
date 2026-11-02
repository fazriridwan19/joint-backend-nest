import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'trx_application_contacts', schema: 'j_application' })
export class ApplicationContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_application_id', type: 'uuid', nullable: false })
  applicationId!: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: false })
  contactId!: string;
}
