import { Injectable } from '@nestjs/common';
import { ApiException } from '../shared/api/api-exception';
import { BusinessErrorCode } from '../shared/business-error-code';
import { ApplicationRepository } from '../application/repositories/application.repository';
import { IsNull } from 'typeorm';

@Injectable()
export class ProductivityAccess {
  constructor(private readonly applications: ApplicationRepository) {}

  async requireOwner(userId: string, applicationId: string): Promise<void> {
    const application = await this.applications.findOneBy({
      id: applicationId,
      userId,
      deletedAt: IsNull(),
    });
    if (!application) {
      throw new ApiException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        404,
        'Application tidak ditemukan.',
      );
    }
  }
}
