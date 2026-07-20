export interface EventTypeMetadata {
  eventType: string;
  module: string;
  description: string;
  category: string;
  since: string;
}

export class EventTypeRegistry {
  private registry = new Map<string, EventTypeMetadata>();

  register(metadata: EventTypeMetadata): void {
    if (this.registry.has(metadata.eventType)) {
      throw new Error(`Event type "${metadata.eventType}" is already registered`);
    }
    this.registry.set(metadata.eventType, { ...metadata });
  }

  get(eventType: string): EventTypeMetadata | undefined {
    return this.registry.get(eventType);
  }

  getAll(): EventTypeMetadata[] {
    return Array.from(this.registry.values());
  }

  getByModule(module: string): EventTypeMetadata[] {
    return Array.from(this.registry.values()).filter(
      (m) => m.module === module,
    );
  }

  isRegistered(eventType: string): boolean {
    return this.registry.has(eventType);
  }
}
