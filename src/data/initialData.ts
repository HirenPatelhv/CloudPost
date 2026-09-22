import { Workspace, Collection, Environment, User, ActivityLog, ActivePresence, RecentRequest } from '../types';

export const CURRENT_USER: User = {
  id: 'usr_hiren_101',
  name: 'Hiren Patel',
  email: 'hirenpatelhv@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  currentWorkspaceId: 'ws_default_workspace',
  plan: 'enterprise',
  isSaaSUser: true,
  isSaaSAdmin: true,
  companyName: 'CloudPost Enterprise Labs',
  roleTitle: 'Workspace Admin & Architect',
};

export const INITIAL_PRESENCE: ActivePresence[] = [
  {
    userId: 'usr_hiren_101',
    name: 'Hiren Patel (You)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    color: '#f97316',
    currentAction: 'Active in Workspace',
  },
];

export const VALID_COLLECTION_NAMES = [
  'My Collection',
];

export function getRandomCollectionName(): string {
  return 'My Collection';
}

export function createDefaultBlankWorkspace(
  userId: string = 'usr_default',
  userName: string = 'My Workspace',
  workspaceName?: string
): Workspace {
  const wsId = 'ws_default_' + Math.random().toString(36).substring(2, 8);
  const finalName = workspaceName || (userName.includes('Workspace') ? userName : `${userName}'s Workspace`);
  return {
    id: wsId,
    name: finalName,
    description: 'Personal workspace for API development and testing.',
    type: 'PERSONAL',
    ownerId: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        userId,
        name: userName,
        email: `${userId}@cloudpost.io`,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        role: 'ADMIN',
        status: 'ACTIVE',
        invitedAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
      },
    ],
  };
}

export function createDefaultBlankCollection(workspaceId: string, name?: string): Collection {
  return {
    id: 'col_' + Math.random().toString(36).substring(2, 9),
    workspaceId,
    name: name || getRandomCollectionName(),
    description: 'Clean blank collection ready for folders and HTTP requests.',
    folders: [],
    requests: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'ws_default_workspace',
    name: 'My Workspace',
    description: 'Personal workspace for API exploration, testing, and debugging.',
    type: 'PERSONAL',
    ownerId: 'usr_hiren_101',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        userId: 'usr_hiren_101',
        name: 'Hiren Patel',
        email: 'hirenpatelhv@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        role: 'ADMIN',
        status: 'ACTIVE',
        invitedAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
      },
    ],
  },
];

export const INITIAL_ENVIRONMENTS: Environment[] = [
  {
    id: 'env_dev',
    workspaceId: 'ws_default_workspace',
    name: 'Development',
    variables: [
      { id: 'v1', key: 'baseUrl', value: 'https://httpbin.org', initialValue: 'https://httpbin.org', enabled: true, description: 'Default API host' },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'env_global',
    name: 'Globals',
    isGlobal: true,
    variables: [
      { id: 'vg1', key: 'appName', value: 'CloudPost Studio', initialValue: 'CloudPost Studio', enabled: true, description: 'Application name' },
    ],
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'col_init_blank',
    workspaceId: 'ws_default_workspace',
    name: 'My Collection',
    description: 'API collection ready for requests and folders.',
    folders: [],
    requests: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];
export const INITIAL_RECENT_REQUESTS: RecentRequest[] = [];
