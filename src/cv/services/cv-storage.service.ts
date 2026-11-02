import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class CvStorageService {
  private client: SupabaseClient | undefined;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('SUPABASE_CV_BUCKET', 'candidate-cvs');
  }

  async upload(key: string, file: Buffer): Promise<void> {
    const { error } = await this.storage().upload(key, file, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (error) {
      throw new Error(`Supabase CV upload failed: ${error.message}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    const { data, error } = await this.storage().download(key);
    if (error) {
      throw new Error(`Supabase CV download failed: ${error.message}`);
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async remove(key: string): Promise<void> {
    const { error } = await this.storage().remove([key]);
    if (error) {
      throw new Error(`Supabase CV cleanup failed: ${error.message}`);
    }
  }

  private storage() {
    if (!this.client) {
      const url = this.config.get<string>('SUPABASE_URL');
      const secretKey =
        this.config.get<string>('SUPABASE_SECRET_KEY') ??
        this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !secretKey) {
        throw new Error(
          'SUPABASE_URL and SUPABASE_SECRET_KEY must be configured for CV storage.',
        );
      }
      this.client = createClient(url, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.client.storage.from(this.bucket);
  }
}
