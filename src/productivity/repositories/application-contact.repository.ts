import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource } from 'typeorm';
import { ApplicationContact } from '../entities/application-contact.entity';

@Injectable()
export class ApplicationContactRepository extends BaseRepository<ApplicationContact> {
  constructor(readonly dataSource: DataSource) {
    super(ApplicationContact, dataSource);
  }

  async findAllByApplicationId(
    applicationId: string,
  ): Promise<ApplicationContact[]> {
    return this.repo.findBy({ applicationId });
  }

  async existsByApplicationIdAndContactId(
    applicationId: string,
    contactId: string,
  ): Promise<boolean> {
    return this.repo.existsBy({ applicationId, contactId });
  }
}
