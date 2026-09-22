import { AuthConfig, Variable } from '../types';
import { interpolateString } from './variableService';
import { getApiUrl } from '../config';

export interface OAuth2TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  refresh_token?: string;
  [key: string]: any;
}

export interface OAuth2TokenResult {
  success: boolean;
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt?: number;
  scope?: string;
  refreshToken?: string;
  rawResponse?: any;
  error?: string;
  errorDescription?: string;
  latencyMs?: number;
}

export interface OAuth2Preset {
  id: string;
  name: string;
  provider: string;
  accessTokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  audience?: string;
  grantType: 'client_credentials' | 'password' | 'refresh_token' | 'authorization_code';
  clientAuth: 'body' | 'basic';
  description: string;
}

export const OAUTH2_PRESETS: OAuth2Preset[] = [
  {
    id: 'mock_server',
    name: 'Built-in Mock OAuth2 Server (Instant Test)',
    provider: 'CloudPost Mock Engine',
    accessTokenUrl: '/api/oauth2/token',
    clientId: 'cloudpost_client_app',
    clientSecret: 'cp_sec_9942a40fb68e920d',
    scope: 'read:users write:data offline_access',
    grantType: 'client_credentials',
    clientAuth: 'body',
    description: 'Instant zero-configuration token retrieval for sandbox testing without external credentials.'
  },
  {
    id: 'auth0_m2m',
    name: 'Auth0 Machine-to-Machine (M2M)',
    provider: 'Auth0',
    accessTokenUrl: 'https://{{tenant}}.us.auth0.com/oauth/token',
    clientId: '{{auth0ClientId}}',
    clientSecret: '{{auth0ClientSecret}}',
    audience: 'https://my-api.company.com/v1',
    grantType: 'client_credentials',
    clientAuth: 'body',
    description: 'Standard Auth0 Client Credentials grant with API audience parameter.'
  },
  {
    id: 'google_oauth',
    name: 'Google OAuth 2.0 Token Endpoint',
    provider: 'Google Identity',
    accessTokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: '{{googleClientId}}',
    clientSecret: '{{googleClientSecret}}',
    scope: 'https://www.googleapis.com/auth/userinfo.profile',
    grantType: 'client_credentials',
    clientAuth: 'body',
    description: 'Google Identity services token exchange.'
  },
  {
    id: 'azure_ad',
    name: 'Microsoft Entra ID (Azure AD)',
    provider: 'Microsoft',
    accessTokenUrl: 'https://login.microsoftonline.com/{{tenantId}}/oauth2/v2.0/token',
    clientId: '{{azureClientId}}',
    clientSecret: '{{azureClientSecret}}',
    scope: 'https://graph.microsoft.com/.default',
    grantType: 'client_credentials',
    clientAuth: 'body',
    description: 'Microsoft Identity platform client credentials flow.'
  },
  {
    id: 'github_oauth',
    name: 'GitHub OAuth Apps Token Exchange',
    provider: 'GitHub',
    accessTokenUrl: 'https://github.com/login/oauth/access_token',
    clientId: '{{githubClientId}}',
    clientSecret: '{{githubClientSecret}}',
    scope: 'repo user',
    grantType: 'client_credentials',
    clientAuth: 'body',
    description: 'GitHub OAuth token request.'
  }
];

export async function requestOAuth2Token(
  auth: AuthConfig,
  variables: Variable[] = []
): Promise<OAuth2TokenResult> {
  const start = performance.now();

  const resolve = (val?: string) => {
    if (!val) return '';
    const { resolved } = interpolateString(val, variables);
    return resolved;
  };

  const targetTokenUrl = resolve(auth.oauth2AccessTokenUrl).trim();
  const clientId = resolve(auth.oauth2ClientId).trim();
  const clientSecret = resolve(auth.oauth2ClientSecret).trim();
  const scope = resolve(auth.oauth2Scope).trim();
  const audience = resolve(auth.oauth2Audience).trim();
  const username = resolve(auth.oauth2Username).trim();
  const password = resolve(auth.oauth2Password).trim();
  const refreshToken = resolve(auth.oauth2RefreshToken).trim();
  const grantType = auth.oauth2GrantType || 'client_credentials';
  const clientAuth = auth.oauth2ClientAuth || 'body';

  if (!targetTokenUrl) {
    return {
      success: false,
      error: 'Missing Access Token URL',
      errorDescription: 'Please specify the OAuth 2.0 Access Token URL.'
    };
  }

  try {
    const payload = {
      targetTokenUrl,
      clientId,
      clientSecret,
      grantType,
      scope,
      audience,
      username,
      password,
      refreshToken,
      clientAuth
    };

    const res = await fetch(getApiUrl('/api/oauth2/token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const elapsed = Math.round(performance.now() - start);
    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
        errorDescription: data.error_description || data.message || 'Token retrieval failed',
        rawResponse: data,
        latencyMs: elapsed
      };
    }

    const token = data.access_token || data.token || data.id_token;
    if (!token) {
      return {
        success: false,
        error: 'invalid_response',
        errorDescription: 'The authorization server response did not contain an access_token field.',
        rawResponse: data,
        latencyMs: elapsed
      };
    }

    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : undefined;
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;

    return {
      success: true,
      accessToken: token,
      tokenType: data.token_type || 'Bearer',
      expiresIn,
      expiresAt,
      scope: data.scope,
      refreshToken: data.refresh_token,
      rawResponse: data,
      latencyMs: elapsed
    };
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - start);
    return {
      success: false,
      error: 'network_error',
      errorDescription: err.message || 'Network error while contacting token server',
      latencyMs: elapsed
    };
  }
}
