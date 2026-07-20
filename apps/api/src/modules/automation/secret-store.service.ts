import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as crypto from 'crypto';
import type { SecretStore } from '../../../../../packages/shared/src/automation';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.SECRET_STORE_KEY || crypto.randomBytes(32).toString('hex');

@Injectable()
export class SecretStoreService implements SecretStore {
  private readonly logger = new Logger(SecretStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string, key: string): Promise<string | null> {
    const row = await this.prisma.admin.tenantSecret.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    if (!row) return null;
    return this.decrypt(row.value);
  }

  async set(tenantId: string, key: string, value: string): Promise<void> {
    const encrypted = this.encrypt(value);
    await this.prisma.admin.tenantSecret.upsert({
      where: { tenantId_key: { tenantId, key } },
      create: { tenantId, key, value: encrypted },
      update: { value: encrypted },
    });
  }

  async delete(tenantId: string, key: string): Promise<void> {
    await this.prisma.admin.tenantSecret.deleteMany({
      where: { tenantId, key },
    });
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex').subarray(0, 32), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decrypt(encrypted: string): string {
    const [ivHex, authTagHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex').subarray(0, 32), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
