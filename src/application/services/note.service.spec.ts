import { DataSource, EntityManager, Repository } from 'typeorm';
import { NoteRequest } from '../application.dto';
import { Note } from '../entities/note.entity';
import { JobApplication } from '../entities/job-application.entity';
import { ApiException } from '../../shared/api/api-exception';
import { NoteService } from './note.service';

describe('NoteService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const applicationId = '550e8400-e29b-41d4-a716-446655440001';
  const noteId = '550e8400-e29b-41d4-a716-446655440002';
  let service: NoteService;
  let applicationRepository: { findOneBy: jest.Mock };
  let noteRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };

  beforeEach(() => {
    applicationRepository = {
      findOneBy: jest.fn().mockResolvedValue({ id: applicationId, userId }),
    };
    noteRepository = {
      create: jest.fn((value: Partial<Note>) => value),
      save: jest.fn((value: Partial<Note>) => ({
        ...value,
        id: noteId,
      })),
      findOneBy: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn((entity: typeof Note | typeof JobApplication) =>
        entity === Note ? noteRepository : applicationRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: EntityManager) => Promise<unknown>) =>
          operation(manager),
      ),
    } as unknown as DataSource;
    service = new NoteService(
      noteRepository as unknown as Repository<Note>,
      applicationRepository as unknown as Repository<JobApplication>,
      dataSource,
    );
  });

  it('creates a note with the authenticated user as author', async () => {
    const response = await service.create(userId, applicationId, {
      content: 'Follow up with the recruiter',
      pinned: true,
    } satisfies NoteRequest);

    expect(response).toMatchObject({
      id: noteId,
      content: 'Follow up with the recruiter',
      pinned: true,
      authorId: userId,
    });
    expect(noteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId,
        authorId: userId,
        pinned: true,
      }),
    );
  });

  it('does not expose notes for applications owned by another user', async () => {
    applicationRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.create(userId, applicationId, { content: 'Private note' }),
    ).rejects.toBeInstanceOf(ApiException);

    expect(noteRepository.save).not.toHaveBeenCalled();
  });
});
