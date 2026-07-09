import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.resolve('./backups');

  constructor() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(): Promise<string> {
    const filename = `crm-master-${new Date().toISOString().split('T')[0]}.sql`;
    const filepath = path.join(this.backupDir, filename);
    const dbUrl = process.env.DATABASE_URL || '';

    // Parse DATABASE_URL
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) throw new Error('Invalid DATABASE_URL');

    const [, user, password, host, port, database] = match;
    const dbName = database.split('?')[0];

    const cmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -F c -f ${filepath}`;
    try {
      await execAsync(cmd);
      this.logger.log(`Backup created: ${filepath}`);
      return filename;
    } catch (err) {
      this.logger.error(`Backup failed: ${err}`);
      throw err;
    }
  }

  listBackups(): { filename: string; size: number; createdAt: Date }[] {
    try {
      return fs.readdirSync(this.backupDir)
        .filter((f) => f.endsWith('.sql'))
        .map((f) => {
          const stat = fs.statSync(path.join(this.backupDir, f));
          return { filename: f, size: stat.size, createdAt: stat.mtime };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch {
      return [];
    }
  }
}
