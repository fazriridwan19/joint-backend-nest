import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationModule } from '../application/application.module';
import { AuthModule } from '../auth/auth.module';
import { CV_QUEUE_NAME } from './cv-queue.constants';
import { CvController } from './cv.controller';
import { CvQueueProcessor } from './cv.processor';
import { CvScheduler } from './cv.scheduler';
import { CandidateCvEducation } from './entities/candidate-cv-education.entity';
import { CandidateCvExperience } from './entities/candidate-cv-experience.entity';
import { CandidateCvProfile } from './entities/candidate-cv-profile.entity';
import { CandidateCvProject } from './entities/candidate-cv-project.entity';
import { CandidateCvSkill } from './entities/candidate-cv-skill.entity';
import { ExperienceItem } from './entities/experience-item.entity';
import { ProjectItem } from './entities/project-item.entity';
import { CvEducationRepository } from './repositories/cv-education.repository';
import { CvExperienceItemRepository } from './repositories/cv-experience-item.repository';
import { CvExperienceRepository } from './repositories/cv-experience.repository';
import { CvProfileRepository } from './repositories/cv-profile.repository';
import {
  CvProjectItemRepository,
  CvProjectRepository,
} from './repositories/cv-project.repository';
import { CvSkillRepository } from './repositories/cv-skill.repository';
import { CvLlmService } from './services/cv-llm.service';
import { CvPdfService } from './services/cv-pdf.service';
import { CvProfileService } from './services/cv-profile.service';
import { CvQueueService } from './services/cv-queue.service';
import { CvStorageService } from './services/cv-storage.service';
import { CvService } from './services/cv.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    ApplicationModule,
    TypeOrmModule.forFeature([
      CandidateCvProfile,
      CandidateCvExperience,
      CandidateCvEducation,
      CandidateCvProject,
      CandidateCvSkill,
      ExperienceItem,
      ProjectItem,
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({ name: CV_QUEUE_NAME }),
  ],
  controllers: [CvController],
  providers: [
    CvService,
    CvProfileService,
    CvStorageService,
    CvQueueService,
    CvPdfService,
    CvLlmService,
    CvScheduler,
    CvQueueProcessor,
    CvProfileRepository,
    CvExperienceRepository,
    CvExperienceItemRepository,
    CvEducationRepository,
    CvProjectRepository,
    CvProjectItemRepository,
    CvSkillRepository,
  ],
})
export class CvModule {}
