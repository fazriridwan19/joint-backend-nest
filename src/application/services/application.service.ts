import { Injectable } from '@nestjs/common';
import { Company } from '../../company/company.entity';
import { CompanyRepository } from '../../company/company.repository';
import { Transactional } from '../../shared/config/transactional.config';
import { In, IsNull } from 'typeorm';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import { ApplicationActivityRepository } from '../repositories/application-activity.repository';
import { ApplicationRepository } from '../repositories/application.repository';
import {
  ApplicationListRequest,
  ApplicationPatchRequest,
  ApplicationRequest,
  ApplicationResponse,
  ArchiveResponse,
  StatusRequest,
  StatusResponse,
} from '../application.dto';
import { ApplicationPriority, ApplicationStatus } from '../application.enums';
import { JobApplication } from '../entities/job-application.entity';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly applicationActivityRepository: ApplicationActivityRepository,
  ) {}

  @Transactional()
  async create(
    userId: string,
    request: ApplicationRequest,
  ): Promise<ApplicationResponse> {
    this.validateUrl(request.jobUrl);
    this.validateUrl(request.applicationUrl);
    const company = await this.companyRepository.findByIdAndUserId(
      request.companyId,
      userId,
    );
    if (!company) {
      throw this.notFound('Company tidak ditemukan.');
    }
    const now = new Date();
    const application = this.applicationRepository.create({
      userId,
      companyId: request.companyId,
      position: request.position.trim(),
      appliedDate: request.appliedDate,
      status: request.status ?? ApplicationStatus.WISHLIST,
      location: request.location ?? null,
      employmentType: request.employmentType ?? null,
      workArrangement: request.workArrangement ?? null,
      salaryRangeMin: this.decimalValue(request.salaryRangeMin),
      salaryRangeMax: this.decimalValue(request.salaryRangeMax),
      source: request.source ?? null,
      priority: request.priority ?? ApplicationPriority.MEDIUM,
      jobUrl: request.jobUrl ?? null,
      applicationUrl: request.applicationUrl ?? null,
      archived: false,
      jobDescription: request.jobDescription ?? null,
      archivedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.applicationRepository.save(application);
    const description = `Lamaran untuk posisi ${saved.position} di ${company.name} berhasil dibuat.`;
    await this.applicationActivityRepository.save(
      this.applicationActivityRepository.create({
        applicationId: saved.id,
        eventType: 'APPLICATION_CREATED',
        description,
        actorType: 'SYSTEM',
        previousStatus: null,
        newStatus: null,
        eventDate: now,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.toResponse(saved, company);
  }

  async list(
    userId: string,
    request: ApplicationListRequest,
  ): Promise<{
    data: ApplicationResponse[];
    meta: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const [applications, totalItems] =
      await this.applicationRepository.findAllByUserId(userId, request);
    const companyIds = applications.map((application) => application.companyId);
    const companies = await this.companyRepository.find({
      where: { id: In(companyIds) },
    });
    const applicationCompanyMap: Map<string, Company> = new Map();
    for (const application of applications) {
      const company = companies.find(
        (company) => company.id === application.companyId,
      );
      if (company) {
        applicationCompanyMap.set(application.id, company);
      }
    }
    const page = Math.max(request.page - 1, 0);
    const pageSize = Math.min(request.page_size ?? request.pageSize, 100);
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      data: applications.map((application) =>
        this.toResponse(application, applicationCompanyMap.get(application.id)),
      ),
      meta: {
        page: page + 1,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page + 1 < totalPages,
        hasPrevious: page > 0,
      },
    };
  }

  async get(userId: string, id: string): Promise<ApplicationResponse> {
    const application = await this.getApplication(userId, id);
    return this.toResponse(
      application,
      await this.requireCompany(userId, application.companyId),
    );
  }

  @Transactional()
  async update(
    userId: string,
    id: string,
    request: ApplicationPatchRequest,
  ): Promise<ApplicationResponse> {
    this.validateUrl(request.jobUrl);
    this.validateUrl(request.applicationUrl);
    const application = await this.applicationRepository.findOneBy({
      id,
      userId,
      deletedAt: IsNull(),
    });
    if (!application) {
      throw this.notFound('Application tidak ditemukan.');
    }

    const companyId = request.companyId ?? application.companyId;
    const company = await this.companyRepository.findOneBy({
      id: companyId,
      userId,
    });
    if (!company) {
      throw this.notFound('Company tidak ditemukan.');
    }

    if (request.position != null) application.position = request.position;
    if (request.appliedDate != null)
      application.appliedDate = request.appliedDate;
    if (request.priority != null) application.priority = request.priority;
    application.companyId = companyId;
    application.location = request.location ?? null;
    application.employmentType = request.employmentType ?? null;
    application.workArrangement = request.workArrangement ?? null;
    application.salaryRangeMin = this.decimalValue(request.salaryRangeMin);
    application.salaryRangeMax = this.decimalValue(request.salaryRangeMax);
    application.source = request.source ?? null;
    application.jobUrl = request.jobUrl ?? null;
    application.applicationUrl = request.applicationUrl ?? null;
    application.jobDescription = request.jobDescription ?? null;

    const saved = await this.applicationRepository.save(application);
    return this.toResponse(saved, company);
  }

  async archive(userId: string, id: string): Promise<ArchiveResponse> {
    await this.setArchived(userId, id, true);
    return { id, archived: true };
  }

  async unarchive(userId: string, id: string): Promise<ArchiveResponse> {
    await this.setArchived(userId, id, false);
    return { id, archived: false };
  }

  async delete(userId: string, id: string): Promise<void> {
    const application = await this.applicationRepository.findOneBy({
      id,
      userId,
      deletedAt: IsNull(),
    });
    if (!application) {
      throw this.notFound('Application tidak ditemukan.');
    }
    application.deletedAt = new Date();
    application.updatedAt = new Date();
    await this.applicationRepository.save(application);
  }

  @Transactional()
  async changeStatus(
    userId: string,
    id: string,
    request: StatusRequest,
  ): Promise<StatusResponse> {
    const application = await this.applicationRepository.findOneBy({
      id,
      userId,
      deletedAt: IsNull(),
    });
    if (!application) {
      throw this.notFound('Application tidak ditemukan.');
    }

    const previousStatus = application.status;
    const changedAt = new Date();
    application.status = request.status;
    application.updatedAt = changedAt;
    await this.applicationRepository.save(application);

    const description = `Status berubah dari ${this.statusLabel(previousStatus)} menjadi ${this.statusLabel(request.status)}.`;
    await this.applicationActivityRepository.save(
      this.applicationActivityRepository.create({
        applicationId: id,
        eventType: 'STATUS_CHANGED',
        description,
        actorType: 'SYSTEM',
        previousStatus,
        newStatus: request.status,
        eventDate: changedAt,
        createdAt: changedAt,
        updatedAt: changedAt,
      }),
    );

    return {
      id,
      status: request.status,
      previousStatus,
      statusChangedAt: changedAt,
    };
  }

  private async setArchived(
    userId: string,
    id: string,
    archived: boolean,
  ): Promise<void> {
    const application = await this.applicationRepository.findOneBy({
      id,
      userId,
      deletedAt: IsNull(),
    });
    if (!application) {
      throw this.notFound('Application tidak ditemukan.');
    }
    const now = new Date();
    application.archived = archived;
    application.archivedAt = archived ? now : null;
    application.updatedAt = now;
    await this.applicationRepository.save(application);
  }

  private async getApplication(
    userId: string,
    id: string,
  ): Promise<JobApplication> {
    const application = await this.applicationRepository.findOneBy({
      id,
      userId,
      deletedAt: IsNull(),
    });
    if (!application) {
      throw this.notFound('Application tidak ditemukan.');
    }
    return application;
  }

  private async requireCompany(
    userId: string,
    companyId: string,
  ): Promise<Company> {
    const company = await this.companyRepository.findOneBy({
      id: companyId,
      userId,
    });
    if (!company) {
      throw this.notFound('Company tidak ditemukan.');
    }
    return company;
  }

  private toResponse(
    application: JobApplication,
    company?: Company,
  ): ApplicationResponse {
    return {
      id: application.id,
      companyId: application.companyId,
      companyName: company?.name || null,
      position: application.position,
      appliedDate: application.appliedDate,
      status: application.status,
      location: application.location,
      employmentType: application.employmentType,
      workArrangement: application.workArrangement,
      salaryRangeMin:
        application.salaryRangeMin === null
          ? null
          : Number(application.salaryRangeMin),
      salaryRangeMax:
        application.salaryRangeMax === null
          ? null
          : Number(application.salaryRangeMax),
      source: application.source,
      jobDescription: application.jobDescription,
      priority: application.priority,
      jobUrl: application.jobUrl,
      applicationUrl: application.applicationUrl,
      archived: application.archived,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private decimalValue(value: number | null | undefined): string | null {
    return value == null ? null : String(value);
  }

  private validateUrl(value: string | null | undefined): void {
    if (!value?.trim()) return;

    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Unsupported URL protocol.');
      }
    } catch {
      throw new ApiException(
        BusinessErrorCode.VALIDATION_ERROR,
        400,
        'URL tidak valid.',
      );
    }
  }

  private statusLabel(status: ApplicationStatus): string {
    return status.replaceAll('_', ' ');
  }

  private notFound(message: string): ApiException {
    return new ApiException(BusinessErrorCode.RESOURCE_NOT_FOUND, 404, message);
  }
}
