import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/entities/user.entity';
import { CompanyListRequest, CompanyRequest } from './company.dto';
import { CompanyService } from './company.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1/companies')
@UseGuards(AuthGuard)
export class CompanyController {
  constructor(private readonly companies: CompanyService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CompanyRequest) {
    return this.companies.create(request.user.id, body);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CompanyRequest,
  ) {
    return this.companies.update(request.user.id, id, body);
  }

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: CompanyListRequest,
  ) {
    const result = await this.companies.list(request.user.id, query);
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
    return this.companies.get(request.user.id, id);
  }

  @Delete(':id')
  async delete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<null> {
    await this.companies.delete(request.user.id, id);
    return null;
  }
}
