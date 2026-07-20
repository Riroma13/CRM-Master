export interface SecretStore {
  get(tenantId: string, key: string): Promise<string | null>;
  set(tenantId: string, key: string, value: string): Promise<void>;
  delete(tenantId: string, key: string): Promise<void>;
}
