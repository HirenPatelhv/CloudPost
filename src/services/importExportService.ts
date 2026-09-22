import { 
  Workspace, 
  Collection, 
  Environment, 
  ApiRequest, 
  Folder, 
  Variable, 
  ActivityLog, 
  AuthConfig, 
  BodyConfig, 
  KeyValueItem, 
  HttpMethod 
} from '../types';

export type DetectedImportType = 
  | 'postman_collection_v2' 
  | 'postman_collection_v1'
  | 'postman_environment' 
  | 'postman_globals'
  | 'postman_data_dump'
  | 'cloudpost_backup' 
  | 'cloudpost_workspace' 
  | 'cloudpost_collection' 
  | 'cloudpost_environment'
  | 'unknown';

export interface ImportAnalysisResult {
  type: DetectedImportType;
  title: string;
  description: string;
  isValid: boolean;
  error?: string;
  stats: {
    collectionsCount: number;
    foldersCount: number;
    requestsCount: number;
    environmentsCount: number;
    variablesCount: number;
    workspacesCount: number;
  };
  parsedData: {
    workspaces?: Workspace[];
    collections?: Collection[];
    environments?: Environment[];
    activityLogs?: ActivityLog[];
  };
  previewTree?: {
    name: string;
    type: 'collection' | 'environment' | 'workspace' | 'folder' | 'request';
    subtitle?: string;
    children?: any[];
  }[];
}

// ----------------------------------------------------
// HELPER: Generate clean IDs
// ----------------------------------------------------
function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

// ----------------------------------------------------
// POSTMAN PARSER UTILITIES
// ----------------------------------------------------

function parsePostmanUrl(urlObj: any): { url: string; params: KeyValueItem[] } {
  const params: KeyValueItem[] = [];

  if (typeof urlObj === 'string') {
    let cleanUrl = urlObj;
    if (urlObj.includes('?')) {
      const [base, query] = urlObj.split('?');
      cleanUrl = base;
      const searchParams = new URLSearchParams(query);
      searchParams.forEach((value, key) => {
        params.push({
          id: genId('param'),
          key,
          value,
          enabled: true,
        });
      });
    }
    return { url: urlObj, params };
  }

  if (!urlObj || typeof urlObj !== 'object') {
    return { url: 'https://api.example.com', params };
  }

  const rawUrl = urlObj.raw || '';

  // Extract query parameters from urlObj.query
  if (Array.isArray(urlObj.query)) {
    urlObj.query.forEach((q: any) => {
      params.push({
        id: genId('param'),
        key: q.key || '',
        value: q.value !== undefined ? String(q.value) : '',
        description: q.description || '',
        enabled: q.disabled !== true,
      });
    });
  } else if (rawUrl.includes('?')) {
    const [, query] = rawUrl.split('?');
    const searchParams = new URLSearchParams(query);
    searchParams.forEach((value, key) => {
      params.push({
        id: genId('param'),
        key,
        value,
        enabled: true,
      });
    });
  }

  return {
    url: rawUrl || 'https://api.example.com',
    params,
  };
}

function parsePostmanHeaders(headersObj: any): KeyValueItem[] {
  if (!Array.isArray(headersObj)) return [];

  return headersObj.map((h: any) => ({
    id: genId('hdr'),
    key: h.key || '',
    value: h.value !== undefined ? String(h.value) : '',
    description: h.description || '',
    enabled: h.disabled !== true,
  }));
}

