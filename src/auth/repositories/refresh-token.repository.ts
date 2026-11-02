import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../shared/modules/redis.module';
import {
  ConsumeRefreshTokenResult,
  IRefreshTokenRepository,
} from '../interfaces/refresh-token.repository.interface';

const TOKEN_PREFIX = 'auth:refresh:';
const USER_PREFIX = 'auth:user-refresh:';
const REVOKED_PREFIX = 'REVOKED:';
const MAX_TRANSACTION_ATTEMPTS = 5;

type RedisTransactionResult = [Error | null, unknown][] | null;

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('REFRESH_TOKEN_TTL_SECONDS')
    private readonly expirationSeconds: number,
  ) {}

  async issue(userId: string): Promise<string> {
    const rawToken = randomUUID();
    const tokenKey = this.tokenKey(rawToken);
    const userKey = this.userKey(userId);
    const transaction = this.redis
      .multi()
      .set(tokenKey, userId, 'EX', String(this.expirationSeconds))
      .sadd(userKey, tokenKey)
      .expire(userKey, this.expirationSeconds);
    const result = await transaction.exec();

    this.assertTransactionSucceeded(result, 'issue refresh token');
    return rawToken;
  }

  async consume(rawToken: string): Promise<ConsumeRefreshTokenResult> {
    const tokenKey = this.tokenKey(rawToken);

    return this.withDedicatedClient(async (redis) => {
      for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
        await redis.watch(tokenKey);
        const state = await redis.get(tokenKey);
        if (state === null) {
          await redis.unwatch();
          return { kind: 'invalid' };
        }

        if (state.startsWith(REVOKED_PREFIX)) {
          const userId = state.slice(REVOKED_PREFIX.length);
          if (!userId) {
            throw new Error('Refresh token has an invalid revoked state.');
          }
          await redis.unwatch();
          await this.revokeAllWithClient(redis, userId);
          return { kind: 'reuse' };
        }

        if (!state) {
          throw new Error('Refresh token has an empty user id.');
        }

        const result = await redis
          .multi()
          .set(
            tokenKey,
            `${REVOKED_PREFIX}${state}`,
            'EX',
            String(this.expirationSeconds),
          )
          .srem(this.userKey(state), tokenKey)
          .exec();
        if (result === null) {
          continue;
        }

        this.assertTransactionSucceeded(result, 'consume refresh token');
        return { kind: 'valid', userId: state };
      }

      throw new Error(
        'Could not consume refresh token after repeated concurrent updates.',
      );
    });
  }

  async revoke(rawToken: string): Promise<void> {
    const tokenKey = this.tokenKey(rawToken);

    await this.withDedicatedClient(async (redis) => {
      for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
        await redis.watch(tokenKey);
        const state = await redis.get(tokenKey);
        if (state === null || state.startsWith(REVOKED_PREFIX)) {
          await redis.unwatch();
          return;
        }

        const result = await redis
          .multi()
          .set(
            tokenKey,
            `${REVOKED_PREFIX}${state}`,
            'EX',
            String(this.expirationSeconds),
          )
          .srem(this.userKey(state), tokenKey)
          .exec();
        if (result === null) {
          continue;
        }

        this.assertTransactionSucceeded(result, 'revoke refresh token');
        return;
      }

      throw new Error(
        'Could not revoke refresh token after repeated concurrent updates.',
      );
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.withDedicatedClient((redis) =>
      this.revokeAllWithClient(redis, userId),
    );
  }

  private async revokeAllWithClient(
    redis: Redis,
    userId: string,
  ): Promise<void> {
    const userKey = this.userKey(userId);

    for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      await redis.watch(userKey);
      const tokenKeys = await redis.smembers(userKey);
      if (tokenKeys.length > 0) {
        await redis.watch(...tokenKeys);
      }

      const tokenStates = await Promise.all(
        tokenKeys.map(async (tokenKey) => ({
          tokenKey,
          state: await redis.get(tokenKey),
        })),
      );
      const transaction = redis.multi();
      for (const { tokenKey, state } of tokenStates) {
        if (state === userId) {
          transaction.set(
            tokenKey,
            `${REVOKED_PREFIX}${userId}`,
            'EX',
            String(this.expirationSeconds),
          );
        }
      }

      const result = await transaction.del(userKey).exec();
      if (result === null) {
        continue;
      }

      this.assertTransactionSucceeded(result, 'revoke all refresh tokens');
      return;
    }

    throw new Error(
      'Could not revoke all refresh tokens after repeated concurrent updates.',
    );
  }

  private async withDedicatedClient<T>(
    operation: (redis: Redis) => Promise<T>,
  ): Promise<T> {
    const redis = this.redis.duplicate();
    try {
      await redis.ping();
      return await operation(redis);
    } finally {
      await redis.quit();
    }
  }

  private assertTransactionSucceeded(
    result: RedisTransactionResult,
    operation: string,
  ): void {
    if (result === null) {
      throw new Error(
        `Redis transaction was aborted while attempting to ${operation}.`,
      );
    }

    const failedCommand = result.find(([error]) => error !== null);
    if (failedCommand?.[0]) {
      throw new Error(
        `Redis failed to ${operation}: ${failedCommand[0].message}`,
        { cause: failedCommand[0] },
      );
    }
  }

  private tokenKey(rawToken: string): string {
    const hash = createHash('sha256').update(rawToken).digest('hex');
    return `${TOKEN_PREFIX}${hash}`;
  }

  private userKey(userId: string): string {
    return `${USER_PREFIX}${userId}`;
  }
}
