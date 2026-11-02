import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ApiException } from '../shared/api/api-exception';
import { BusinessErrorCode } from '../shared/business-error-code';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';

type AuthenticatedRequest = Request & { user?: User };
type JwtPayload = { sub?: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new ApiException(
        BusinessErrorCode.UNAUTHENTICATED,
        401,
        'Autentikasi diperlukan.',
      );
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(
        authorization.slice('Bearer '.length),
      );
    } catch {
      throw new ApiException(
        BusinessErrorCode.TOKEN_INVALID,
        401,
        'Token tidak valid.',
      );
    }

    if (
      !payload.sub ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.sub,
      )
    ) {
      throw new ApiException(
        BusinessErrorCode.TOKEN_INVALID,
        401,
        'Token tidak valid.',
      );
    }
    const user = await this.users.findById(payload.sub);
    if (!user?.active) {
      throw new ApiException(
        BusinessErrorCode.TOKEN_INVALID,
        401,
        'Token tidak valid.',
      );
    }
    request.user = user;
    return true;
  }
}