function parsePostmanAuth(authObj: any): AuthConfig {
  if (!authObj || typeof authObj !== 'object') {
    return { type: 'none' };
  }

  const authType = authObj.type;

  if (authType === 'bearer') {
    const bearerArr = authObj.bearer || [];
    const tokenObj = Array.isArray(bearerArr) 
      ? bearerArr.find((b: any) => b.key === 'token') 
      : null;
    return {
      type: 'bearer',
      bearerToken: tokenObj ? tokenObj.value : (typeof bearerArr === 'string' ? bearerArr : ''),
    };
  }

  if (authType === 'basic') {
    const basicArr = authObj.basic || [];
    let username = '';
    let password = '';
    if (Array.isArray(basicArr)) {
      const u = basicArr.find((b: any) => b.key === 'username');
      const p = basicArr.find((b: any) => b.key === 'password');
      if (u) username = u.value;
      if (p) password = p.value;
    }
    return {
      type: 'basic',
      basicUsername: username,
      basicPassword: password,
    };
  }

  if (authType === 'apikey') {
    const apiArr = authObj.apikey || [];
    let keyName = '';
    let keyValue = '';
    let inWhere: 'header' | 'query' = 'header';
    if (Array.isArray(apiArr)) {
      const k = apiArr.find((b: any) => b.key === 'key');
      const v = apiArr.find((b: any) => b.key === 'value');
      const w = apiArr.find((b: any) => b.key === 'in');
      if (k) keyName = k.value;
      if (v) keyValue = v.value;
      if (w && (w.value === 'query' || w.value === 'header')) inWhere = w.value;
    }
    return {
      type: 'apiKey',
      apiKeyName: keyName,
      apiKeyValue: keyValue,
      apiKeyAddTo: inWhere,
    };
  }

  if (authType === 'oauth2') {
    const oauthArr = authObj.oauth2 || [];
    let token = '';
    let tokenUrl = '';
    let clientId = '';
    let clientSecret = '';
    let scope = '';
    let grantType: any = 'client_credentials';
    let headerPrefix = 'Bearer';

    if (Array.isArray(oauthArr)) {
      const getVal = (k: string) => {
        const item = oauthArr.find((x: any) => x.key === k);
        return item ? item.value : '';
      };
      token = getVal('accessToken') || getVal('token');
      tokenUrl = getVal('accessTokenUrl');
      clientId = getVal('clientId');
      clientSecret = getVal('clientSecret');
      scope = getVal('scope');
      grantType = getVal('grant_type') || 'client_credentials';
      headerPrefix = getVal('headerPrefix') || 'Bearer';
    }

    return {
      type: 'oauth2',
      oauth2Token: token,
      oauth2AccessTokenUrl: tokenUrl,
      oauth2ClientId: clientId,
      oauth2ClientSecret: clientSecret,
      oauth2Scope: scope,
      oauth2GrantType: grantType,
      oauth2HeaderPrefix: headerPrefix,
      bearerToken: token
    };
  }

  if (authType === 'noauth' || !authType) {
    return { type: 'none' };
  }

  return { type: 'none' };
}

function parsePostmanBody(bodyObj: any): BodyConfig {
  const defaultBody: BodyConfig = {
    type: 'none',
    rawText: '',
    rawType: 'application/json',
    formData: [],
    urlEncoded: [],
  };

  if (!bodyObj || typeof bodyObj !== 'object') {
    return defaultBody;
  }

  const mode = bodyObj.mode;

  if (mode === 'raw') {
    const rawLanguage = bodyObj.options?.raw?.language || 'json';
    let rawType: 'application/json' | 'text/plain' | 'application/xml' | 'text/html' = 'application/json';
    if (rawLanguage === 'json') rawType = 'application/json';
    else if (rawLanguage === 'xml') rawType = 'application/xml';
    else if (rawLanguage === 'html') rawType = 'text/html';
    else rawType = 'text/plain';

    return {
      type: 'raw',
      rawText: typeof bodyObj.raw === 'string' ? bodyObj.raw : JSON.stringify(bodyObj.raw, null, 2),
      rawType,
      formData: [],
      urlEncoded: [],
    };
  }

  if (mode === 'urlencoded') {
    const urlEncoded: KeyValueItem[] = Array.isArray(bodyObj.urlencoded)
      ? bodyObj.urlencoded.map((u: any) => ({
          id: genId('urlenc'),
          key: u.key || '',
          value: u.value !== undefined ? String(u.value) : '',
          description: u.description || '',
          enabled: u.disabled !== true,
        }))
      : [];

    return {
      type: 'x-www-form-urlencoded',
      rawText: '',
      rawType: 'application/json',
      formData: [],
      urlEncoded,
    };
  }

  if (mode === 'formdata') {
    const formData: any[] = Array.isArray(bodyObj.formdata)
      ? bodyObj.formdata.map((f: any) => ({
          id: genId('fdata'),
          key: f.key || '',
          value: f.value !== undefined ? String(f.value) : '',
          description: f.description || '',
          enabled: f.disabled !== true,
          type: f.type === 'file' ? 'file' : 'text',
        }))
      : [];

    return {
      type: 'form-data',
      rawText: '',
      rawType: 'application/json',
      formData,
      urlEncoded: [],
    };
  }

  if (mode === 'graphql') {
    return {
      type: 'json',
      rawText: JSON.stringify({
        query: bodyObj.graphql?.query || '',
        variables: bodyObj.graphql?.variables ? JSON.parse(bodyObj.graphql.variables) : {},
      }, null, 2),
      rawType: 'application/json',
      formData: [],
      urlEncoded: [],
    };
  }

  return defaultBody;
}

