import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/entities/user.entity';
import { DashboardService } from './dashboard.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1/dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@Req() request: AuthenticatedRequest) {
    return this.dashboard.summary(request.user.id);
  }

  @Get('funnel')
  funnel(@Req() request: AuthenticatedRequest) {
    return this.dashboard.funnel(request.user.id);
  }

  @Get('upcoming')
  upcoming(@Req() request: AuthenticatedRequest) {
    return this.dashboard.upcoming(request.user.id);
  }
}
