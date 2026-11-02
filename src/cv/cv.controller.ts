import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/entities/user.entity';
import { CV_MAX_FILE_SIZE } from './cv-queue.constants';
import { CvService, UploadedCvFile } from './services/cv.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1/applications/:id/cv')
@UseGuards(AuthGuard)
export class CvController {
  constructor(private readonly cvs: CvService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: CV_MAX_FILE_SIZE } }),
  )
  upload(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @UploadedFile() file: UploadedCvFile | undefined,
  ) {
    return this.cvs.upload(request.user, applicationId, file);
  }

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
  ) {
    return this.cvs.list(request.user.id, applicationId);
  }

  @Post(':profileId/analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  analyze(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.cvs.analyze(request.user.id, applicationId, profileId);
  }

  @Get(':profileId/detail')
  detail(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.cvs.detail(request.user.id, applicationId, profileId);
  }
}
