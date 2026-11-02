import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Company } from '../company/company.entity';
import { ApplicationStatus } from '../application/application.enums';
import { JobApplication } from '../application/entities/job-application.entity';
import {
  DashboardFunnel,
  DashboardSummary,
  DashboardUpcoming,
  FunnelStage,
} from './dashboard.dto';

const TERMINAL_STATUSES = [
  ApplicationStatus.HIRED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
  ApplicationStatus.GHOSTED,
];

const FUNNEL_STATUSES: Array<{ label: string; status: ApplicationStatus }> = [
  { label: 'Applied', status: ApplicationStatus.APPLIED },
  { label: 'In Review', status: ApplicationStatus.IN_REVIEW },
  { label: 'Assessment', status: ApplicationStatus.ASSESSMENT },
  { label: 'Interview', status: ApplicationStatus.INTERVIEW },
  { label: 'Offer', status: ApplicationStatus.OFFER },
];

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly applications: Repository<JobApplication>,
    @InjectRepository(Company)
    private readonly companies: Repository<Company>,
  ) {}

  async summary(userId: string): Promise<DashboardSummary> {
    const countStatus = (status: ApplicationStatus) =>
      this.applications.countBy({
        userId,
        deletedAt: IsNull(),
        status,
      });

    const [
      totalApplications,
      activeApplications,
      interviews,
      assessments,
      offers,
      hired,
      rejected,
      ghosted,
    ] = await Promise.all([
      this.applications.countBy({ userId, deletedAt: IsNull() }),
      this.applications.countBy({
        userId,
        deletedAt: IsNull(),
        archived: false,
        status: Not(In(TERMINAL_STATUSES)),
      }),
      countStatus(ApplicationStatus.INTERVIEW),
      countStatus(ApplicationStatus.ASSESSMENT),
      countStatus(ApplicationStatus.OFFER),
      countStatus(ApplicationStatus.HIRED),
      countStatus(ApplicationStatus.REJECTED),
      countStatus(ApplicationStatus.GHOSTED),
    ]);

    return {
      totalApplications,
      activeApplications,
      interviews,
      assessments,
      offers,
      hired,
      rejected,
      ghosted,
    };
  }

  async funnel(userId: string): Promise<DashboardFunnel> {
    const statuses = [
      ...FUNNEL_STATUSES.map(({ status }) => status),
      ApplicationStatus.WISHLIST,
    ];
    const [totalApplied, ...counts] = await Promise.all([
      this.applications.countBy({ userId, deletedAt: IsNull() }),
      ...statuses.map((status) =>
        this.applications.countBy({ userId, deletedAt: IsNull(), status }),
      ),
    ]);
    const countsByStatus = new Map(
      statuses.map((status, index) => [status, counts[index]]),
    );
    const stages: FunnelStage[] = FUNNEL_STATUSES.map(({ label, status }) => {
      const count = countsByStatus.get(status) ?? 0;
      return {
        stage: label,
        count,
        rate: totalApplied === 0 ? 0 : Math.round((count / totalApplied) * 100),
      };
    });

    return { totalApplied, stages };
  }

  async upcoming(userId: string): Promise<DashboardUpcoming> {
    const rows = await this.applications
      .createQueryBuilder('application')
      .innerJoin(Company, 'company', 'company.id = application.company_id')
      .select('application.id', 'id')
      .addSelect('company.name', 'companyName')
      .addSelect('application.position', 'position')
      .addSelect('application.status', 'status')
      .addSelect('application.applied_date', 'appliedDate')
      .addSelect('application.updated_at', 'updatedAt')
      .where('application.user_id = :userId', { userId })
      .andWhere('application.deleted_at IS NULL')
      .andWhere('application.is_archived = false')
      .andWhere('application.status NOT IN (:...terminalStatuses)', {
        terminalStatuses: TERMINAL_STATUSES,
      })
      .orderBy('application.updated_at', 'DESC')
      .take(5)
      .getRawMany<DashboardUpcoming['items'][number]>();

    return { items: rows };
  }
}
