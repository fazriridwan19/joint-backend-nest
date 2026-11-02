import { Injectable } from '@nestjs/common';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import { Transactional } from '../../shared/config/transactional.config';
import { Contact } from '../entities/contact.entity';
import { ProductivityAccess } from '../productivity-access.service';
import {
  ContactRequest,
  ContactResponse,
  DeleteResponse,
} from '../productivity.dto';
import { ApplicationContactRepository } from '../repositories/application-contact.repository';
import { ContactRepository } from '../repositories/contact.repository';

@Injectable()
export class ContactService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly applicationContactRepository: ApplicationContactRepository,
    private readonly access: ProductivityAccess,
  ) {}

  async list(userId: string, query?: string): Promise<ContactResponse[]> {
    return (await this.contactRepository.findAllByUserId(userId, query)).map(
      (contact) => this.toResponse(contact),
    );
  }

  async get(userId: string, id: string): Promise<ContactResponse> {
    return this.toResponse(await this.requireContact(userId, id));
  }

  @Transactional()
  async create(
    userId: string,
    request: ContactRequest,
  ): Promise<ContactResponse> {
    const contact = this.contactRepository.create({
      userId,
      name: request.name.trim(),
      role: request.role ?? null,
      companyId: request.companyId ?? null,
      email: request.email ?? null,
      linkedinUrl: request.linkedinUrl ?? null,
      phone: request.phone ?? null,
      notes: request.notes ?? null,
      createdAt: new Date(),
    });
    return this.toResponse(await this.contactRepository.save(contact));
  }

  @Transactional()
  async update(
    userId: string,
    id: string,
    request: ContactRequest,
  ): Promise<ContactResponse> {
    const contact = await this.requireContact(userId, id);
    contact.name = request.name.trim();
    contact.role = request.role ?? null;
    contact.companyId = request.companyId ?? null;
    contact.email = request.email ?? null;
    contact.linkedinUrl = request.linkedinUrl ?? null;
    contact.phone = request.phone ?? null;
    contact.notes = request.notes ?? null;
    return this.toResponse(await this.contactRepository.save(contact));
  }

  @Transactional()
  async delete(userId: string, id: string): Promise<DeleteResponse> {
    const contact = await this.requireContact(userId, id);
    await this.contactRepository.deleteById(contact.id);
    return { id, deleted: true };
  }

  async listForApplication(
    userId: string,
    applicationId: string,
  ): Promise<ContactResponse[]> {
    await this.access.requireOwner(userId, applicationId);
    const associations =
      await this.applicationContactRepository.findAllByApplicationId(
        applicationId,
      );
    if (associations.length === 0) return [];
    const contacts = await this.contactRepository.findByIdsAndUserId(
      associations.map(({ contactId }) => contactId),
      userId,
    );
    return contacts.map((contact) => this.toResponse(contact));
  }

  @Transactional()
  async associate(
    userId: string,
    applicationId: string,
    contactId: string,
  ): Promise<void> {
    await this.access.requireOwner(userId, applicationId);
    await this.requireContact(userId, contactId);
    const exists =
      await this.applicationContactRepository.existsByApplicationIdAndContactId(
        applicationId,
        contactId,
      );
    if (!exists) {
      await this.applicationContactRepository.save(
        this.applicationContactRepository.create({ applicationId, contactId }),
      );
    }
  }

  private async requireContact(userId: string, id: string): Promise<Contact> {
    const contact = await this.contactRepository.findByIdAndUserId(id, userId);
    if (!contact) {
      throw new ApiException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        404,
        'Contact tidak ditemukan.',
      );
    }
    return contact;
  }

  private toResponse(contact: Contact): ContactResponse {
    return {
      id: contact.id,
      name: contact.name,
      role: contact.role,
      companyId: contact.companyId,
      email: contact.email,
      linkedinUrl: contact.linkedinUrl,
      phone: contact.phone,
      notes: contact.notes,
      createdAt: contact.createdAt,
    };
  }
}
