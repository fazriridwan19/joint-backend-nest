import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import { CV_MAX_FILE_SIZE } from '../cv-queue.constants';
import {
  CvAnalysisResponse,
  CvProfileDetailResponse,
  CvProfileResponse,
} from '../cv.dto';
import { CvProfileStage, CvProfileStatus } from '../cv.enums';
import { CvProfileService } from './cv-profile.service';
import { CvQueueService } from './cv-queue.service';
import { CvStorageService } from './cv-storage.service';

export interface UploadedCvFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class CvService {
  private readonly logger = new Logger(CvService.name);

  constructor(
    private readonly profiles: CvProfileService,
    private readonly storage: CvStorageService,
    private readonly queue: CvQueueService,
  ) {}

  async upload(
    user: { id: string; name: string; email: string },
    applicationId: string,
    file: UploadedCvFile | undefined,
  ): Promise<CvProfileResponse> {
    await this.profiles.requireApplicationOwner(user.id, applicationId);
    this.validateFile(file);

    const uploadedFile = file;
    const originalName = basename(
      uploadedFile.originalname.replace(/\\/g, '/'),
    );
    const safeFileName = originalName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-180);
    const fileName = safeFileName.toLowerCase().endsWith('.pdf')
      ? safeFileName
      : `${safeFileName}.pdf`;
    const filePath = `${applicationId}/${randomUUID()}-${fileName}`;

    await this.storage.upload(filePath, uploadedFile.buffer);
    let profile: CvProfileResponse;
    try {
      profile = await this.profiles.createProfile({
        applicationId,
        name: user.name,
        email: user.email,
        fileName,
        filePath,
        fileSize: uploadedFile.size,
      });
    } catch (error) {
      try {
        await this.storage.remove(filePath);
      } catch (cleanupError) {
        this.logger.error(
          `Could not remove orphaned CV object ${filePath}`,
          cleanupError instanceof Error
            ? cleanupError.stack
            : String(cleanupError),
        );
      }
      throw error;
    }

    await this.enqueueProfile(profile.id, CvProfileStage.EXTRACTION);
    return profile;
  }

  async list(
    userId: string,
    applicationId: string,
  ): Promise<CvProfileResponse[]> {
    await this.profiles.requireApplicationOwner(userId, applicationId);
    return this.profiles.list(applicationId);
  }

  async analyze(
    userId: string,
    applicationId: string,
    profileId: string,
  ): Promise<CvAnalysisResponse> {
    await this.profiles.requireOwnedProfile(userId, applicationId, profileId);
    const response = await this.profiles.requestAnalysis(
      profileId,
      applicationId,
    );
    if (
      response.stage === CvProfileStage.ANALYZE &&
      response.status === CvProfileStatus.PENDING
    ) {
      await this.enqueueProfile(profileId, CvProfileStage.ANALYZE);
    }
    return response;
  }

  async detail(
    userId: string,
    applicationId: string,
    profileId: string,
  ): Promise<CvProfileDetailResponse> {
    await this.profiles.requireOwnedProfile(userId, applicationId, profileId);
    return this.profiles.getDetail(profileId);
  }

  private validateFile(
    file: UploadedCvFile | undefined,
  ): asserts file is UploadedCvFile {
    if (!file || file.size === 0 || !file.buffer?.length) {
      throw new ApiException(
        BusinessErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        'File yang diupload tidak ditemukan.',
      );
    }
    if (file.size > CV_MAX_FILE_SIZE) {
      throw new ApiException(
        BusinessErrorCode.VALIDATION_ERROR,
        HttpStatus.PAYLOAD_TOO_LARGE,
        `Ukuran file maksimal ${CV_MAX_FILE_SIZE} byte.`,
      );
    }
    const hasPdfSignature = file.buffer
      .subarray(0, 1024)
      .includes(Buffer.from('%PDF-'));
    if (
      file.mimetype !== 'application/pdf' ||
      !file.originalname.toLowerCase().endsWith('.pdf') ||
      !hasPdfSignature
    ) {
      throw new ApiException(
        BusinessErrorCode.NOT_ACCEPTABLE,
        HttpStatus.NOT_ACCEPTABLE,
        'Format file tidak didukung, harap input format file PDF.',
      );
    }
  }

  private async enqueueProfile(
    profileId: string,
    stage: CvProfileStage,
  ): Promise<void> {
    try {
      await this.queue.enqueueProfile(profileId, stage);
    } catch (error) {
      this.logger.error(
        `CV profile ${profileId} was saved but could not be queued`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ApiException(
        BusinessErrorCode.HTTP_ERROR,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Data CV berhasil disimpan, tetapi antrean pemrosesan sedang tidak tersedia. Sistem akan mencoba kembali jika data masih pending lebih dari 30 menit.',
        [
          {
            field: 'profileId',
            issue: 'CV_QUEUE_UNAVAILABLE',
            message: profileId,
          },
        ],
      );
    }
  }
}
