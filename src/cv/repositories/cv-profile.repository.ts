import { Injectable } from '@nestjs/common';
import { DataSource, LessThan } from 'typeorm';
import { BaseRepository } from '../../shared/repository/base.repository';
import { CvProfileStage, CvProfileStatus } from '../cv.enums';
import { CandidateCvProfile } from '../entities/candidate-cv-profile.entity';

@Injectable()
export class CvProfileRepository extends BaseRepository<CandidateCvProfile> {
  constructor(readonly dataSource: DataSource) {
    super(CandidateCvProfile, dataSource);
  }

  findById(id: string): Promise<CandidateCvProfile | null> {
    return this.findOneBy({ id });
  }

  findByIdAndApplicationId(
    id: string,
    applicationId: string,
  ): Promise<CandidateCvProfile | null> {
    return this.findOneBy({ id, applicationId });
  }

  findAllByApplicationId(applicationId: string): Promise<CandidateCvProfile[]> {
    return this.repo.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  findStalePending(
    stage: CvProfileStage,
    maxRetryCount: number,
    batchSize: number,
    olderThan: Date,
  ): Promise<CandidateCvProfile[]> {
    return this.repo.find({
      where: {
        stage,
        status: CvProfileStatus.PENDING,
        retryCount: LessThan(maxRetryCount),
        updatedAt: LessThan(olderThan),
      },
      order: { createdAt: 'ASC' },
      take: batchSize,
    });
  }

  async claimForProcessing(
    id: string,
    stage: CvProfileStage,
  ): Promise<boolean> {
    const result = await this.repo.update(
      { id, stage, status: CvProfileStatus.PENDING },
      {
        status: CvProfileStatus.IN_PROGRESS,
        processingStartedAt: new Date(),
      },
    );
    if (result.affected) return true;

    const profile = await this.repo.findOneBy({ id, stage });
    return profile?.status === CvProfileStatus.IN_PROGRESS;
  }

  async updateFailure(
    id: string,
    retryCount: number,
    lastError: string,
    exhausted: boolean,
  ): Promise<void> {
    await this.repo.update(
      { id, status: CvProfileStatus.IN_PROGRESS },
      {
        retryCount,
        lastError: lastError.slice(0, 2000),
        status: exhausted
          ? CvProfileStatus.FAILED
          : CvProfileStatus.IN_PROGRESS,
        processingStartedAt: exhausted ? null : new Date(),
      },
    );
  }
}
