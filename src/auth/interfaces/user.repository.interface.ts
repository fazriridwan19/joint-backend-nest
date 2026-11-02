import { User } from 'src/auth/entities/user.entity';
import { DeepPartial } from 'typeorm';

export interface IUserRepository {
  create(values: DeepPartial<User>): User;
  findByEmailIgnoreCase(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}
