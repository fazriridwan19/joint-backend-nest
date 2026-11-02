import { InjectDataSource } from '@nestjs/typeorm';
import { TransactionContext } from '../config/transactional.config';
import {
  DataSource,
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SaveOptions,
} from 'typeorm';

export abstract class BaseRepository<E extends ObjectLiteral> {
  constructor(
    protected readonly entity: new () => E,
    @InjectDataSource() protected readonly dataSource: DataSource,
  ) {}

  protected get repo(): Repository<E> {
    const em = TransactionContext.getEntityManager() ?? this.dataSource.manager;
    return em.getRepository(this.entity);
  }

  save<T extends DeepPartial<E>>(
    entity: T,
    options?: SaveOptions,
  ): Promise<T & E>;
  save<T extends DeepPartial<E>>(
    entities: T[],
    options?: SaveOptions,
  ): Promise<(T & E)[]>;
  save<T extends DeepPartial<E>>(
    entityOrEntities: T | T[],
    options?: SaveOptions,
  ): Promise<(T & E) | (T & E)[]> {
    return this.repo.save(entityOrEntities as any, options) as any;
  }

  async find(options?: FindManyOptions<E>): Promise<E[]> {
    return this.repo.find(options);
  }

  async findOne(options: FindOneOptions<E>): Promise<E | null> {
    return this.repo.findOne(options);
  }

  async findOneBy(
    where: FindOptionsWhere<E> | FindOptionsWhere<E>[],
  ): Promise<E | null> {
    return this.repo.findOneBy(where);
  }

  create(entityLike: DeepPartial<E>): E {
    return this.repo.create(entityLike);
  }
}
