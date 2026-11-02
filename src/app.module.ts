import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/shared/modules/database.module';
import { TransactionalModule } from 'src/shared/modules/transactional.module';
import { ApplicationModule } from './application/application.module';
import { AuthModule } from './auth/auth.module';
import { ProductivityModule } from './productivity/productivity.module';
import { CvModule } from './cv/cv.module';
import { DatabaseSchemaInitializer } from './shared/database-schema.initializer';
import { ScheduleModule } from '@nestjs/schedule';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    TransactionalModule,
    AuthModule,
    ApplicationModule,
    DashboardModule,
    ScheduleModule.forRoot(),
    ProductivityModule,
    CvModule,
  ],
  controllers: [],
  providers: [DatabaseSchemaInitializer],
})
export class AppModule {}
