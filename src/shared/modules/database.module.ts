import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationActivity } from 'src/application/entities/application-activity.entity';
import { JobApplication } from 'src/application/entities/job-application.entity';
import { Note } from 'src/application/entities/note.entity';
import { User } from 'src/auth/entities/user.entity';
import { Company } from 'src/company/company.entity';
import { ApplicationContact } from 'src/productivity/entities/application-contact.entity';
import { Contact } from 'src/productivity/entities/contact.entity';
import { FollowUp } from 'src/productivity/entities/follow-up.entity';
import { ItemCategory } from 'src/productivity/entities/item-category.entity';
import { Reminder } from 'src/productivity/entities/reminder.entity';
import { Roadmap } from 'src/productivity/entities/roadmap.entity';
import { RoadmapStage } from 'src/productivity/entities/roadmap-stage.entity';
import { StageItem } from 'src/productivity/entities/stage-item.entity';
import { CandidateCvEducation } from '../../cv/entities/candidate-cv-education.entity';
import { CandidateCvExperience } from '../../cv/entities/candidate-cv-experience.entity';
import { CandidateCvProfile } from '../../cv/entities/candidate-cv-profile.entity';
import { CandidateCvProject } from '../../cv/entities/candidate-cv-project.entity';
import { CandidateCvSkill } from '../../cv/entities/candidate-cv-skill.entity';
import { ExperienceItem } from '../../cv/entities/experience-item.entity';
import { ProjectItem } from '../../cv/entities/project-item.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const password = config.get<string>('POSTGRES_PASSWORD');
        if (typeof password !== 'string' || password.length === 0) {
          throw new Error(
            'POSTGRES_PASSWORD must be set to a non-empty string.',
          );
        }

        return {
          type: 'postgres' as const,
          host: config.get<string>('POSTGRES_HOST', 'localhost'),
          port: Number(config.get<string>('POSTGRES_PORT', '5432')),
          database: config.get<string>('POSTGRES_DATABASE', 'joint_app'),
          username: config.get<string>('POSTGRES_USERNAME', 'joint'),
          password,
          schema: 'j_application',
          entities: [
            User,
            Company,
            JobApplication,
            Note,
            ApplicationActivity,
            Contact,
            ApplicationContact,
            FollowUp,
            Reminder,
            Roadmap,
            RoadmapStage,
            ItemCategory,
            StageItem,
            CandidateCvProfile,
            CandidateCvExperience,
            CandidateCvEducation,
            CandidateCvProject,
            CandidateCvSkill,
            ExperienceItem,
            ProjectItem,
          ],
          synchronize: false,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
