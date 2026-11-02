import { Injectable } from '@nestjs/common';
import { ApplicationActivity } from '../entities/application-activity.entity';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class ApplicationActivityRepository extends BaseRepository<ApplicationActivity> {
  constructor(readonly dataSource: DataSource) {
    super(ApplicationActivity, dataSource);
  }
}
