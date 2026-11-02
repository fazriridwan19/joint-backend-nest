import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseSchemaInitializer implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.createSchema('j_application', true);
    } finally {
      await queryRunner.release();
    }

    const explicitSetting = this.config.get<string>('TYPEORM_SYNCHRONIZE');
    const ddlMode = this.config.get<string>('JPA_DDL_AUTO', 'update');
    const shouldSynchronize =
      explicitSetting === undefined
        ? !['none', 'validate'].includes(ddlMode)
        : explicitSetting === 'true';
    if (shouldSynchronize) {
      await this.dataSource.synchronize();
    }
  }
}
