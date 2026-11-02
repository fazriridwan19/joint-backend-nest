import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../shared/repository/base.repository';
import { CandidateCvEducation } from '../entities/candidate-cv-education.entity';

@Injectable()
export class CvEducationRepository extends BaseRepository<CandidateCvEducation> {
  constructor(readonly dataSource: DataSource) {
    super(CandidateCvEducation, dataSource);
  }

  findByProfileId(profileId: string): Promise<CandidateCvEducation[]> {
    return this.repo.find({ where: { profileId } });
  }
}
