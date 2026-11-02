import {
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
class RedisConnectionShutdown implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.redis.status !== 'end') {
      await this.redis.quit();
    }
  }
}

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis =>
        new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 1,
        }),
    },
    {
      provide: 'REFRESH_TOKEN_TTL_SECONDS',
      inject: [ConfigService],
      useFactory: (config: ConfigService): number =>
        Number(config.get<string>('REDIS_EXPIRATION', '1800')),
    },
    RedisConnectionShutdown,
  ],
  exports: [REDIS_CLIENT, 'REFRESH_TOKEN_TTL_SECONDS'],
})
export class RedisModule {}
