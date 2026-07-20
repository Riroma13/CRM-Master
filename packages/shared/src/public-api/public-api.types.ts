export type ApiKeyScope = string; // "workflows:read" | "documents:write" | "*:admin"

export interface ApiKeyPayload {
  id: string;
  tenantId: string;
  name: string;
  scopes: ApiKeyScope[];
  expiresAt: string;
  active: boolean;
}

export interface CreateTokenResult {
  id: string;
  token: string;
  scopes: ApiKeyScope[];
  expiresAt: string;
}
