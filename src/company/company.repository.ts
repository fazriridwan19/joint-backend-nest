import { Injectable } from '@nestjs/common';
import { JobApplication } from '../application/entities/job-application.entity';
import { Company } from './company.entity';
import { BaseRepository } from '../shared/repository/base.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class CompanyRepository extends BaseRepository<Company> {
  constructor(readonly dataSource: DataSource) {
    super(Company, dataSource);
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Company | null> {
    return await this.repo.findOneBy({ id, userId });
  }

  async hasApplications(id: string): Promise<boolean> {
    return this.repo.manager.getRepository(JobApplication).existsBy({
      companyId: id,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async existsByUserIdAndNameIgnoreCase(
    userId: string,
    name: string,
  ): Promise<boolean> {
    return await this.repo
      .createQueryBuilder('company')
      .where('company.user_id = :userId', { userId })
      .andWhere('LOWER(company.name) = LOWER(:name)', { name })
      .getExists();
  }

  async existsByUserIdAndNameIgnoreCaseAndIdNot(
    userId: string,
    name: string,
    id: string,
  ): Promise<boolean> {
    return await this.repo
      .createQueryBuilder('company')
      .where('company.user_id = :userId', { userId })
      .andWhere('LOWER(company.name) = LOWER(:name)', { name })
      .andWhere('company.id != :id', { id })
      .getExists();
  }

  async findAllByUserId(
    userId: string,
    query: string,
    page: number,
    pageSize: number,
  ): Promise<[Company[], number]> {
    const builder = this.repo
      .createQueryBuilder('company')
      .where('company.user_id = :userId', { userId })
      .orderBy('company.name', 'ASC');

    if (query) {
      builder.andWhere('LOWER(company.name) LIKE LOWER(:query)', {
        query: `%${query}%`,
      });
    }

    return await builder
      .skip(page * pageSize)
      .take(pageSize)
      .getManyAndCount();
  }
}
