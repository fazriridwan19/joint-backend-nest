import { Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { EntityManager, DataSource } from 'typeorm';

const logger = new Logger('Transactional');

export class DataSourceHolder {
  private static instance: DataSource;

  static set(dataSource: DataSource) {
    this.instance = dataSource;
  }

  static get(): DataSource {
    if (!this.instance) {
      throw new Error(
        'DataSourceHolder is not set. Make sure TransactionalModule has been imported in TypeOrmModule.forRoot().',
      );
    }
    return this.instance;
  }
}

interface TransactionStore {
  manager: EntityManager;
  commitHooks: Array<() => void | Promise<void>>;
}

export class TransactionContext {
  private static readonly storage = new AsyncLocalStorage<TransactionStore>();

  static run<T>(
    store: TransactionStore,
    callback: () => Promise<T>,
  ): Promise<T> {
    return this.storage.run(store, callback);
  }

  static getStore(): TransactionStore | undefined {
    return this.storage.getStore();
  }

  static getEntityManager(): EntityManager | undefined {
    return this.storage.getStore()?.manager;
  }
}

export function Transactional(): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const existingStore = TransactionContext.getStore();
      if (existingStore) {
        return originalMethod.apply(this, args);
      }

      const dataSource = DataSourceHolder.get();
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const store: TransactionStore = {
        manager: queryRunner.manager,
        commitHooks: [],
      };

      try {
        const result = await TransactionContext.run(store, () =>
          originalMethod.apply(this, args),
        );
        await queryRunner.commitTransaction();

        for (const hook of store.commitHooks) {
          try {
            await hook();
          } catch (error) {
            logger.error(
              'A runOnTransactionCommit hook failed after commit',
              error instanceof Error ? error.stack : error,
            );
          }
        }

        return result;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    };

    return descriptor;
  };
}

export function runOnTransactionCommit(
  callback: () => void | Promise<void>,
): void {
  const store = TransactionContext.getStore();

  if (!store) {
    void callback();
    return;
  }

  store.commitHooks.push(callback);
}
