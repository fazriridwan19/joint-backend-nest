import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { BaseRepository } from '../../shared/repository/base.repository';
import { CandidateCvProject } from '../entities/candidate-cv-project.entity';
import { ProjectItem } from '../entities/project-item.entity';

@Injectable()
export class CvProjectRepository extends BaseRepository<CandidateCvProject> {
  constructor(readonly dataSource: DataSource) {
    super(CandidateCvProject, dataSource);
  }

  findByProfileId(profileId: string): Promise<CandidateCvProject[]> {
    return this.repo.find({ where: { profileId } });
  }
}

@Injectable()
export class CvProjectItemRepository extends BaseRepository<ProjectItem> {
  constructor(readonly dataSource: DataSource) {
    super(ProjectItem, dataSource);
  }

  findByProjectIds(projectIds: string[]): Promise<ProjectItem[]> {
    if (projectIds.length === 0) return Promise.resolve([]);
    return this.repo.find({
      where: { candidateProjectId: In(projectIds) },
    });
  }
}
