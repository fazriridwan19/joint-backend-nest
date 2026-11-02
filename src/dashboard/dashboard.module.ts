import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Company } from '../company/company.entity';
import { JobApplication } from '../application/entities/job-application.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([JobApplication, Company])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
