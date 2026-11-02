import { CvProfileStage, CvProfileStatus } from './cv.enums';

export interface CvProfileResponse {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  fileName: string;
  summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  status: CvProfileStatus;
  stage: CvProfileStage;
}

export interface CvExperienceResponse {
  id: string;
  profileId: string;
  company: string | null;
  position: string | null;
  startDate: string | null;
  endDate: string | null;
  responsibilities: string[];
  technologiesUsed: string[];
}

export interface CvProjectResponse {
  id: string;
  profileId: string;
  name: string;
  description: string | null;
  role: string;
  technologiesUsed: string[];
}

export interface CvSkillResponse {
  technicalSkills: string[];
  softSkills: string[];
  tools: string[];
}

export interface CvEducationResponse {
  id: string;
  profileId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string | null;
  endDate: string | null;
  gpa: string | null;
}

export interface CvProfileDetailResponse extends CvProfileResponse {
  experiences: CvExperienceResponse[];
  projects: CvProjectResponse[];
  skills: CvSkillResponse[];
  educations: CvEducationResponse[];
}

export interface CvAnalysisResponse {
  profileId: string;
  stage: CvProfileStage;
  status: CvProfileStatus;
  summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
}

export interface CvExtractionResult {
  experiences: CvExtractedExperience[];
  educations: CvExtractedEducation[];
  projects: CvExtractedProject[];
  skills: CvExtractedSkills;
}

export interface CvExtractedExperience {
  company: string | null;
  position: string | null;
  startDate: string | null;
  endDate: string | null;
  responsibilities: string[];
  technologiesUsed: string[];
}

export interface CvExtractedEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string | null;
  endDate: string | null;
  gpa: string | null;
}

export interface CvExtractedProject {
  name: string;
  description: string | null;
  technologiesUsed: string[];
  role: string;
}

export interface CvExtractedSkills {
  technicalSkills: string[];
  softSkills: string[];
  tools: string[];
}

export interface CvExtractionInput {
  cvText: string;
}

export interface CvAnalysisCandidateProfile {
  experiences: Array<
    Pick<
      CvExperienceResponse,
      | 'company'
      | 'position'
      | 'startDate'
      | 'endDate'
      | 'responsibilities'
      | 'technologiesUsed'
    >
  >;
  educations: Array<
    Pick<
      CvEducationResponse,
      | 'institution'
      | 'degree'
      | 'fieldOfStudy'
      | 'startDate'
      | 'endDate'
      | 'gpa'
    >
  >;
  projects: Array<
    Pick<
      CvProjectResponse,
      'name' | 'description' | 'role' | 'technologiesUsed'
    >
  >;
  skills: CvSkillResponse;
}

export interface CvAnalysisInput {
  jobDescription: string;
  candidateProfile: CvAnalysisCandidateProfile;
}

export interface CvAnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
}
