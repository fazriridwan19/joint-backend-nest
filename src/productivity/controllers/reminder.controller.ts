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
  ReminderListRequest,
  ReminderPatchRequest,
  ReminderRequest,
  ReminderSnoozeRequest,
} from '../productivity.dto';
import { ReminderService } from '../services/reminder.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1/reminders')
@UseGuards(AuthGuard)
export class ReminderController {
  constructor(private readonly reminders: ReminderService) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ReminderListRequest,
  ) {
    const result = await this.reminders.list(request.user.id, query);
    return {
      success: true,
      data: result.data,
      error: null,
      meta: result.meta,
    };
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: ReminderRequest) {
    return this.reminders.create(request.user.id, body);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReminderPatchRequest,
  ) {
    return this.reminders.update(request.user.id, id, body);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reminders.complete(request.user.id, id);
  }

  @Post(':id/snooze')
  @HttpCode(HttpStatus.OK)
  snooze(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReminderSnoozeRequest,
  ) {
    return this.reminders.snooze(request.user.id, id, body);
  }

  @Delete(':id')
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reminders.delete(request.user.id, id);
  }
}
