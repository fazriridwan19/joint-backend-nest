import { Module, OnModuleInit } from '@nestjs/common';
import { DataSourceHolder } from '../config/transactional.config';
import { DataSource } from 'typeorm';

@Module({})
export class TransactionalModule implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    DataSourceHolder.set(this.dataSource);
  }
}
