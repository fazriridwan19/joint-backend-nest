import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { User } from '../../auth/entities/user.entity';
import {
  ApplicationListRequest,
  ApplicationPatchRequest,
  ApplicationRequest,
  StatusRequest,
} from '../application.dto';
import { ApplicationService } from '../services/application.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1/applications')
@UseGuards(AuthGuard)
export class ApplicationController {
  constructor(private readonly applications: ApplicationService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: ApplicationRequest,
  ) {
    return this.applications.create(request.user.id, body);
  }

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ApplicationListRequest,
  ) {
    const result = await this.applications.list(request.user.id, query);
    return {
      success: true,
      data: result.data,
      error: null,
      meta: result.meta,
    };
  }

  @Get(':id')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applications.get(request.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ApplicationPatchRequest,
  ) {
    return this.applications.update(request.user.id, id, body);
  }

  @Delete(':id')
  async delete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<null> {
    await this.applications.delete(request.user.id, id);
    return null;
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applications.archive(request.user.id, id);
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  unarchive(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applications.unarchive(request.user.id, id);
  }

  @Patch(':id/status')
  changeStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: StatusRequest,
  ) {
    return this.applications.changeStatus(request.user.id, id, body);
  }
}
