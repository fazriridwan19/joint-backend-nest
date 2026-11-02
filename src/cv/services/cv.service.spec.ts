import { Logger } from '@nestjs/common';
import { ApiException } from '../../shared/api/api-exception';
import { CvProfileStage, CvProfileStatus } from '../cv.enums';
import { CvService, UploadedCvFile } from './cv.service';

describe('CvService', () => {
  const user = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Candidate',
    email: 'candidate@example.com',
  };
  const applicationId = '550e8400-e29b-41d4-a716-446655440001';
  let service: CvService;
  let profiles: {
    requireApplicationOwner: jest.Mock;
    requireOwnedProfile: jest.Mock;
    createProfile: jest.Mock;
    requestAnalysis: jest.Mock;
  };
  let storage: { upload: jest.Mock; remove: jest.Mock };
  let queue: { enqueueProfile: jest.Mock };

  beforeEach(() => {
    profiles = {
      requireApplicationOwner: jest.fn().mockResolvedValue(undefined),
      requireOwnedProfile: jest.fn().mockResolvedValue({ id: 'profile-id' }),
      createProfile: jest.fn().mockResolvedValue({
        id: 'profile-id',
        stage: CvProfileStage.EXTRACTION,
        status: CvProfileStatus.PENDING,
      }),
      requestAnalysis: jest.fn(),
    };
    storage = {
      upload: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    queue = { enqueueProfile: jest.fn().mockResolvedValue(undefined) };
    service = new CvService(
      profiles as never,
      storage as never,
      queue as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores a valid PDF privately before creating its pending profile', async () => {
    const file: UploadedCvFile = {
      originalname: '../../resume test.pdf',
      mimetype: 'application/pdf',
      size: 12,
      buffer: Buffer.from('%PDF-1.7 data'),
    };

    await service.upload(user, applicationId, file);

    expect(profiles.requireApplicationOwner).toHaveBeenCalledWith(
      user.id,
      applicationId,
    );
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`^${applicationId}/[0-9a-f-]+-resume_test\\.pdf$`),
      ),
      file.buffer,
    );
    expect(profiles.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId,
        name: user.name,
        email: user.email,
        fileName: 'resume_test.pdf',
        fileSize: file.size,
      }),
    );
    expect(queue.enqueueProfile).toHaveBeenCalledWith(
      'profile-id',
      CvProfileStage.EXTRACTION,
    );
    expect(profiles.createProfile.mock.invocationCallOrder[0]).toBeLessThan(
      queue.enqueueProfile.mock.invocationCallOrder[0],
    );
  });

  it('rejects non-PDF content before touching storage', async () => {
    const file: UploadedCvFile = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from('nope'),
    };

    await expect(
      service.upload(user, applicationId, file),
    ).rejects.toBeInstanceOf(ApiException);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(profiles.createProfile).not.toHaveBeenCalled();
  });

  it('removes the stored object if profile persistence fails', async () => {
    const file: UploadedCvFile = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: 8,
      buffer: Buffer.from('%PDF-1.7'),
    };
    const persistenceError = new Error('database unavailable');
    profiles.createProfile.mockRejectedValue(persistenceError);

    await expect(service.upload(user, applicationId, file)).rejects.toBe(
      persistenceError,
    );
    expect(storage.remove).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${applicationId}/`)),
    );
  });

  it('keeps the stored CV if enqueueing fails after the profile was committed', async () => {
    const file: UploadedCvFile = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: 8,
      buffer: Buffer.from('%PDF-1.7'),
    };
    queue.enqueueProfile.mockRejectedValue(new Error('Redis unavailable'));
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const error = await service
      .upload(user, applicationId, file)
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiException);
    if (error instanceof ApiException) {
      expect(error.getStatus()).toBe(503);
      expect(error.getResponse()).toMatchObject({
        details: [
          expect.objectContaining({
            field: 'profileId',
            message: 'profile-id',
          }),
        ],
      });
    }
    expect(profiles.createProfile).toHaveBeenCalledTimes(1);
    expect(storage.remove).not.toHaveBeenCalled();
    expect(queue.enqueueProfile).toHaveBeenCalledWith(
      'profile-id',
      CvProfileStage.EXTRACTION,
    );
  });

  it('queues an analysis only after its pending state has been committed', async () => {
    profiles.requestAnalysis.mockResolvedValue({
      profileId: 'profile-id',
      stage: CvProfileStage.ANALYZE,
      status: CvProfileStatus.PENDING,
      summary: null,
      strengths: null,
      weaknesses: null,
    });

    const response = await service.analyze(
      user.id,
      applicationId,
      'profile-id',
    );

    expect(queue.enqueueProfile).toHaveBeenCalledWith(
      'profile-id',
      CvProfileStage.ANALYZE,
    );
    expect(response.stage).toBe(CvProfileStage.ANALYZE);
  });
});
