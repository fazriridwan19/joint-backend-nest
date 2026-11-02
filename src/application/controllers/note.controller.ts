import {
  Body,
  Controller,
  Delete,
  Get,
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
import { NoteRequest } from '../application.dto';
import { NoteService } from '../services/note.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1')
@UseGuards(AuthGuard)
export class NoteController {
  constructor(private readonly notes: NoteService) {}

  @Post('applications/:applicationId/notes')
  create(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() body: NoteRequest,
  ) {
    return this.notes.create(request.user.id, applicationId, body);
  }

  @Get('applications/:applicationId/notes')
  list(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.notes.list(request.user.id, applicationId);
  }

  @Patch('notes/:id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: NoteRequest,
  ) {
    return this.notes.update(request.user.id, id, body);
  }

  @Delete('notes/:id')
  async delete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<null> {
    await this.notes.delete(request.user.id, id);
    return null;
  }
}