function parsePostmanEvents(events: any[]): { testsScript: string; preRequestScript: string } {
  let testsScript = '';
  let preRequestScript = '';

  if (!Array.isArray(events)) return { testsScript, preRequestScript };

  events.forEach((ev: any) => {
    if (ev.listen === 'test' && ev.script?.exec) {
      const code = Array.isArray(ev.script.exec) ? ev.script.exec.join('\n') : String(ev.script.exec);
      testsScript += (testsScript ? '\n\n' : '') + code;
    } else if (ev.listen === 'prerequest' && ev.script?.exec) {
      const code = Array.isArray(ev.script.exec) ? ev.script.exec.join('\n') : String(ev.script.exec);
      preRequestScript += (preRequestScript ? '\n\n' : '') + code;
    }
  });

  return { testsScript, preRequestScript };
}

function parsePostmanVariables(varArray: any[]): Variable[] {
  if (!Array.isArray(varArray)) return [];

  return varArray.map((v: any) => ({
    id: genId('var'),
    key: v.key || '',
    value: v.value !== undefined ? String(v.value) : '',
    initialValue: v.value !== undefined ? String(v.value) : '',
    enabled: v.disabled !== true,
    isSecret: v.type === 'secret',
    description: v.description || '',
  })).filter(v => Boolean(v.key));
}

