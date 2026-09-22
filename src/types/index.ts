export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  currentWorkspaceId: string;
  plan?: 'free' | 'pro' | 'enterprise';
  isSaaSUser?: boolean;
  isSaaSAdmin?: boolean;
  companyName?: string;
  roleTitle?: string;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  status: 'ACTIVE' | 'PENDING';
  invitedAt: string;
  joinedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  type: 'PERSONAL' | 'TEAM';
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql' | 'json';

export interface FormDataItem extends KeyValueItem {
  type: 'text' | 'file';
}

export interface BodyConfig {
  type: BodyType;
  rawText: string;
  rawType: 'text/plain' | 'application/json' | 'application/xml' | 'text/html';
  formData: FormDataItem[];
  urlEncoded: KeyValueItem[];
}

export type AuthType = 'none' | 'inherit' | 'bearer' | 'basic' | 'apiKey' | 'oauth2';

export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyAddTo?: 'header' | 'query';
  // OAuth 2.0 Flow Properties
  oauth2GrantType?: 'client_credentials' | 'authorization_code' | 'password' | 'refresh_token';
  oauth2AccessTokenUrl?: string;
  oauth2ClientId?: string;
  oauth2ClientSecret?: string;
  oauth2Scope?: string;
  oauth2Audience?: string;
  oauth2AuthUrl?: string;
  oauth2CallbackUrl?: string;
  oauth2Username?: string;
  oauth2Password?: string;
  oauth2RefreshToken?: string;
  oauth2HeaderPrefix?: string;
  oauth2ClientAuth?: 'body' | 'basic';
  oauth2Token?: string;
  oauth2TokenType?: string;
  oauth2ExpiresIn?: number;
  oauth2ExpiresAt?: number;
  oauth2LastRetrievedAt?: string;
  oauth2RawResponse?: string;
}

export interface ApiRequest {
  id: string;
  collectionId: string;
  folderId?: string | null;
  name: string;
  description?: string;
  method: HttpMethod;
  url: string;
  params: KeyValueItem[];
  headers: KeyValueItem[];
  body: BodyConfig;
  auth: AuthConfig;
  testsScript?: string;
  preRequestScript?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentFolderId?: string | null;
  name: string;
  description?: string;
  requests: ApiRequest[];
  subFolders?: Folder[];
  createdAt: string;
}

export interface Collection {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  folders: Folder[];
  requests: ApiRequest[];
  auth?: AuthConfig;
  variables?: Variable[];
  isLinkSharingEnabled?: boolean;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Variable {
  id: string;
  key: string;
  value: string;
  initialValue?: string;
  enabled: boolean;
  isSecret?: boolean;
  description?: string;
}

export interface Environment {
  id: string;
  workspaceId?: string; // If undefined, it's global
  name: string;
  isGlobal?: boolean;
  variables: Variable[];
  createdAt: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  executionTimeMs?: number;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  time: number; // in ms
  size: number; // in bytes
  headers: Record<string, string>;
  data: any;
  rawBody: string;
  timestamp: string;
  testResults: TestResult[];
  isCorsError?: boolean;
  isProxied?: boolean;
  targetUrl?: string;
}

export interface ActivityLog {
  id: string;
  workspaceId: string;
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  action: 'CREATED_REQUEST' | 'UPDATED_REQUEST' | 'DELETED_REQUEST' | 'EXECUTED_REQUEST' | 'CREATED_COLLECTION' | 'INVITED_MEMBER' | 'CHANGED_ROLE' | 'SWITCHED_ENVIRONMENT';
  targetName: string;
  targetType: 'request' | 'collection' | 'member' | 'environment' | 'workspace';
  details?: string;
  timestamp: string;
}

export * from './saas';

export interface TabItem {
  id: string;
  type: 'request' | 'collection_runner' | 'environment_manager' | 'architecture' | 'activity_logs' | 'saas_users' | 'saas_reports' | 'register' | 'websocket' | 'mock_server' | 'graphql' | 'monitor' | 'sse' | 'grpc' | 'collection_docs' | 'diff_viewer';
  title: string;
  method?: HttpMethod;
  requestId?: string;
  collectionId?: string;
  isDirty?: boolean;
  lastStatusCode?: number;
  lastStatusText?: string;
  isLoading?: boolean;
}

export interface WebSocketMessage {
  id: string;
  direction: 'in' | 'out';
  content: string;
  timestamp: string;
  type: 'text' | 'json' | 'binary' | 'ping' | 'pong';
  sizeBytes?: number;
}

export interface MockEndpoint {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  responseStatus: number;
  responseDelayMs: number;
  responseHeaders: KeyValueItem[];
  responseBody: string;
  hitCount: number;
  lastHitAt?: string;
  enabled: boolean;
}

export interface MockServer {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  port?: number;
  baseUrl: string;
  endpoints: MockEndpoint[];
  createdAt: string;
}

export interface MonitorRunRecord {
  id: string;
  monitorId: string;
  timestamp: string;
  status: 'passed' | 'failed' | 'error';
  totalRequests: number;
  passedTests: number;
  failedTests: number;
  avgResponseTimeMs: number;
  details?: string;
}

export interface CollectionMonitor {
  id: string;
  collectionId: string;
  workspaceId: string;
  name: string;
  environmentId?: string;
  schedule: '5m' | '15m' | '1h' | '6h' | '1d';
  status: 'active' | 'paused';
  createdAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'passed' | 'failed' | 'error';
  history: MonitorRunRecord[];
}

export interface ActivePresence {
  userId: string;
  name: string;
  avatar: string;
  color: string;
  currentAction: string;
  activeRequestId?: string;
}

export interface RecentRequest {
  id: string;
  requestId: string;
  collectionId: string;
  name: string;
  method: HttpMethod;
  url: string;
  status?: number;
  statusText?: string;
  time?: number;
  size?: number;
  executedAt: string;
  requestSnapshot: ApiRequest;
  responseSnapshot?: ApiResponse;
}
