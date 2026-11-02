import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/\S/)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/\S/)
  name!: string;
}

export class LoginRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  password!: string;
}

export class RefreshRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  refreshToken!: string;
}

export class LogoutRequest extends RefreshRequest {}

export class UpdateProfileRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/\S/)
  name!: string;
}

export class ChangePasswordRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/\S/)
  newPassword!: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponse;
}
