import { Injectable } from '@nestjs/common';

export interface CommEntry {
  id: number;
  tenantId: string;
  clienteId: string;
  tipo: 'llamada' | 'email' | 'reunion' | 'otro';
  titulo: string;
  descripcion?: string;
  createdAt: string;
}

@Injectable()
export class CommunicationsService {
  private entries: CommEntry[] = [];
  private nextId = 1;
  private readonly maxEntries = 2000;

  log(entry: { tenantId: string; clienteId: string; tipo: CommEntry['tipo']; titulo: string; descripcion?: string }) {
    const comm: CommEntry = {
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      ...entry,
    };
    this.entries.push(comm);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
    return comm;
  }

  findByCliente(tenantId: string, clienteId: string): CommEntry[] {
    return this.entries
      .filter((e) => e.tenantId === tenantId && e.clienteId === clienteId)
      .slice(-50)
      .reverse();
  }
}
