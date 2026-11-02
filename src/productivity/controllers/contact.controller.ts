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
import { ContactRequest } from '../productivity.dto';
import { ContactService } from '../services/contact.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1')
@UseGuards(AuthGuard)
export class ContactController {
  constructor(private readonly contacts: ContactService) {}

  @Get('contacts')
  list(@Req() request: AuthenticatedRequest, @Query('q') query?: string) {
    return this.contacts.list(request.user.id, query);
  }

  @Get('contacts/:id')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.get(request.user.id, id);
  }

  @Post('contacts')
  create(@Req() request: AuthenticatedRequest, @Body() body: ContactRequest) {
    return this.contacts.create(request.user.id, body);
  }

  @Patch('contacts/:id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ContactRequest,
  ) {
    return this.contacts.update(request.user.id, id, body);
  }

  @Delete('contacts/:id')
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.delete(request.user.id, id);
  }

  @Get('applications/:applicationId/contacts')
  listForApplication(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.contacts.listForApplication(request.user.id, applicationId);
  }

  @Post('applications/:applicationId/contacts')
  @HttpCode(HttpStatus.OK)
  async associate(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Query('contactId', ParseUUIDPipe) contactId: string,
  ): Promise<null> {
    await this.contacts.associate(request.user.id, applicationId, contactId);
    return null;
  }
}
