import { Injectable } from '@nestjs/common';
import type { Connector } from '@shared/integration';

@Injectable()
export class ConnectorRegistry {
  private connectors = new Map<string, Connector>();

  register(connector: Connector): void {
    this.connectors.set(connector.id, connector);
  }

  get(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  getAll(): Connector[] {
    return Array.from(this.connectors.values());
  }
}
