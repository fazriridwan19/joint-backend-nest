import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../shared/repository/base.repository';
import { CandidateCvSkill } from '../entities/candidate-cv-skill.entity';

@Injectable()
export class CvSkillRepository extends BaseRepository<CandidateCvSkill> {
  constructor(readonly dataSource: DataSource) {
    super(CandidateCvSkill, dataSource);
  }

  findByProfileId(profileId: string): Promise<CandidateCvSkill[]> {
    return this.repo.find({ where: { profileId } });
  }
}
