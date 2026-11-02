import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApplicationRepository } from '../../application/repositories/application.repository';
import { ApiException } from '../../shared/api/api-exception';
import { Transactional } from '../../shared/config/transactional.config';
import { BusinessErrorCode } from '../../shared/business-error-code';
import {
  CvAnalysisInput,
  CvAnalysisResponse,
  CvAnalysisResult,
  CvEducationResponse,
  CvExperienceResponse,
  CvExtractionResult,
  CvProfileDetailResponse,
  CvProfileResponse,
  CvProjectResponse,
  CvSkillResponse,
} from '../cv.dto';
import {
  CvItemType,
  CvProfileStage,
  CvProfileStatus,
  CvSkillType,
} from '../cv.enums';
import { CvEducationRepository } from '../repositories/cv-education.repository';
import { CvExperienceItemRepository } from '../repositories/cv-experience-item.repository';
import { CvExperienceRepository } from '../repositories/cv-experience.repository';
import { CvProfileRepository } from '../repositories/cv-profile.repository';
import {
  CvProjectItemRepository,
  CvProjectRepository,
} from '../repositories/cv-project.repository';
import { CvSkillRepository } from '../repositories/cv-skill.repository';

const MAX_RETRY_COUNT = 5;

@Injectable()
export class CvProfileService {
  constructor(
    private readonly profiles: CvProfileRepository,
    private readonly applications: ApplicationRepository,
    private readonly experiences: CvExperienceRepository,
    private readonly experienceItems: CvExperienceItemRepository,
    private readonly educations: CvEducationRepository,
    private readonly projects: CvProjectRepository,
    private readonly projectItems: CvProjectItemRepository,
    private readonly skills: CvSkillRepository,
  ) {}

  async requireApplicationOwner(
    userId: string,
    applicationId: string,
  ): Promise<void> {
    const application = await this.applications.findByIdAndUserId(
      applicationId,
      userId,
    );
    if (!application) throw this.notFound('Lamaran tidak ditemukan.');
  }

  async requireOwnedProfile(
    userId: string,
    applicationId: string,
    profileId: string,
  ) {
    const application = await this.applications.findByIdAndUserId(
      applicationId,
      userId,
    );
    const profile = await this.profiles.findByIdAndApplicationId(
      profileId,
      applicationId,
    );
    if (!application || !profile)
      throw this.notFound('Profile CV tidak ditemukan.');
    return profile;
  }

