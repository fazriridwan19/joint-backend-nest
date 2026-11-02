import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationActivityRepository } from 'src/application/repositories/application-activity.repository';
import { ApplicationRepository } from 'src/application/repositories/application.repository';
import { CompanyModule } from 'src/company/company.module';
import { AuthModule } from '../auth/auth.module';
import { ApplicationController } from './controllers/application.controller';
import { NoteController } from './controllers/note.controller';
import { TimelineController } from './controllers/timeline.controller';
import { ApplicationActivity } from './entities/application-activity.entity';
import { JobApplication } from './entities/job-application.entity';
import { Note } from './entities/note.entity';
import { ApplicationService } from './services/application.service';
import { NoteService } from './services/note.service';
import { TimelineService } from './services/timeline.service';

@Module({
  imports: [
    AuthModule,
    CompanyModule,
    TypeOrmModule.forFeature([JobApplication, Note, ApplicationActivity]),
  ],
  controllers: [ApplicationController, NoteController, TimelineController],
  providers: [
    ApplicationService,
    NoteService,
    TimelineService,
    ApplicationRepository,
    ApplicationActivityRepository,
  ],
  exports: [ApplicationRepository, ApplicationActivityRepository],
})
export class ApplicationModule {}
