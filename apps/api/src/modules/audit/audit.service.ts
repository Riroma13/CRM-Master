import { Injectable } from '@nestjs/common';

export interface AuditEntry {
  id: number;
  timestamp: string;
  tenantId: string;
  tenantName?: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ip?: string;
}

@Injectable()
export class AuditService {
  private buffer: AuditEntry[] = [];
  private nextId = 1;
  private readonly maxEntries = 2000;

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
    const auditEntry: AuditEntry = {
      id: this.nextId++,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.buffer.push(auditEntry);

    // Keep buffer at max size
    if (this.buffer.length > this.maxEntries) {
      this.buffer = this.buffer.slice(-this.maxEntries);
    }
  }

  findAll(limit = 100, tenantId?: string): AuditEntry[] {
    let results = this.buffer;
    if (tenantId) {
      results = results.filter((e) => e.tenantId === tenantId);
    }
    return results.slice(-limit).reverse();
  }

  findById(id: number): AuditEntry | undefined {
    return this.buffer.find((e) => e.id === id);
  }
}
