import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { CompanyController } from 'src/company/company.controller';
import { Company } from 'src/company/company.entity';
import { CompanyRepository } from 'src/company/company.repository';
import { CompanyService } from 'src/company/company.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Company])],
  controllers: [CompanyController],
  providers: [CompanyService, CompanyRepository],
  exports: [CompanyRepository],
})
export class CompanyModule {}
