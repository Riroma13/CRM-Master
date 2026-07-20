export interface OAuthConfig {
  clientId: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
}

export interface ApiKeyConfig {
  headerName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}
