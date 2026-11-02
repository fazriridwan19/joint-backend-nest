import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ApplicationModule } from '../application/application.module';
import { ApplicationContact } from './entities/application-contact.entity';
import { Contact } from './entities/contact.entity';
import { FollowUp } from './entities/follow-up.entity';
import { ItemCategory } from './entities/item-category.entity';
import { Reminder } from './entities/reminder.entity';
import { Roadmap } from './entities/roadmap.entity';
import { RoadmapStage } from './entities/roadmap-stage.entity';
import { StageItem } from './entities/stage-item.entity';
import { ApplicationContactRepository } from './repositories/application-contact.repository';
import { ContactRepository } from './repositories/contact.repository';
import { FollowUpRepository } from './repositories/follow-up.repository';
import { ItemCategoryRepository } from './repositories/item-category.repository';
import { ReminderRepository } from './repositories/reminder.repository';
import { RoadmapRepository } from './repositories/roadmap.repository';
import { RoadmapStageRepository } from './repositories/roadmap-stage.repository';
import { StageItemRepository } from './repositories/stage-item.repository';
import { ContactController } from './controllers/contact.controller';
import { FollowUpController } from './controllers/follow-up.controller';
import {
  ItemCategoryController,
  RoadmapController,
} from './controllers/roadmap.controller';
import { ReminderController } from './controllers/reminder.controller';
import { ReminderScheduler } from './reminder.scheduler';
import { ItemCategorySeeder } from './item-category.seeder';
import { ProductivityAccess } from './productivity-access.service';
import { ContactService } from './services/contact.service';
import { FollowUpService } from './services/follow-up.service';
import { ReminderService } from './services/reminder.service';
import { RoadmapService } from './services/roadmap.service';
import { StageItemService } from './services/stage-item.service';

@Module({
  imports: [
    AuthModule,
    ApplicationModule,
    TypeOrmModule.forFeature([
      Contact,
      ApplicationContact,
      FollowUp,
      Reminder,
      Roadmap,
      RoadmapStage,
      ItemCategory,
      StageItem,
    ]),
  ],
  controllers: [
    ContactController,
    FollowUpController,
    ReminderController,
    RoadmapController,
    ItemCategoryController,
  ],
  providers: [
    ProductivityAccess,
    ContactService,
    FollowUpService,
    ReminderService,
    RoadmapService,
    StageItemService,
    ReminderScheduler,
    ItemCategorySeeder,
    ApplicationContactRepository,
    ContactRepository,
    FollowUpRepository,
    ItemCategoryRepository,
    ReminderRepository,
    RoadmapRepository,
    RoadmapStageRepository,
    StageItemRepository,
  ],
})
export class ProductivityModule {}
