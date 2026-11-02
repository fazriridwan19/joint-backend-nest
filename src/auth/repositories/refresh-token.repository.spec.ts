import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { REDIS_CLIENT } from '../../shared/modules/redis.module';
import { RefreshTokenRepository } from './refresh-token.repository';

type RedisCommand =
  | { name: 'set'; key: string; value: string }
  | { name: 'sadd'; key: string; value: string }
  | { name: 'expire'; key: string }
  | { name: 'srem'; key: string; value: string }
  | { name: 'del'; key: string };

class FakeRedis {
  readonly values = new Map<string, string>();
  readonly sets = new Map<string, Set<string>>();
  readonly watchedKeys: string[][] = [];
  readonly transactions: RedisCommand[][] = [];
  readonly eval = jest.fn();
  readonly nextExecResults: Array<null | [null, unknown][]> = [];

  duplicate(): FakeRedis {
    const duplicate = new FakeRedis();
    Object.assign(duplicate, {
      values: this.values,
      sets: this.sets,
      watchedKeys: this.watchedKeys,
      transactions: this.transactions,
      eval: this.eval,
      nextExecResults: this.nextExecResults,
    });
    return duplicate;
  }

  ping(): Promise<string> {
    return Promise.resolve('PONG');
  }

  quit(): Promise<string> {
    return Promise.resolve('OK');
  }

  watch(...keys: string[]): Promise<'OK'> {
    this.watchedKeys.push(keys);
    return Promise.resolve('OK');
  }

  unwatch(): Promise<'OK'> {
    return Promise.resolve('OK');
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  smembers(key: string): Promise<string[]> {
    return Promise.resolve([...(this.sets.get(key) ?? [])]);
  }

  multi(): FakeRedisTransaction {
    return new FakeRedisTransaction(this);
  }
}

class FakeRedisTransaction {
  private readonly commands: RedisCommand[] = [];

  constructor(private readonly redis: FakeRedis) {}

  set(key: string, value: string): this {
    this.commands.push({ name: 'set', key, value });
    return this;
  }

  sadd(key: string, value: string): this {
    this.commands.push({ name: 'sadd', key, value });
    return this;
  }

  expire(key: string): this {
    this.commands.push({ name: 'expire', key });
    return this;
  }

  srem(key: string, value: string): this {
    this.commands.push({ name: 'srem', key, value });
    return this;
  }

  del(key: string): this {
    this.commands.push({ name: 'del', key });
    return this;
  }

  exec(): Promise<[null, unknown][] | null> {
    this.redis.transactions.push(this.commands);
    const result = this.redis.nextExecResults.shift();
    if (result === null) {
      return Promise.resolve(null);
    }

    for (const command of this.commands) {
      switch (command.name) {
        case 'set':
          this.redis.values.set(command.key, command.value);
          break;
        case 'sadd': {
          const members = this.redis.sets.get(command.key) ?? new Set<string>();
          members.add(command.value);
          this.redis.sets.set(command.key, members);
          break;
        }
        case 'expire':
          break;
        case 'srem':
          this.redis.sets.get(command.key)?.delete(command.value);
          break;
        case 'del':
          this.redis.sets.delete(command.key);
          break;
      }
    }

    return Promise.resolve(
      result ?? this.commands.map(() => [null, 'OK'] as [null, string]),
    );
  }
}

describe('RefreshTokenRepository', () => {
  let repository: RefreshTokenRepository;
  let redis: FakeRedis;

  beforeEach(async () => {
    redis = new FakeRedis();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenRepository,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: 'REFRESH_TOKEN_TTL_SECONDS', useValue: 1800 },
      ],
    }).compile();
    repository = module.get(RefreshTokenRepository);
  });

  it('stores only a hash of the issued refresh token in a Redis transaction', async () => {
    const rawToken = await repository.issue('user-id');
    const tokenKey = `auth:refresh:${createHash('sha256')
      .update(rawToken)
      .digest('hex')}`;

    expect(redis.values.get(tokenKey)).toBe('user-id');
    expect(redis.sets.get('auth:user-refresh:user-id')?.has(tokenKey)).toBe(
      true,
    );
    expect([...redis.values.keys()]).not.toContain(rawToken);
    expect(redis.transactions[0].map(({ name }) => name)).toEqual([
      'set',
      'sadd',
      'expire',
    ]);
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('consumes each token once and revokes remaining sessions on replay', async () => {
    const firstToken = await repository.issue('user-id');
    const secondToken = await repository.issue('user-id');
    const firstTokenKey = `auth:refresh:${createHash('sha256')
      .update(firstToken)
      .digest('hex')}`;
    const secondTokenKey = `auth:refresh:${createHash('sha256')
      .update(secondToken)
      .digest('hex')}`;

    await expect(repository.consume(firstToken)).resolves.toEqual({
      kind: 'valid',
      userId: 'user-id',
    });
    await expect(repository.consume(firstToken)).resolves.toEqual({
      kind: 'reuse',
    });

    expect(redis.values.get(firstTokenKey)).toBe('REVOKED:user-id');
    expect(redis.values.get(secondTokenKey)).toBe('REVOKED:user-id');
    expect(redis.sets.has('auth:user-refresh:user-id')).toBe(false);
    expect(redis.watchedKeys).toContainEqual([firstTokenKey]);
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('retries a watched consume after a concurrent Redis update', async () => {
    const token = await repository.issue('user-id');
    const tokenKey = `auth:refresh:${createHash('sha256')
      .update(token)
      .digest('hex')}`;
    redis.nextExecResults.push(null);

    await expect(repository.consume(token)).resolves.toEqual({
      kind: 'valid',
      userId: 'user-id',
    });
    expect(
      redis.watchedKeys.filter((keys) => keys.includes(tokenKey)),
    ).toHaveLength(2);
  });

  it('revokes an individual token and all active tokens for a user', async () => {
    const token = await repository.issue('user-id');
    const tokenKey = `auth:refresh:${createHash('sha256')
      .update(token)
      .digest('hex')}`;

    await repository.revoke(token);
    expect(redis.values.get(tokenKey)).toBe('REVOKED:user-id');

    const anotherToken = await repository.issue('user-id');
    await repository.revokeAll('user-id');
    const anotherTokenKey = `auth:refresh:${createHash('sha256')
      .update(anotherToken)
      .digest('hex')}`;
    expect(redis.values.get(anotherTokenKey)).toBe('REVOKED:user-id');
    expect(redis.sets.has('auth:user-refresh:user-id')).toBe(false);
    expect(redis.eval).not.toHaveBeenCalled();
  });
});
