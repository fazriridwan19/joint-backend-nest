import { Injectable } from '@nestjs/common';
import { CompanyResponse } from 'src/application/application.dto';
import { CompanyListRequest, CompanyRequest } from 'src/company/company.dto';
import { Company } from 'src/company/company.entity';
import { CompanyRepository } from 'src/company/company.repository';
import { ApiException } from 'src/shared/api/api-exception';
import { BusinessErrorCode } from 'src/shared/business-error-code';

@Injectable()
export class CompanyService {
  constructor(private readonly companies: CompanyRepository) {}

  async create(
    userId: string,
    request: CompanyRequest,
  ): Promise<CompanyResponse> {
    const name = request.name.trim();
    if (await this.companies.existsByUserIdAndNameIgnoreCase(userId, name)) {
      throw this.duplicate();
    }

    const now = new Date();
    const company = this.companies.create({
      userId,
      name,
      website: request.website ?? null,
      careerUrl: request.careerUrl ?? null,
      industry: request.industry ?? null,
      location: request.location ?? null,
      description: request.description ?? null,
      logoUrl: request.logoUrl ?? null,
      notes: request.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.toResponse(await this.companies.save(company));
  }

  async update(
    userId: string,
    id: string,
    request: CompanyRequest,
  ): Promise<CompanyResponse> {
    const company = await this.companies.findByIdAndUserId(id, userId);
    if (!company) {
      throw this.notFound();
    }

    const name = request.name.trim();
    if (
      await this.companies.existsByUserIdAndNameIgnoreCaseAndIdNot(
        userId,
        name,
        id,
      )
    ) {
      throw this.duplicate();
    }

    company.name = name;
    company.website = request.website ?? null;
    company.careerUrl = request.careerUrl ?? null;
    company.industry = request.industry ?? null;
    company.location = request.location ?? null;
    company.description = request.description ?? null;
    company.logoUrl = request.logoUrl ?? null;
    company.notes = request.notes ?? null;
    company.updatedAt = new Date();

    return this.toResponse(await this.companies.save(company));
  }

  async list(
    userId: string,
    request: CompanyListRequest,
  ): Promise<{
    data: CompanyResponse[];
    meta: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const page = Math.max(request.page - 1, 0);
    const pageSize = Math.min(request.page_size ?? request.pageSize, 100);
    const [companies, totalItems] = await this.companies.findAllByUserId(
      userId,
      request.q ?? '',
      page,
      pageSize,
    );
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: companies.map((company) => this.toResponse(company)),
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

  async get(userId: string, id: string): Promise<CompanyResponse> {
    const company = await this.companies.findByIdAndUserId(id, userId);
    if (!company) {
      throw this.notFound();
    }
    return this.toResponse(company);
  }

  async delete(userId: string, id: string): Promise<void> {
    const company = await this.companies.findByIdAndUserId(id, userId);
    if (!company) {
      throw this.notFound();
    }
    if (await this.companies.hasApplications(id)) {
      throw new ApiException(
        BusinessErrorCode.RESOURCE_IN_USE,
        409,
        'Company tidak dapat dihapus karena masih digunakan oleh lamaran.',
      );
    }
    await this.companies.deleteById(company.id);
  }

  private toResponse(company: Company): CompanyResponse {
    return {
      id: company.id,
      name: company.name,
      website: company.website,
      careerUrl: company.careerUrl,
      industry: company.industry,
      location: company.location,
      description: company.description,
      logoUrl: company.logoUrl,
      notes: company.notes,
      createdAt: company.createdAt,
    };
  }

  private duplicate(): ApiException {
    return new ApiException(
      BusinessErrorCode.DUPLICATE_RESOURCE,
      409,
      'Company sudah terdaftar.',
    );
  }

  private notFound(): ApiException {
    return new ApiException(
      BusinessErrorCode.RESOURCE_NOT_FOUND,
      404,
      'Company tidak ditemukan.',
    );
  }
}
