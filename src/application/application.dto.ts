import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ApplicationPriority,
  ApplicationSource,
  ApplicationStatus,
  EmploymentType,
  WorkArrangement,
} from './application.enums';

export class ApplicationListRequest {
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

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  archived = false;
}

export class ApplicationRequest {
  @IsUUID()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  position!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  appliedDate!: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType | null;

  @IsOptional()
  @IsEnum(WorkArrangement)
  workArrangement?: WorkArrangement | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryRangeMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryRangeMax?: number | null;

  @IsOptional()
  @IsEnum(ApplicationSource)
  source?: ApplicationSource | null;

  @IsOptional()
  @IsEnum(ApplicationPriority)
  priority?: ApplicationPriority;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  jobUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  applicationUrl?: string | null;

  @IsOptional()
  @IsString()
  jobDescription?: string | null;
}

export class ApplicationPatchRequest {
  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  appliedDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType | null;

  @IsOptional()
  @IsEnum(WorkArrangement)
  workArrangement?: WorkArrangement | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryRangeMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryRangeMax?: number | null;

  @IsOptional()
  @IsEnum(ApplicationSource)
  source?: ApplicationSource | null;

  @IsOptional()
  @IsEnum(ApplicationPriority)
  priority?: ApplicationPriority | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  jobUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  applicationUrl?: string | null;

  @IsOptional()
  @IsString()
  jobDescription?: string | null;
}

export class StatusRequest {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class NoteRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  content!: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean | null;
}

export class TimelineCreateRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  eventType!: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export interface CompanyResponse {
  id: string;
  name: string;
  website: string | null;
  careerUrl: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
  logoUrl: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface ApplicationResponse {
  id: string;
  companyId: string;
  companyName: string | null;
  position: string;
  appliedDate: string;
  status: ApplicationStatus;
  location: string | null;
  employmentType: EmploymentType | null;
  workArrangement: WorkArrangement | null;
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
  source: ApplicationSource | null;
  jobDescription: string | null;
  priority: ApplicationPriority;
  jobUrl: string | null;
  applicationUrl: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusResponse {
  id: string;
  status: ApplicationStatus;
  previousStatus: ApplicationStatus;
  statusChangedAt: Date;
}

export interface ArchiveResponse {
  id: string;
  archived: boolean;
}

export interface NoteResponse {
  id: string;
  content: string;
  pinned: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineResponse {
  id: string;
  eventType: string;
  description: string | null;
  actorType: string;
  previousStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus | null;
  eventDate: Date;
}
