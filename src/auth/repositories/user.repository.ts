import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Raw, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUserRepository } from 'src/auth/interfaces/user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  create(values: DeepPartial<User>): User {
    return this.repository.create(values);
  }

  findByEmailIgnoreCase(email: string): Promise<User | null> {
    return this.repository.findOneBy({
      email: Raw((column) => `LOWER(${column}) = :email`, {
        email: email.trim().toLowerCase(),
      }),
    });
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  save(user: User): Promise<User> {
    return this.repository.save(user);
  }
}
