import { ApplicationStatus } from '../application/application.enums';

export interface DashboardSummary {
  totalApplications: number;
  activeApplications: number;
  interviews: number;
  assessments: number;
  offers: number;
  hired: number;
  rejected: number;
  ghosted: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  rate: number;
}

export interface DashboardFunnel {
  totalApplied: number;
  stages: FunnelStage[];
}

export interface UpcomingApplication {
  id: string;
  companyName: string;
  position: string;
  status: ApplicationStatus;
  appliedDate: string;
  updatedAt: Date;
}

export interface DashboardUpcoming {
  items: UpcomingApplication[];
}
