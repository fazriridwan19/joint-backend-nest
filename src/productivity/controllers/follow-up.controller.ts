import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { User } from '../../auth/entities/user.entity';
import {
  FollowUpCompleteRequest,
  FollowUpPatchRequest,
  FollowUpRequest,
} from '../productivity.dto';
import { FollowUpService } from '../services/follow-up.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1/applications/:applicationId/follow-ups')
@UseGuards(AuthGuard)
export class FollowUpController {
  constructor(private readonly followUps: FollowUpService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.followUps.list(request.user.id, applicationId);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() body: FollowUpRequest,
  ) {
    return this.followUps.create(request.user.id, applicationId, body);
  }

  @Patch(':followUpId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Body() body: FollowUpPatchRequest,
  ) {
    return this.followUps.update(
      request.user.id,
      applicationId,
      followUpId,
      body,
    );
  }

  @Post(':followUpId/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Body() body: FollowUpCompleteRequest,
  ) {
    return this.followUps.complete(
      request.user.id,
      applicationId,
      followUpId,
      body,
    );
  }
}
