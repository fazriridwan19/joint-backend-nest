import { Injectable } from '@nestjs/common';
import { ApplicationListRequest } from '../application.dto';
import { JobApplication } from '../entities/job-application.entity';
import { Company } from '../../company/company.entity';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource, IsNull } from 'typeorm';

@Injectable()
export class ApplicationRepository extends BaseRepository<JobApplication> {
  constructor(readonly dataSource: DataSource) {
    super(JobApplication, dataSource);
  }
  async findAllByUserId(
    userId: string,
    request: ApplicationListRequest,
  ): Promise<[JobApplication[], number]> {
    const page = Math.max(request.page - 1, 0);
    const pageSize = Math.min(request.page_size ?? request.pageSize, 100);
    const query = this.repo
      .createQueryBuilder('application')
      .innerJoin(Company, 'company', 'company.id = application.company_id')
      .where('application.user_id = :userId', { userId })
      .andWhere('application.deleted_at IS NULL')
      .andWhere('application.is_archived = :archived', {
        archived: request.archived,
      })
      .orderBy('application.updatedAt', 'DESC');

    if (request.status) {
      query.andWhere('application.status = :status', {
        status: request.status,
      });
    } else if (request.q?.trim()) {
      query.andWhere(
        '(LOWER(application.position) LIKE LOWER(:search) OR LOWER(company.name) LIKE LOWER(:search))',
        { search: `%${request.q}%` },
      );
    }

    return await query
      .skip(page * pageSize)
      .take(pageSize)
      .getManyAndCount();
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<JobApplication | null> {
    return this.repo.findOneBy({ id, userId, deletedAt: IsNull() });
  }
}
