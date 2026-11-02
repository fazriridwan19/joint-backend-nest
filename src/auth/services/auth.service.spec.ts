import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { UserRepository } from '../repositories/user.repository';

describe('AuthService', () => {
  let service: AuthService;
  let user: User;
  let emailMatch: User | null;
  let createdUser: Partial<User> | undefined;
  let savedUser: User | undefined;
  let consumeResult:
    { kind: 'valid'; userId: string } | { kind: 'reuse' } | { kind: 'invalid' };
  let consumeCalls: number;
  let revokeAllUserId: string | undefined;
  let issuedUserId: string | undefined;

  beforeEach(async () => {
    user = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'person@example.com',
      passwordHash: '',
      name: 'Person',
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    emailMatch = null;
    createdUser = undefined;
    savedUser = undefined;
    consumeResult = { kind: 'valid', userId: user.id };
    consumeCalls = 0;
    revokeAllUserId = undefined;
    issuedUserId = undefined;

    const userRepository = {
      create: (values: Partial<User>): User => {
        createdUser = values;
        return Object.assign({}, user, values);
      },
      save: (value: User): Promise<User> => {
        savedUser = value;
        return Promise.resolve(value);
      },
      findByEmailIgnoreCase: (): Promise<User | null> =>
        Promise.resolve(emailMatch),
      findById: (): Promise<User | null> => Promise.resolve(user),
    };
    const refreshTokenRepository = {
      issue: (userId: string): Promise<string> => {
        issuedUserId = userId;
        return Promise.resolve('issued-refresh-token');
      },
      consume: (): Promise<typeof consumeResult> => {
        consumeCalls += 1;
        if (consumeCalls > 1) {
          return Promise.resolve({ kind: 'reuse' });
        }
        return Promise.resolve(consumeResult);
      },
      revoke: (): Promise<void> => Promise.resolve(),
      revokeAll: (userId: string): Promise<void> => {
        revokeAllUserId = userId;
        return Promise.resolve();
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepository },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
        {
          provide: JwtService,
          useValue: { signAsync: () => Promise.resolve('access-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, defaultValue: string) => defaultValue,
          },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('normalizes registration values and never returns the password hash', async () => {
    const response = await service.register({
      email: '  PERSON@EXAMPLE.COM ',
      password: 'secure-password',
      name: ' Person ',
    });

    expect(createdUser).toMatchObject({
      email: 'person@example.com',
      name: 'Person',
      active: true,
    });
    expect(savedUser).toBeDefined();
    expect(await compare('secure-password', savedUser!.passwordHash)).toBe(
      true,
    );
    expect(response).toEqual({
      id: user.id,
      email: 'person@example.com',
      name: 'Person',
      createdAt: user.createdAt,
    });
    expect(response).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate email addresses case-insensitively', async () => {
    emailMatch = user;
    const error = await service
      .register({
        email: 'PERSON@example.com',
        password: 'secure-password',
        name: 'Person',
      })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiException);
    if (error instanceof ApiException) {
      expect(error.getResponse()).toMatchObject({
        code: BusinessErrorCode.DUPLICATE_RESOURCE,
        message: 'Email sudah terdaftar.',
      });
    }
    expect(savedUser).toBeUndefined();
  });

  it('issues a Redis refresh token and revokes sessions on token reuse', async () => {
    const response = await service.refresh('original-refresh-token');

    expect(response.accessToken).toBe('access-token');
    expect(response.refreshToken).toBe('issued-refresh-token');
    expect(issuedUserId).toBe(user.id);

    const replayError = await service
      .refresh('original-refresh-token')
      .catch((error: unknown) => error);
    expect(replayError).toBeInstanceOf(ApiException);
    if (replayError instanceof ApiException) {
      expect(replayError.getResponse()).toMatchObject({
        code: BusinessErrorCode.SESSION_REVOKED,
        message: 'Sesi telah dicabut.',
      });
    }
  });

  it('revokes all Redis refresh tokens after changing the password', async () => {
    user.passwordHash = await hash('current-password', 10);

    await expect(
      service.changePassword(user.id, {
        currentPassword: 'current-password',
        newPassword: 'new-password-123',
      }),
    ).resolves.toEqual({ updated: true });

    expect(savedUser).toBeDefined();
    expect(await compare('new-password-123', savedUser!.passwordHash)).toBe(
      true,
    );
    expect(revokeAllUserId).toBe(user.id);
  });
});
