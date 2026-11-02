import {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UpdateProfileRequest,
  UserResponse,
} from '../auth.dto';
import { User } from '../entities/user.entity';

export interface IAuthService {
  register(request: RegisterRequest): Promise<UserResponse>;
  login(request: LoginRequest): Promise<TokenResponse>;
  refresh(rawToken: string): Promise<TokenResponse>;
  logout(rawToken: string): Promise<void>;
  getUser(userId: string): Promise<User>;
  getUserAsDto(userId: string): Promise<UserResponse>;
  updateProfile(
    userId: string,
    request: UpdateProfileRequest,
  ): Promise<UserResponse>;
  changePassword(
    userId: string,
    request: ChangePasswordRequest,
  ): Promise<{ updated: boolean }>;
}
