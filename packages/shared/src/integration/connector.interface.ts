export interface WebhookRequest {
  headers: Record<string, string>;
  body: unknown;
  rawBody?: string;
}

export interface Connector {
  readonly id: string;
  readonly name: string;
  readonly authType: 'oauth' | 'api-key' | 'none';
  execute(operation: string, input: Record<string, unknown>): Promise<ConnectorResult>;
  getAuthStatus(): Promise<AuthStatus>;
  refreshAuth(): Promise<void>;
  verifyWebhookSignature?(request: WebhookRequest): boolean;
}

export interface ConnectorResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export interface AuthStatus {
  valid: boolean;
  expiresAt?: string;
  provider: string;
}
