import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { IAuthService } from 'src/auth/interfaces/auth.service.interface';
import {
  ChangePasswordRequest,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest,
  TokenResponse,
  UpdateProfileRequest,
  UserResponse,
} from './auth.dto';
import { AuthGuard } from './auth.guard';
import { AuthService } from './services/auth.service';
import { User } from './entities/user.entity';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: IAuthService,
  ) {}

  @Post('register')
  register(@Body() request: RegisterRequest): Promise<UserResponse> {
    return this.authService.register(request);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() request: LoginRequest): Promise<TokenResponse> {
    return this.authService.login(request);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() request: RefreshRequest): Promise<TokenResponse> {
    return this.authService.refresh(request.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(
    @Body() request: LogoutRequest,
  ): Promise<{ loggedOut: boolean }> {
    await this.authService.logout(request.refreshToken);
    return { loggedOut: true };
  }

  @Get('me')
  async me(@Req() request: AuthenticatedRequest): Promise<UserResponse> {
    const user = await this.authService.getUserAsDto(request.user.id);
    return user;
  }

  @Patch('me')
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateProfileRequest,
  ): Promise<UserResponse> {
    return this.authService.updateProfile(request.user.id, body);
  }

  @Patch('me/password')
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordRequest,
  ): Promise<{ updated: boolean }> {
    return this.authService.changePassword(request.user.id, body);
  }
}
