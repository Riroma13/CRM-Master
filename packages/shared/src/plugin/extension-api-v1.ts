export interface ExtensionAPIV1 {
  storage: {
    get(key: string): Promise<unknown | null>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    list(prefix?: string): Promise<string[]>;
  };

  emit(eventType: string, payload: Record<string, unknown>): Promise<void>;

  http: {
    get(url: string, options?: Record<string, unknown>): Promise<{ status: number; data: unknown }>;
    post(url: string, body: unknown, options?: Record<string, unknown>): Promise<{ status: number; data: unknown }>;
  };

  log: {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };
}
