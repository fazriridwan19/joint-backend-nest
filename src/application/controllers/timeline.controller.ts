import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { User } from '../../auth/entities/user.entity';
import { TimelineCreateRequest } from '../application.dto';
import { TimelineService } from '../services/timeline.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1/applications/:applicationId/timeline')
@UseGuards(AuthGuard)
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.timeline.list(request.user.id, applicationId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  create(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() body: TimelineCreateRequest,
  ) {
    return this.timeline.create(request.user.id, applicationId, body);
  }
}