  @Transactional()
  async createProfile(input: {
    applicationId: string;
    name: string;
    email: string;
    fileName: string;
    filePath: string;
    fileSize: number;
  }): Promise<CvProfileResponse> {
    const now = new Date();
    const profile = await this.profiles.save(
      this.profiles.create({
        ...input,
        fileType: 'application/pdf',
        fileSize: String(input.fileSize),
        status: CvProfileStatus.PENDING,
        stage: CvProfileStage.EXTRACTION,
        retryCount: 0,
        summary: null,
        strengths: null,
        weaknesses: null,
        improvementSuggestions: null,
        lastError: null,
        processingStartedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.toProfileResponse(profile);
  }

  async list(applicationId: string): Promise<CvProfileResponse[]> {
    const profiles = await this.profiles.findAllByApplicationId(applicationId);
    return profiles.map((profile) => this.toProfileResponse(profile));
  }

  async getDetail(profileId: string): Promise<CvProfileDetailResponse> {
    const profile = await this.profiles.findById(profileId);
    if (!profile) throw this.notFound('Profile CV tidak ditemukan.');

    const [experiences, educations, projects, skills] = await Promise.all([
      this.experiences.findByProfileId(profileId),
      this.educations.findByProfileId(profileId),
      this.projects.findByProfileId(profileId),
      this.skills.findByProfileId(profileId),
    ]);
    const [experienceItems, projectItems] = await Promise.all([
      this.experienceItems.findByExperienceIds(
        experiences.map((experience) => experience.id),
      ),
      this.projectItems.findByProjectIds(projects.map((project) => project.id)),
    ]);
    const experienceResponses: CvExperienceResponse[] = experiences.map(
      (experience) => {
        const items = experienceItems.filter(
          (item) => item.candidateExperienceId === experience.id,
        );
        return {
          id: experience.id,
          profileId,
          company: experience.company,
          position: experience.position,
          startDate: experience.startDate,
          endDate: experience.endDate,
          responsibilities: items
            .filter((item) => item.type === CvItemType.RESPONSIBILITY)
            .map((item) => item.value),
          technologiesUsed: items
            .filter((item) => item.type === CvItemType.TECHNOLOGY)
            .map((item) => item.value),
        };
      },
    );
    const projectResponses: CvProjectResponse[] = projects.map((project) => ({
      id: project.id,
      profileId,
      name: project.name,
      description: project.description,
      role: project.role,
      technologiesUsed: projectItems
        .filter(
          (item) =>
            item.candidateProjectId === project.id &&
            item.type === CvItemType.TECHNOLOGY,
        )
        .map((item) => item.value),
    }));
    const educationResponses: CvEducationResponse[] = educations.map(
      (education) => ({
        id: education.id,
        profileId,
        institution: education.institution,
        degree: education.degree,
        fieldOfStudy: education.fieldOfStudy,
        startDate: education.startDate,
        endDate: education.endDate,
        gpa: education.gpa,
      }),
    );
    const skillResponse: CvSkillResponse = {
      technicalSkills: skills
        .filter((skill) => skill.type === CvSkillType.TECHNICAL)
        .map((skill) => skill.value),
      softSkills: skills
        .filter((skill) => skill.type === CvSkillType.SOFT)
        .map((skill) => skill.value),
      tools: skills
        .filter((skill) => skill.type === CvSkillType.TOOL)
        .map((skill) => skill.value),
    };

    return {
      ...this.toProfileResponse(profile),
      experiences: experienceResponses,
      projects: projectResponses,
      skills: [skillResponse],
      educations: educationResponses,
    };
  }

  @Transactional()
  async requestAnalysis(
    profileId: string,
    applicationId: string,
  ): Promise<CvAnalysisResponse> {
    const profile = await this.profiles.findByIdAndApplicationId(
      profileId,
      applicationId,
    );
    if (!profile) throw this.notFound('Profile CV tidak ditemukan.');
    if (profile.stage === CvProfileStage.ANALYZE) {
      return this.toAnalysisResponse(profile);
    }
    if (profile.status !== CvProfileStatus.COMPLETED) {
      throw new ApiException(
        BusinessErrorCode.VALIDATION_ERROR,
        400,
        'Profile belum selesai diproses, harap tunggu hingga proses ekstraksi selesai.',
      );
    }

    profile.stage = CvProfileStage.ANALYZE;
    profile.status = CvProfileStatus.PENDING;
    profile.retryCount = 0;
    profile.lastError = null;
    profile.processingStartedAt = null;
    return this.toAnalysisResponse(await this.profiles.save(profile));
  }

  findStalePending(stage: CvProfileStage, olderThan: Date, batchSize: number) {
    return this.profiles.findStalePending(
      stage,
      MAX_RETRY_COUNT,
      batchSize,
      olderThan,
    );
  }

  @Transactional()
  claimForProcessing(
    profileId: string,
    stage: CvProfileStage,
  ): Promise<boolean> {
    return this.profiles.claimForProcessing(profileId, stage);
  }

  async findForProcessing(profileId: string) {
    const profile = await this.profiles.findById(profileId);
    if (!profile) throw this.notFound('Profile CV tidak ditemukan.');
    return profile;
  }

  @Transactional()
  async saveExtraction(
    profileId: string,
    extraction: CvExtractionResult,
  ): Promise<void> {
    const profile = await this.profiles.findById(profileId);
    if (!profile) throw this.notFound('Profile CV tidak ditemukan.');

    const experienceRows = extraction.experiences.map((experience) =>
      this.experiences.create({
        id: randomUUID(),
        profileId,
        company: experience.company,
        position: experience.position,
        startDate: experience.startDate,
        endDate: experience.endDate,
      }),
    );
    if (experienceRows.length) await this.experiences.save(experienceRows);

    const experienceItemRows = extraction.experiences.flatMap(
      (experience, index) => [
        ...experience.responsibilities.map((value) =>
          this.experienceItems.create({
            candidateExperienceId: experienceRows[index].id,
            type: CvItemType.RESPONSIBILITY,
            value,
          }),
        ),
        ...experience.technologiesUsed.map((value) =>
          this.experienceItems.create({
            candidateExperienceId: experienceRows[index].id,
            type: CvItemType.TECHNOLOGY,
            value,
          }),
        ),
      ],
    );
    if (experienceItemRows.length) {
      await this.experienceItems.save(experienceItemRows);
    }

    const educationRows = extraction.educations.map((education) =>
      this.educations.create({
        id: randomUUID(),
        profileId,
        ...education,
      }),
    );
    if (educationRows.length) await this.educations.save(educationRows);

    const projectRows = extraction.projects.map((project) =>
      this.projects.create({
        id: randomUUID(),
        profileId,
        name: project.name,
        description: project.description,
        role: project.role,
      }),
    );
    if (projectRows.length) await this.projects.save(projectRows);

    const projectItemRows = extraction.projects.flatMap((project, index) =>
      project.technologiesUsed.map((value) =>
        this.projectItems.create({
          candidateProjectId: projectRows[index].id,
          type: CvItemType.TECHNOLOGY,
          value,
        }),
      ),
    );
    if (projectItemRows.length) await this.projectItems.save(projectItemRows);

    const skillRows = [
      ...extraction.skills.technicalSkills.map((value) =>
        this.skills.create({
          profileId,
          type: CvSkillType.TECHNICAL,
          value,
        }),
      ),
      ...extraction.skills.softSkills.map((value) =>
        this.skills.create({ profileId, type: CvSkillType.SOFT, value }),
      ),
      ...extraction.skills.tools.map((value) =>
        this.skills.create({ profileId, type: CvSkillType.TOOL, value }),
      ),
    ];
    if (skillRows.length) await this.skills.save(skillRows);

    profile.status = CvProfileStatus.COMPLETED;
    profile.lastError = null;
    profile.processingStartedAt = null;
    await this.profiles.save(profile);
  }

  async getAnalysisInput(profileId: string): Promise<CvAnalysisInput> {
    const profile = await this.profiles.findById(profileId);
    if (!profile) throw this.notFound('Profile CV tidak ditemukan.');
    const application = await this.applications.findOneBy({
      id: profile.applicationId,
    });
    if (!application) throw this.notFound('Lamaran tidak ditemukan.');
    const detail = await this.getDetail(profileId);
    if (!application.jobDescription?.trim()) {
      return {
        jobDescription: '',
        candidateProfile: {
          educations: [],
          experiences: [],
          projects: [],
          skills: { technicalSkills: [], softSkills: [], tools: [] },
        },
      };
    }

    return {
      jobDescription: application.jobDescription,
      candidateProfile: {
        educations: detail.educations.map(
          ({ institution, degree, fieldOfStudy, startDate, endDate, gpa }) => ({
            institution,
            degree,
            fieldOfStudy,
            startDate,
            endDate,
            gpa,
          }),
        ),
        experiences: detail.experiences.map(
          ({
            company,
            position,
            startDate,
            endDate,
            responsibilities,
            technologiesUsed,
          }) => ({
            company,
            position,
            startDate,
            endDate,
            responsibilities,
            technologiesUsed,
          }),
        ),
        projects: detail.projects.map(
          ({ name, description, role, technologiesUsed }) => ({
            name,
            description,
            role,
            technologiesUsed,
          }),
        ),
        skills: detail.skills[0],
      },
    };
  }

  @Transactional()
  async saveAnalysis(
    profileId: string,
    analysis: CvAnalysisResult,
  ): Promise<CvAnalysisResponse> {
    const profile = await this.profiles.findById(profileId);
    if (!profile) throw this.notFound('Profile CV tidak ditemukan.');
    profile.status = CvProfileStatus.COMPLETED;
    profile.lastError = null;
    profile.processingStartedAt = null;
    profile.summary = analysis.summary;
    profile.strengths = analysis.strengths;
    profile.weaknesses = analysis.weaknesses;
    await this.profiles.save(profile);
    return this.toAnalysisResponse(profile);
  }

  @Transactional()
  async recordFailedAttempt(
    profileId: string,
    error: unknown,
    maxAttempts: number,
  ): Promise<void> {
    const profile = await this.profiles.findById(profileId);
    if (!profile) throw this.notFound('Profile CV tidak ditemukan.');
    const retryCount = profile.retryCount + 1;
    const lastError = error instanceof Error ? error.message : String(error);
    const exhausted = retryCount >= maxAttempts;
    await this.profiles.updateFailure(
      profileId,
      retryCount,
      lastError,
      exhausted,
    );
  }

  private toProfileResponse(profile: {
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
  }): CvProfileResponse {
    return {
      id: profile.id,
      applicationId: profile.applicationId,
      name: profile.name,
      email: profile.email,
      fileName: profile.fileName,
      summary: profile.summary,
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      status: profile.status,
      stage: profile.stage,
    };
  }

  private toAnalysisResponse(profile: {
    id: string;
    stage: CvProfileStage;
    status: CvProfileStatus;
    summary: string | null;
    strengths: string[] | null;
    weaknesses: string[] | null;
  }): CvAnalysisResponse {
    return {
      profileId: profile.id,
      stage: profile.stage,
      status: profile.status,
      summary: profile.summary,
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
    };
  }

  private notFound(message: string): ApiException {
    return new ApiException(BusinessErrorCode.RESOURCE_NOT_FOUND, 404, message);
  }
}
