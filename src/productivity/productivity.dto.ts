import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export enum FollowUpChannel {
  EMAIL = 'EMAIL',
  LINKEDIN = 'LINKEDIN',
  WHATSAPP = 'WHATSAPP',
  PHONE = 'PHONE',
  OTHER = 'OTHER',
}

export enum FollowUpStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ReminderType {
  INTERVIEW = 'INTERVIEW',
  ASSESSMENT_DEADLINE = 'ASSESSMENT_DEADLINE',
  FOLLOW_UP = 'FOLLOW_UP',
  APPLICATION_DEADLINE = 'APPLICATION_DEADLINE',
  RECRUITMENT_STAGE = 'RECRUITMENT_STAGE',
  CUSTOM = 'CUSTOM',
  NO_UPDATE = 'NO_UPDATE',
}

export enum RoadmapStageStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum ItemCategoryGroup {
  INTERVIEW = 'INTERVIEW',
  TASK = 'TASK',
  PREPARATION = 'PREPARATION',
}

export enum StageItemStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum StageItemPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class DeleteResponse {
  id!: string;
  deleted!: boolean;
}

export class ContactRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  role?: string | null;

  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedinUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ContactListRequest {
  @IsOptional()
  @IsString()
  q?: string;
}

export interface ContactResponse {
  id: string;
  name: string;
  role: string | null;
  companyId: string | null;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
}

export class FollowUpRequest {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  followUpDate!: string;

  @IsEnum(FollowUpChannel)
  channel!: FollowUpChannel;

  @IsOptional()
  @IsUUID()
  contactId?: string | null;

  @IsOptional()
  @IsString()
  message?: string | null;
}

export class FollowUpPatchRequest {
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  followUpDate?: string | null;

  @IsOptional()
  @IsEnum(FollowUpChannel)
  channel?: FollowUpChannel | null;

  @IsOptional()
  @IsUUID()
  contactId?: string | null;

  @IsOptional()
  @IsString()
  message?: string | null;

  @IsOptional()
  @IsString()
  result?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nextFollowUpDate?: string | null;
}

export class FollowUpCompleteRequest {
  @IsOptional()
  @IsString()
  result?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nextFollowUpDate?: string | null;
}

export interface FollowUpResponse {
  id: string;
  applicationId: string;
  contactId: string | null;
  followUpDate: string;
  channel: FollowUpChannel;
  message: string | null;
  result: string | null;
  nextFollowUpDate: string | null;
  status: FollowUpStatus;
  createdAt: Date;
}

export class ReminderRequest {
  @IsEnum(ReminderType)
  type!: ReminderType;

  @IsDateString()
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  dueAt!: string;

  @IsOptional()
  @IsUUID()
  applicationId?: string | null;

  @IsOptional()
  @IsString()
  message?: string | null;
}

export class ReminderPatchRequest {
  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType | null;

  @IsOptional()
  @IsDateString()
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  dueAt?: string | null;

  @IsOptional()
  @IsString()
  message?: string | null;
}

export class ReminderSnoozeRequest {
  @IsDateString()
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  snoozedUntil!: string;
}

export class ReminderListRequest {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  pending = true;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page_size?: number;
}

export interface ReminderResponse {
  id: string;
  applicationId: string | null;
  type: ReminderType;
  message: string | null;
  dueAt: Date;
  completed: boolean;
  snoozedUntil: Date | null;
  createdAt: Date;
}

export class StageRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stageOrder?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class StagePatchRequest {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stageOrder?: number | null;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export interface RoadmapStageResponse {
  id: string;
  name: string;
  description: string | null;
  stageOrder: number;
  status: RoadmapStageStatus;
  scheduledDate: string | null;
  completedDate: string | null;
  notes: string | null;
}

export interface RoadmapResponse {
  id: string;
  jobApplicationId: string;
  isCustom: boolean;
  progressPercentage: number;
  stages: RoadmapStageResponse[];
}

export interface ItemCategoryResponse {
  id: string;
  code: string;
  label: string;
  group: ItemCategoryGroup;
  icon: string | null;
  sortOrder: number;
}

export class StageItemRequest {
  @IsUUID()
  roadmapStageId!: string;

  @IsUUID('loose')
  categoryId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string | null;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledAt!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  endTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  assignee?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @IsEnum(StageItemPriority)
  priority!: StageItemPriority;
}

export class PatchStageItemRequest {
  @IsOptional()
  @IsUUID()
  roadmapStageId?: string | null;

  @IsOptional()
  @IsUUID('loose')
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string | null;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledAt?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  startTime?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  endTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  assignee?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @IsOptional()
  @IsEnum(StageItemPriority)
  priority?: StageItemPriority | null;

  @IsOptional()
  @IsEnum(StageItemStatus)
  status?: StageItemStatus | null;
}

export class StageItemListRequest {
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsString()
  categoryCode?: string;

  @IsOptional()
  @IsEnum(ItemCategoryGroup)
  categoryGroup?: ItemCategoryGroup;

  @IsOptional()
  @IsEnum(StageItemStatus)
  status?: StageItemStatus;
}

export interface StageItemResponse {
  id: string;
  roadmapStageId: string;
  jobApplicationId: string;
  userId: string;
  categoryId: string;
  categoryCode: string;
  categoryLabel: string;
  categoryGroup: ItemCategoryGroup;
  title: string;
  content: string | null;
  scheduledAt: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  url: string | null;
  assignee: string | null;
  location: string | null;
  priority: StageItemPriority | null;
  status: StageItemStatus;
}
