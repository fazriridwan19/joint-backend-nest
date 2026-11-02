import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { IAuthService } from './interfaces/auth.service.interface';
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
  private readonly logger = new Logger(AuthController.name);
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
  @UseGuards(AuthGuard)
  async me(@Req() request: AuthenticatedRequest): Promise<UserResponse> {
    this.logger.log(`Fetching profile for user ${request.user.id}`);
    const user = await this.authService.getUserAsDto(request.user.id);
    return user;
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateProfileRequest,
  ): Promise<UserResponse> {
    this.logger.log(`Updating profile for user ${request.user.id}`);
    return this.authService.updateProfile(request.user.id, body);
  }

  @Patch('me/password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordRequest,
  ): Promise<{ updated: boolean }> {
    this.logger.log(`Changing password for user ${request.user.id}`);
    return this.authService.changePassword(request.user.id, body);
  }
}