// Recursively parse Postman collection items (folders & requests)
function parsePostmanItemTree(
  items: any[], 
  collectionId: string, 
  parentFolderId?: string | null
): { folders: Folder[]; requests: ApiRequest[] } {
  const folders: Folder[] = [];
  const requests: ApiRequest[] = [];

  if (!Array.isArray(items)) return { folders, requests };

  items.forEach(item => {
    // If it has an 'item' array, it is a Folder
    if (Array.isArray(item.item)) {
      const folderId = genId('fld');
      const sub = parsePostmanItemTree(item.item, collectionId, folderId);
      
      const folder: Folder = {
        id: folderId,
        collectionId,
        parentFolderId: parentFolderId || null,
        name: item.name || 'Untitled Folder',
        description: typeof item.description === 'string' ? item.description : item.description?.content || '',
        requests: sub.requests,
        subFolders: sub.folders,
        createdAt: new Date().toISOString(),
      };
      folders.push(folder);
    } else if (item.request) {
      // It is a Request
      const reqObj = item.request;
      const method = (typeof reqObj.method === 'string' ? reqObj.method.toUpperCase() : 'GET') as HttpMethod;
      const { url, params } = parsePostmanUrl(reqObj.url);
      const headers = parsePostmanHeaders(reqObj.header);
      const auth = parsePostmanAuth(reqObj.auth);
      const body = parsePostmanBody(reqObj.body);
      const { testsScript, preRequestScript } = parsePostmanEvents(item.event);

      const request: ApiRequest = {
        id: genId('req'),
        collectionId,
        folderId: parentFolderId || null,
        name: item.name || 'Untitled Request',
        description: typeof reqObj.description === 'string' ? reqObj.description : reqObj.description?.content || '',
        method,
        url,
        params,
        headers,
        body,
        auth,
        testsScript: testsScript || undefined,
        preRequestScript: preRequestScript || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      requests.push(request);
    }
  });

  return { folders, requests };
}

// ----------------------------------------------------
// ANALYZE IMPORT CONTENT
// ----------------------------------------------------

export function analyzeImportContent(
  rawContent: string, 
  targetWorkspaceId: string = 'ws_default'
): ImportAnalysisResult {
  const emptyResult: ImportAnalysisResult = {
    type: 'unknown',
    title: 'Unknown File Format',
    description: 'The uploaded file does not match a supported Postman or CloudPost format.',
    isValid: false,
    stats: {
      collectionsCount: 0,
      foldersCount: 0,
      requestsCount: 0,
      environmentsCount: 0,
      variablesCount: 0,
      workspacesCount: 0,
    },
    parsedData: {},
  };

  if (!rawContent || !rawContent.trim()) {
    return { ...emptyResult, error: 'Empty file content.' };
  }

  let json: any;
  try {
    json = JSON.parse(rawContent);
  } catch (err: any) {
    return {
      ...emptyResult,
      error: `Invalid JSON syntax: ${err.message || 'Parse error'}`,
    };
  }

  // 1. Check for CloudPost Full Backup
  if (json.format === 'cloudpost_backup' || (Array.isArray(json.workspaces) && Array.isArray(json.collections))) {
    const workspaces: Workspace[] = json.workspaces || [];
    const collections: Collection[] = json.collections || [];
    const environments: Environment[] = json.environments || [];
    const activityLogs: ActivityLog[] = json.activityLogs || [];

    let totalRequests = 0;
    let totalFolders = 0;
    let totalVariables = 0;

    collections.forEach(col => {
      totalRequests += (col.requests || []).length;
      totalFolders += (col.folders || []).length;
      totalVariables += (col.variables || []).length;
      (col.folders || []).forEach(f => {
        totalRequests += (f.requests || []).length;
      });
    });

    environments.forEach(e => {
      totalVariables += (e.variables || []).length;
    });

    return {
      type: 'cloudpost_backup',
      title: 'CloudPost Full Application Backup',
      description: `Complete system backup containing ${workspaces.length} workspace(s), ${collections.length} collection(s), and ${environments.length} environment(s).`,
      isValid: true,
      stats: {
        workspacesCount: workspaces.length,
        collectionsCount: collections.length,
        foldersCount: totalFolders,
        requestsCount: totalRequests,
        environmentsCount: environments.length,
        variablesCount: totalVariables,
      },
      parsedData: {
        workspaces,
        collections,
        environments,
        activityLogs,
      },
      previewTree: [
        {
          name: 'Workspaces',
          type: 'workspace',
          subtitle: `${workspaces.length} workspaces`,
          children: workspaces.map(w => ({ name: w.name, subtitle: `${w.type} Workspace` })),
        },
        {
          name: 'Collections',
          type: 'collection',
          subtitle: `${collections.length} collections`,
          children: collections.map(c => ({ name: c.name, subtitle: `${c.requests?.length || 0} requests` })),
        },
        {
          name: 'Environments',
          type: 'environment',
          subtitle: `${environments.length} environments`,
          children: environments.map(e => ({ name: e.name, subtitle: `${e.variables?.length || 0} variables` })),
        },
      ],
    };
  }

  // 2. Check for CloudPost Single Workspace
  if (json.format === 'cloudpost_workspace' || (json.workspace && Array.isArray(json.collections))) {
    const ws: Workspace = json.workspace || {
      id: genId('ws'),
      name: json.name || 'Imported Workspace',
      description: '',
      type: 'TEAM',
      ownerId: 'usr_current',
      members: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const collections: Collection[] = (json.collections || []).map((c: any) => ({
      ...c,
      workspaceId: ws.id,
    }));
    const environments: Environment[] = (json.environments || []).map((e: any) => ({
      ...e,
      workspaceId: e.isGlobal ? undefined : ws.id,
    }));

    let totalRequests = 0;
    collections.forEach(col => {
      totalRequests += (col.requests || []).length;
      (col.folders || []).forEach(f => {
        totalRequests += (f.requests || []).length;
      });
    });

    return {
      type: 'cloudpost_workspace',
      title: `CloudPost Workspace: ${ws.name}`,
      description: `Workspace package with ${collections.length} collection(s) and ${environments.length} environment(s).`,
      isValid: true,
      stats: {
        workspacesCount: 1,
        collectionsCount: collections.length,
        foldersCount: collections.reduce((acc, c) => acc + (c.folders?.length || 0), 0),
        requestsCount: totalRequests,
        environmentsCount: environments.length,
        variablesCount: environments.reduce((acc, e) => acc + (e.variables?.length || 0), 0),
      },
      parsedData: {
        workspaces: [ws],
        collections,
        environments,
      },
      previewTree: collections.map(c => ({
        name: c.name,
        type: 'collection',
        subtitle: `${c.requests?.length || 0} requests, ${c.folders?.length || 0} folders`,
      })),
    };
  }

  // 3. Check for CloudPost Single Collection
  if (json.format === 'cloudpost_collection' || (json.name && Array.isArray(json.folders) && Array.isArray(json.requests))) {
    const collection: Collection = {
      id: genId('col'),
      workspaceId: targetWorkspaceId,
      name: json.name || 'Imported Collection',
      description: json.description || '',
      folders: json.folders || [],
      requests: json.requests || [],
      auth: json.auth || { type: 'none' },
      variables: json.variables || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let totalRequests = collection.requests.length;
    collection.folders.forEach(f => {
      totalRequests += (f.requests || []).length;
    });

    return {
      type: 'cloudpost_collection',
      title: `CloudPost Collection: ${collection.name}`,
      description: `Native CloudPost collection containing ${totalRequests} request(s) and ${collection.folders.length} folder(s).`,
      isValid: true,
      stats: {
        workspacesCount: 0,
        collectionsCount: 1,
        foldersCount: collection.folders.length,
        requestsCount: totalRequests,
        environmentsCount: 0,
        variablesCount: collection.variables?.length || 0,
      },
      parsedData: {
        collections: [collection],
      },
      previewTree: [
        {
          name: collection.name,
          type: 'collection',
          subtitle: `${totalRequests} requests, ${collection.folders.length} folders`,
          children: [
            ...collection.requests.map(r => ({ name: `${r.method} ${r.name}`, type: 'request' as const })),
            ...collection.folders.map(f => ({ name: f.name, type: 'folder' as const, subtitle: `${f.requests?.length || 0} requests` })),
          ],
        },
      ],
    };
  }

  // 4. Check for Postman Collection v2.0 or v2.1
  const isPostmanV2 = json.info && (
    typeof json.info.schema === 'string' && json.info.schema.includes('collection') ||
    Boolean(json.info.name && Array.isArray(json.item))
  );

  if (isPostmanV2) {
    const colId = genId('col_pm');
    const colName = json.info.name || 'Imported Postman Collection';
    const colDesc = typeof json.info.description === 'string' 
      ? json.info.description 
      : json.info.description?.content || '';
    const colVariables = parsePostmanVariables(json.variable);
    const colAuth = parsePostmanAuth(json.auth);

    const { folders, requests } = parsePostmanItemTree(json.item || [], colId, null);

    const collection: Collection = {
      id: colId,
      workspaceId: targetWorkspaceId,
      name: colName,
      description: colDesc,
      folders,
      requests,
      auth: colAuth,
      variables: colVariables,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let totalRequests = requests.length;
    folders.forEach(f => {
      totalRequests += (f.requests || []).length;
    });

    const previewTree = [
      {
        name: colName,
        type: 'collection' as const,
        subtitle: `${totalRequests} requests, ${folders.length} folders, ${colVariables.length} collection variables`,
        children: [
          ...folders.map(f => ({
            name: `📁 ${f.name}`,
            type: 'folder' as const,
            subtitle: `${f.requests?.length || 0} requests`,
            children: f.requests.map(r => ({ name: `${r.method} ${r.name}`, type: 'request' as const })),
          })),
          ...requests.map(r => ({
            name: `${r.method} ${r.name}`,
            type: 'request' as const,
            subtitle: r.url,
          })),
        ],
      },
    ];

    return {
      type: 'postman_collection_v2',
      title: `Postman Collection: ${colName}`,
      description: `Official Postman v2 collection format with ${totalRequests} request(s), ${folders.length} folder(s), and ${colVariables.length} variable(s).`,
      isValid: true,
      stats: {
        workspacesCount: 0,
        collectionsCount: 1,
        foldersCount: folders.length,
        requestsCount: totalRequests,
        environmentsCount: 0,
        variablesCount: colVariables.length,
      },
      parsedData: {
        collections: [collection],
      },
      previewTree,
    };
  }

  // 5. Check for Postman Environment
  const isPostmanEnv = Boolean(
    (json.name && Array.isArray(json.values)) ||
    json._postman_variable_scope === 'environment' ||
    json._postman_exported_at
  );

  if (isPostmanEnv && json._postman_variable_scope !== 'globals') {
    const envName = json.name || 'Imported Postman Environment';
    const envVars: Variable[] = (json.values || []).map((v: any) => ({
      id: genId('var'),
      key: v.key || '',
      value: v.value !== undefined ? String(v.value) : '',
      initialValue: v.value !== undefined ? String(v.value) : '',
      enabled: v.enabled !== false,
      isSecret: v.type === 'secret',
    })).filter((v: Variable) => Boolean(v.key));

    const environment: Environment = {
      id: genId('env_pm'),
      workspaceId: targetWorkspaceId,
      name: envName,
      isGlobal: false,
      variables: envVars,
      createdAt: new Date().toISOString(),
    };

    return {
      type: 'postman_environment',
      title: `Postman Environment: ${envName}`,
      description: `Postman environment file containing ${envVars.length} environment variable(s).`,
      isValid: true,
      stats: {
        workspacesCount: 0,
        collectionsCount: 0,
        foldersCount: 0,
        requestsCount: 0,
        environmentsCount: 1,
        variablesCount: envVars.length,
      },
      parsedData: {
        environments: [environment],
      },
      previewTree: [
        {
          name: envName,
          type: 'environment',
          subtitle: `${envVars.length} variables`,
          children: envVars.map(v => ({
            name: `{{${v.key}}}`,
            type: 'environment' as const,
            subtitle: v.isSecret ? '•••••••• (secret)' : v.value,
          })),
        },
      ],
    };
  }

  // 6. Check for Postman Globals
  if (json._postman_variable_scope === 'globals' || json.name === 'Globals' && Array.isArray(json.values)) {
    const globalVars: Variable[] = (json.values || []).map((v: any) => ({
      id: genId('var_g'),
      key: v.key || '',
      value: v.value !== undefined ? String(v.value) : '',
      initialValue: v.value !== undefined ? String(v.value) : '',
      enabled: v.enabled !== false,
      isSecret: v.type === 'secret',
    })).filter((v: Variable) => Boolean(v.key));

    const environment: Environment = {
      id: 'env_global',
      name: 'Global Variables',
      isGlobal: true,
      variables: globalVars,
      createdAt: new Date().toISOString(),
    };

    return {
      type: 'postman_globals',
      title: 'Postman Globals Export',
      description: `Global variables file containing ${globalVars.length} variable(s).`,
      isValid: true,
      stats: {
        workspacesCount: 0,
        collectionsCount: 0,
        foldersCount: 0,
        requestsCount: 0,
        environmentsCount: 1,
        variablesCount: globalVars.length,
      },
      parsedData: {
        environments: [environment],
      },
      previewTree: [
        {
          name: 'Globals',
          type: 'environment',
          subtitle: `${globalVars.length} global variables`,
          children: globalVars.map(v => ({
            name: `{{${v.key}}}`,
            type: 'environment' as const,
            subtitle: v.value,
          })),
        },
      ],
    };
  }

  // 7. Check for Postman Bulk Data Dump (Collections + Environments array)
  if (Array.isArray(json.collections) || Array.isArray(json.environments)) {
    const parsedCollections: Collection[] = [];
    const parsedEnvironments: Environment[] = [];

    if (Array.isArray(json.collections)) {
      json.collections.forEach((colJson: any) => {
        const colId = genId('col_pm');
        const { folders, requests } = parsePostmanItemTree(colJson.item || [], colId, null);
        parsedCollections.push({
          id: colId,
          workspaceId: targetWorkspaceId,
          name: colJson.info?.name || colJson.name || 'Imported Collection',
          description: colJson.info?.description || '',
          folders,
          requests,
          auth: parsePostmanAuth(colJson.auth),
          variables: parsePostmanVariables(colJson.variable),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    }

    if (Array.isArray(json.environments)) {
      json.environments.forEach((envJson: any) => {
        parsedEnvironments.push({
          id: genId('env_pm'),
          workspaceId: targetWorkspaceId,
          name: envJson.name || 'Imported Environment',
          isGlobal: envJson._postman_variable_scope === 'globals',
          variables: parsePostmanVariables(envJson.values),
          createdAt: new Date().toISOString(),
        });
      });
    }

    return {
      type: 'postman_data_dump',
      title: 'Postman Data Dump',
      description: `Postman backup containing ${parsedCollections.length} collection(s) and ${parsedEnvironments.length} environment(s).`,
      isValid: true,
      stats: {
        workspacesCount: 0,
        collectionsCount: parsedCollections.length,
        foldersCount: parsedCollections.reduce((acc, c) => acc + (c.folders?.length || 0), 0),
        requestsCount: parsedCollections.reduce((acc, c) => acc + (c.requests?.length || 0), 0),
        environmentsCount: parsedEnvironments.length,
        variablesCount: parsedEnvironments.reduce((acc, e) => acc + (e.variables?.length || 0), 0),
      },
      parsedData: {
        collections: parsedCollections,
        environments: parsedEnvironments,
      },
    };
  }

  return {
    ...emptyResult,
    error: 'Unrecognized JSON structure. Please ensure this is a Postman collection/environment or a CloudPost export.',
  };
}

// ----------------------------------------------------
// POSTMAN COLLECTION V2.1 EXPORTER
// ----------------------------------------------------

export function exportCollectionToPostmanV2(collection: Collection): any {
  // Convert collection items (folders and requests) to Postman items
  function convertFolderToPostman(folder: Folder): any {
    return {
      name: folder.name,
      description: folder.description || undefined,
      item: [
        ...(folder.subFolders || []).map(convertFolderToPostman),
        ...folder.requests.map(convertRequestToPostman),
      ],
    };
  }

  function convertRequestToPostman(req: ApiRequest): any {
    // Body transformation
    let bodyObj: any = undefined;
    if (req.body.type === 'raw' || req.body.type === 'json') {
      bodyObj = {
        mode: 'raw',
        raw: req.body.rawText || '',
        options: {
          raw: {
            language: req.body.rawType === 'application/json' || req.body.type === 'json' ? 'json' : 'text',
          },
        },
      };
    } else if (req.body.type === 'x-www-form-urlencoded') {
      bodyObj = {
        mode: 'urlencoded',
        urlencoded: req.body.urlEncoded.map(u => ({
          key: u.key,
          value: u.value,
          description: u.description || undefined,
          disabled: !u.enabled,
        })),
      };
    } else if (req.body.type === 'form-data') {
      bodyObj = {
        mode: 'formdata',
        formdata: req.body.formData.map(f => ({
          key: f.key,
          value: f.value,
          description: f.description || undefined,
          type: f.type,
          disabled: !f.enabled,
        })),
      };
    }

    // Auth transformation
    let authObj: any = undefined;
    if (req.auth.type === 'bearer') {
      authObj = {
        type: 'bearer',
        bearer: [{ key: 'token', value: req.auth.bearerToken || '', type: 'string' }],
      };
    } else if (req.auth.type === 'basic') {
      authObj = {
        type: 'basic',
        basic: [
          { key: 'username', value: req.auth.basicUsername || '', type: 'string' },
          { key: 'password', value: req.auth.basicPassword || '', type: 'string' },
        ],
      };
    } else if (req.auth.type === 'apiKey') {
      authObj = {
        type: 'apikey',
        apikey: [
          { key: 'key', value: req.auth.apiKeyName || '', type: 'string' },
          { key: 'value', value: req.auth.apiKeyValue || '', type: 'string' },
          { key: 'in', value: req.auth.apiKeyAddTo || 'header', type: 'string' },
        ],
      };
    } else if (req.auth.type === 'oauth2') {
      authObj = {
        type: 'oauth2',
        oauth2: [
          { key: 'accessToken', value: req.auth.oauth2Token || req.auth.bearerToken || '', type: 'string' },
          { key: 'accessTokenUrl', value: req.auth.oauth2AccessTokenUrl || '', type: 'string' },
          { key: 'clientId', value: req.auth.oauth2ClientId || '', type: 'string' },
          { key: 'clientSecret', value: req.auth.oauth2ClientSecret || '', type: 'string' },
          { key: 'scope', value: req.auth.oauth2Scope || '', type: 'string' },
          { key: 'grant_type', value: req.auth.oauth2GrantType || 'client_credentials', type: 'string' },
          { key: 'headerPrefix', value: req.auth.oauth2HeaderPrefix || 'Bearer', type: 'string' },
        ],
      };
    }

    // Scripts / Events transformation
    const events: any[] = [];
    if (req.testsScript?.trim()) {
      events.push({
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: req.testsScript.split('\n'),
        },
      });
    }
    if (req.preRequestScript?.trim()) {
      events.push({
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: req.preRequestScript.split('\n'),
        },
      });
    }

    // URL transformation
    const queryParams = req.params.map(p => ({
      key: p.key,
      value: p.value,
      description: p.description || undefined,
      disabled: !p.enabled,
    }));

    return {
      name: req.name,
      request: {
        method: req.method,
        header: req.headers.map(h => ({
          key: h.key,
          value: h.value,
          description: h.description || undefined,
          disabled: !h.enabled,
        })),
        body: bodyObj,
        auth: authObj,
        url: {
          raw: req.url,
          query: queryParams.length > 0 ? queryParams : undefined,
        },
        description: req.description || undefined,
      },
      event: events.length > 0 ? events : undefined,
    };
  }

  return {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description || `Exported from CloudPost on ${new Date().toISOString()}`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      ...collection.folders.map(convertFolderToPostman),
      ...collection.requests.map(convertRequestToPostman),
    ],
    variable: (collection.variables || []).map(v => ({
      key: v.key,
      value: v.value,
      type: v.isSecret ? 'secret' : 'string',
      description: v.description || undefined,
      disabled: !v.enabled,
    })),
  };
}

// ----------------------------------------------------
// POSTMAN ENVIRONMENT EXPORTER
// ----------------------------------------------------

export function exportEnvironmentToPostman(env: Environment): any {
  return {
    id: env.id,
    name: env.name,
    values: env.variables.map(v => ({
      key: v.key,
      value: v.value,
      enabled: v.enabled,
      type: v.isSecret ? 'secret' : 'default',
    })),
    _postman_variable_scope: env.isGlobal ? 'globals' : 'environment',
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: 'CloudPost API Client',
  };
}

// ----------------------------------------------------
// CLOUDPOST FULL BACKUP EXPORTER
// ----------------------------------------------------

export function exportCloudPostFullBackup(
  workspaces: Workspace[],
  collections: Collection[],
  environments: Environment[],
  activityLogs: ActivityLog[]
): any {
  return {
    format: 'cloudpost_backup',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    generator: 'CloudPost Collaborative API Suite',
    workspaces,
    collections,
    environments,
    activityLogs,
  };
}

// ----------------------------------------------------
// CLOUDPOST WORKSPACE EXPORTER
// ----------------------------------------------------

export function exportCloudPostWorkspace(
  workspace: Workspace,
  collections: Collection[],
  environments: Environment[]
): any {
  const wsCollections = collections.filter(c => c.workspaceId === workspace.id);
  const wsEnvironments = environments.filter(e => e.workspaceId === workspace.id || e.isGlobal);

  return {
    format: 'cloudpost_workspace',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    workspace,
    collections: wsCollections,
    environments: wsEnvironments,
  };
}

// ----------------------------------------------------
// CLOUDPOST COLLECTION EXPORTER
// ----------------------------------------------------

export function exportCloudPostCollection(collection: Collection): any {
  return {
    format: 'cloudpost_collection',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    collection,
  };
}

// ----------------------------------------------------
// DOWNLOAD FILE HELPER
// ----------------------------------------------------

export function downloadJsonFile(filename: string, data: any) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
