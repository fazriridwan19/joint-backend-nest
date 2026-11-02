import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { CvLlmService } from './cv-llm.service';

jest.mock('@google/genai', () => ({
  Type: {
    STRING: 'STRING',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT',
  },
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: jest.fn() },
  })),
}));

describe('CvLlmService', () => {
  const config = {
    get: jest.fn((key: string, defaultValue?: string) =>
      key === 'GEMINI_API_KEY' ? 'test-api-key' : defaultValue,
    ),
  };
  let service: CvLlmService;
  let generateContent: jest.Mock;

  beforeEach(() => {
    const constructor = GoogleGenAI as unknown as jest.Mock;
    constructor.mockClear();
    generateContent = jest.fn();
    constructor.mockImplementation(() => ({
      models: { generateContent },
    }));
    service = new CvLlmService(config as unknown as ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses JSON mode and validates Gemini extraction against the local contract', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        experiences: [],
        educations: [],
        projects: [],
        skills: {
          technicalSkills: ['TypeScript'],
          softSkills: [],
          tools: ['Git'],
        },
      }),
    });

    await expect(service.extract({ cvText: 'CV text' })).resolves.toEqual({
      experiences: [],
      educations: [],
      projects: [],
      skills: {
        technicalSkills: ['TypeScript'],
        softSkills: [],
        tools: ['Git'],
      },
    });
    const [request] = generateContent.mock.calls[0] as unknown as [
      {
        contents: string;
        config: {
          responseMimeType: string;
          temperature: number;
          systemInstruction: string;
        };
      },
    ];
    expect(request.contents).toBe(JSON.stringify({ cvText: 'CV text' }));
    expect(request.config).toMatchObject({
      responseMimeType: 'application/json',
      temperature: 0,
    });
    expect(request.config).not.toHaveProperty('responseSchema');
    expect(request.config.systemInstruction).toContain(
      'Input selalu berupa object JSON',
    );
  });

  it('rejects malformed model output so BullMQ can retry the job', async () => {
    generateContent.mockResolvedValue({
      text: '{"experiences":[],"skills":{"technicalSkills":[],"softSkills":[],"tools":[]}}',
    });

    await expect(service.extract({ cvText: 'CV text' })).rejects.toThrow(
      'CV extraction output.educations is required.',
    );
  });

  it('rejects model fields that are outside the approved response contract', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        experiences: [],
        educations: [],
        projects: [],
        skills: { technicalSkills: [], softSkills: [], tools: [] },
        internalNotes: 'unexpected',
      }),
    });

    await expect(service.extract({ cvText: 'CV text' })).rejects.toThrow(
      'CV extraction output contains unsupported fields: internalNotes.',
    );
  });

  it('normalizes common extraction section names and omits personal information', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        personal_information: {
          name: 'Candidate',
          email: 'candidate@example.com',
        },
        work_experience: [
          {
            company: 'Example Inc',
            position: 'Engineer',
            startDate: '2020',
            endDate: null,
            responsibilities: ['Built APIs'],
            technologiesUsed: ['TypeScript'],
          },
        ],
        education: [
          {
            institution: 'Example University',
            degree: 'Bachelor',
            fieldOfStudy: 'Computer Science',
            startDate: '2016',
            endDate: '2020',
            gpa: null,
          },
        ],
        projects: [],
        skills: { technicalSkills: [], softSkills: [], tools: [] },
      }),
    });

    await expect(service.extract({ cvText: 'CV text' })).resolves.toMatchObject(
      {
        experiences: [{ company: 'Example Inc' }],
        educations: [{ institution: 'Example University' }],
      },
    );
  });

  it('normalizes an unknown project role to an empty string', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        experiences: [],
        educations: [],
        projects: [
          {
            name: 'Portfolio site',
            description: null,
            technologiesUsed: ['React'],
            role: null,
          },
        ],
        skills: { technicalSkills: [], softSkills: [], tools: [] },
      }),
    });

    await expect(service.extract({ cvText: 'CV text' })).resolves.toMatchObject(
      { projects: [{ name: 'Portfolio site', role: '' }] },
    );
  });

  it('rejects conflicting canonical and aliased extraction fields', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        experiences: [],
        work_experience: [],
        educations: [],
        projects: [],
        skills: { technicalSkills: [], softSkills: [], tools: [] },
      }),
    });

    await expect(service.extract({ cvText: 'CV text' })).rejects.toThrow(
      'CV extraction output contains both work_experience and experiences.',
    );
  });

  it('validates a structured analysis input and serializes only approved fields', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        summary: 'Cocok dengan posisi.',
        strengths: ['TypeScript'],
        weaknesses: [],
      }),
    });

    const input = {
      jobDescription: 'Mencari engineer TypeScript.',
      candidateProfile: {
        experiences: [],
        educations: [],
        projects: [],
        skills: { technicalSkills: ['TypeScript'], softSkills: [], tools: [] },
      },
    };

    await expect(service.analyze(input)).resolves.toEqual({
      summary: 'Cocok dengan posisi.',
      strengths: ['TypeScript'],
      weaknesses: [],
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ contents: JSON.stringify(input) }),
    );
  });

  it('rejects analysis inputs that contain undeclared data', async () => {
    await expect(
      service.analyze({
        jobDescription: 'Engineer',
        candidateProfile: {
          experiences: [],
          educations: [],
          projects: [],
          skills: { technicalSkills: [], softSkills: [], tools: [] },
          email: 'should-not-be-sent@example.com',
        } as never,
      }),
    ).rejects.toThrow(
      'CV analysis input.candidateProfile contains unsupported fields: email.',
    );
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('returns an empty extraction without calling the LLM for blank CV text', async () => {
    await expect(service.extract({ cvText: '  ' })).resolves.toEqual({
      experiences: [],
      educations: [],
      projects: [],
      skills: { technicalSkills: [], softSkills: [], tools: [] },
    });
    expect(generateContent).not.toHaveBeenCalled();
  });
});
