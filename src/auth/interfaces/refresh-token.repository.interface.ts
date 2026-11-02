export type ConsumeRefreshTokenResult =
  { kind: 'valid'; userId: string } | { kind: 'reuse' } | { kind: 'invalid' };

export interface IRefreshTokenRepository {
  issue(userId: string): Promise<string>;
  consume(rawToken: string): Promise<ConsumeRefreshTokenResult>;
  revoke(rawToken: string): Promise<void>
  revokeAll(userId: string): Promise<void>
}
