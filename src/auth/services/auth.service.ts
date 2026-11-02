import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { IAuthService } from 'src/auth/interfaces/auth.service.interface';
import { IRefreshTokenRepository } from 'src/auth/interfaces/refresh-token.repository.interface';
import { IUserRepository } from 'src/auth/interfaces/user.repository.interface';
import { QueryFailedError } from 'typeorm';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';
import {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UpdateProfileRequest,
  UserResponse,
} from '../auth.dto';
import { User } from '../entities/user.entity';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class AuthService implements IAuthService {
  private readonly accessTokenLifetimeSeconds: number;

  constructor(
    @Inject(UserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(RefreshTokenRepository)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTokenLifetimeSeconds =
      Number(config.get<string>('ACCESS_TOKEN_MINUTES', '15')) * 60;
  }

  async register(request: RegisterRequest): Promise<UserResponse> {
    const email = request.email.trim().toLowerCase();
    if (await this.userRepository.findByEmailIgnoreCase(email)) {
      throw new ApiException(
        BusinessErrorCode.DUPLICATE_RESOURCE,
        409,
        'Email sudah terdaftar.',
      );
    }

    const user = this.userRepository.create({
      email,
      passwordHash: await hash(request.password, 10),
      name: request.name.trim(),
      active: true,
    });

    try {
      return this.toUserResponse(await this.userRepository.save(user));
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ApiException(
          BusinessErrorCode.DUPLICATE_RESOURCE,
          409,
          'Email sudah terdaftar.',
        );
      }
      throw error;
    }
  }

  async login(request: LoginRequest): Promise<TokenResponse> {
    const user = await this.userRepository.findByEmailIgnoreCase(request.email);
    if (!user) {
      throw new ApiException(
        BusinessErrorCode.NOT_FOUND,
        404,
        'Data user tidak ditemukan',
      );
    }
    const validPassword = await compare(request.password, user.passwordHash);
    if (!user.active || !validPassword) {
      throw new ApiException(
        BusinessErrorCode.UNAUTHENTICATED,
        401,
        'Email atau password salah.',
      );
    }
    return this.issueTokens(user);
  }

  async refresh(rawToken: string): Promise<TokenResponse> {
    const result = await this.refreshTokenRepository.consume(rawToken);
    if (result.kind === 'reuse') {
      throw new ApiException(
        BusinessErrorCode.SESSION_REVOKED,
        401,
        'Sesi telah dicabut.',
      );
    }
    if (result.kind === 'invalid') {
      throw new ApiException(
        BusinessErrorCode.UNAUTHENTICATED,
        401,
        'Sesi tidak valid.',
      );
    }

    return this.issueTokens(await this.getUser(result.userId));
  }

  async logout(rawToken: string): Promise<void> {
    await this.refreshTokenRepository.revoke(rawToken);
  }

  async getUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user?.active) {
      throw new ApiException(
        BusinessErrorCode.UNAUTHENTICATED,
        401,
        !user ? 'User tidak ditemukan.' : 'Akun tidak aktif.',
      );
    }
    return user;
  }

  async getUserAsDto(userId: string): Promise<UserResponse> {
    const user = await this.getUser(userId);
    return this.toUserResponse(user);
  }

  async updateProfile(
    userId: string,
    request: UpdateProfileRequest,
  ): Promise<UserResponse> {
    const user = await this.getUser(userId);
    user.name = request.name.trim();
    return this.toUserResponse(await this.userRepository.save(user));
  }

  async changePassword(
    userId: string,
    request: ChangePasswordRequest,
  ): Promise<{ updated: boolean }> {
    const user = await this.getUser(userId);
    if (!(await compare(request.currentPassword, user.passwordHash))) {
      throw new ApiException(
        BusinessErrorCode.INVALID_CREDENTIALS,
        401,
        'Password saat ini salah.',
      );
    }
    user.passwordHash = await hash(request.newPassword, 10);
    await this.userRepository.save(user);
    await this.refreshTokenRepository.revokeAll(userId);
    return { updated: true };
  }

  toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  private async issueTokens(user: User): Promise<TokenResponse> {
    const accessToken = await this.jwt.signAsync(
      { email: user.email },
      {
        subject: user.id,
        expiresIn: this.accessTokenLifetimeSeconds,
      },
    );
    const refreshToken = await this.refreshTokenRepository.issue(user.id);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenLifetimeSeconds,
      user: this.toUserResponse(user),
    };
  }
}
