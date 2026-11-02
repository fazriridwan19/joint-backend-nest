import { Schema, Type } from '@google/genai';

const text = (description: string, maxLength: number): Schema => ({
  type: Type.STRING,
  description,
  maxLength: String(maxLength),
});

const nullableText = (description: string, maxLength: number): Schema => ({
  ...text(description, maxLength),
  nullable: true,
});

const stringList = (description: string): Schema => ({
  type: Type.ARRAY,
  description,
  items: text('Satu nilai tekstual.', 500),
  maxItems: '100',
});

const object = (
  properties: Record<string, Schema>,
  required: string[],
): Schema => ({
  type: Type.OBJECT,
  properties,
  required,
  propertyOrdering: required,
});

const experienceSchema = object(
  {
    company: nullableText('Nama perusahaan, atau null jika tidak ada.', 150),
    position: nullableText('Jabatan, atau null jika tidak ada.', 150),
    startDate: nullableText('Tanggal mulai persis seperti di CV.', 100),
    endDate: nullableText('Tanggal akhir persis seperti di CV.', 100),
    responsibilities: stringList('Tanggung jawab yang tercantum.'),
    technologiesUsed: stringList('Teknologi yang tercantum.'),
  },
  [
    'company',
    'position',
    'startDate',
    'endDate',
    'responsibilities',
    'technologiesUsed',
  ],
);

const educationSchema = object(
  {
    institution: text('Nama institusi pendidikan.', 100),
    degree: text('Jenjang atau gelar pendidikan.', 50),
    fieldOfStudy: text('Jurusan atau bidang studi.', 100),
    startDate: nullableText('Tanggal mulai persis seperti di CV.', 100),
    endDate: nullableText('Tanggal akhir persis seperti di CV.', 100),
    gpa: nullableText('Nilai/IPK seperti di CV, atau null.', 100),
  },
  ['institution', 'degree', 'fieldOfStudy', 'startDate', 'endDate', 'gpa'],
);

const projectSchema = object(
  {
    name: text('Nama proyek.', 150),
    description: nullableText('Deskripsi proyek, atau null.', 2000),
    technologiesUsed: stringList('Teknologi proyek yang disebutkan.'),
    role: text('Peran kandidat dalam proyek.', 50),
  },
  ['name', 'description', 'technologiesUsed', 'role'],
);

const skillsSchema = object(
  {
    technicalSkills: stringList('Keahlian teknis.'),
    softSkills: stringList('Keahlian interpersonal.'),
    tools: stringList('Perangkat atau tools.'),
  },
  ['technicalSkills', 'softSkills', 'tools'],
);

const candidateProfileSchema = object(
  {
    experiences: {
      type: Type.ARRAY,
      items: experienceSchema,
      maxItems: '100',
    },
    educations: {
      type: Type.ARRAY,
      items: educationSchema,
      maxItems: '100',
    },
    projects: {
      type: Type.ARRAY,
      items: projectSchema,
      maxItems: '100',
    },
    skills: skillsSchema,
  },
  ['experiences', 'educations', 'projects', 'skills'],
);

export const CV_EXTRACTION_RESPONSE_SCHEMA: Schema = object(
  {
    experiences: {
      type: Type.ARRAY,
      description: 'Pengalaman kerja yang eksplisit disebutkan dalam CV.',
      items: experienceSchema,
      maxItems: '100',
    },
    educations: {
      type: Type.ARRAY,
      description: 'Riwayat pendidikan yang eksplisit disebutkan dalam CV.',
      items: educationSchema,
      maxItems: '100',
    },
    projects: {
      type: Type.ARRAY,
      description: 'Proyek yang eksplisit disebutkan dalam CV.',
      items: projectSchema,
      maxItems: '100',
    },
    skills: skillsSchema,
  },
  ['experiences', 'educations', 'projects', 'skills'],
);

export const CV_ANALYSIS_RESPONSE_SCHEMA: Schema = object(
  {
    summary: text('Ringkasan kecocokan CV dengan deskripsi pekerjaan.', 2000),
    strengths: stringList('Kekuatan kandidat yang didukung oleh data CV.'),
    weaknesses: stringList('Kekurangan terhadap kebutuhan pekerjaan.'),
  },
  ['summary', 'strengths', 'weaknesses'],
);

export const CV_EXTRACTION_INPUT_SCHEMA: Schema = object(
  {
    cvText: text('Teks hasil ekstraksi dari satu CV.', 100_000),
  },
  ['cvText'],
);

export const CV_ANALYSIS_INPUT_SCHEMA: Schema = object(
  {
    jobDescription: text(
      'Deskripsi pekerjaan yang menjadi konteks analisis.',
      30_000,
    ),
    candidateProfile: candidateProfileSchema,
  },
  ['jobDescription', 'candidateProfile'],
);
