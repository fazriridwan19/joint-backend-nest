import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../shared/modules/redis.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './services/auth.service';
import { User } from './entities/user.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RedisModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: Buffer.from(
          config.get<string>(
            'JWT_SECRET',
            'VGhpc0lzQVN1ZmZpY2llbnRseUxvbmdTZWNyZXRGb3JEZXZlbG9wbWVudE9ubHk=',
          ),
          'base64',
        ),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, UserRepository, RefreshTokenRepository],
  exports: [AuthGuard, JwtModule, UserRepository],
})
export class AuthModule {}
