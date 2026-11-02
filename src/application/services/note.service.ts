import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { NoteRequest, NoteResponse } from '../application.dto';
import { Note } from '../entities/note.entity';
import { JobApplication } from '../entities/job-application.entity';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private readonly notes: Repository<Note>,
    @InjectRepository(JobApplication)
    private readonly applications: Repository<JobApplication>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    userId: string,
    applicationId: string,
    request: NoteRequest,
  ): Promise<NoteResponse> {
    return this.dataSource.transaction(async (manager) => {
      await this.requireApplicationOwner(userId, applicationId, manager);
      const now = new Date();
      const repository = manager.getRepository(Note);
      const note = repository.create({
        applicationId,
        authorId: userId,
        content: request.content,
        pinned: request.pinned === true,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return this.toResponse(await repository.save(note));
    });
  }

  async list(userId: string, applicationId: string): Promise<NoteResponse[]> {
    await this.requireApplicationOwner(userId, applicationId);
    const notes = await this.notes.find({
      where: { applicationId, deletedAt: IsNull() },
      order: { pinned: 'DESC', createdAt: 'DESC' },
    });
    return notes.map((note) => this.toResponse(note));
  }

  async update(
    userId: string,
    id: string,
    request: NoteRequest,
  ): Promise<NoteResponse> {
    return this.dataSource.transaction(async (manager) => {
      const note = await manager.getRepository(Note).findOneBy({
        id,
        deletedAt: IsNull(),
      });
      if (!note) {
        throw this.notFound('Note tidak ditemukan.');
      }
      await this.requireApplicationOwner(userId, note.applicationId, manager);
      note.content = request.content;
      note.pinned = request.pinned === true;
      note.updatedAt = new Date();
      return this.toResponse(await manager.getRepository(Note).save(note));
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const note = await manager.getRepository(Note).findOneBy({
        id,
        deletedAt: IsNull(),
      });
      if (!note) {
        throw this.notFound('Note tidak ditemukan.');
      }
      await this.requireApplicationOwner(userId, note.applicationId, manager);
      note.deletedAt = new Date();
      await manager.getRepository(Note).save(note);
    });
  }

  private async requireApplicationOwner(
    userId: string,
    applicationId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager
      ? manager.getRepository(JobApplication)
      : this.applications;
    const application = await repository.findOneBy({
      id: applicationId,
      userId,
      deletedAt: IsNull(),
    });
    if (!application) {
      throw new ApiException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        404,
        'Application tidak ditemukan.',
      );
    }
  }

  private toResponse(note: Note): NoteResponse {
    return {
      id: note.id,
      content: note.content,
      pinned: note.pinned,
      authorId: note.authorId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  private notFound(message: string): ApiException {
    return new ApiException(BusinessErrorCode.RESOURCE_NOT_FOUND, 404, message);
  }
}
