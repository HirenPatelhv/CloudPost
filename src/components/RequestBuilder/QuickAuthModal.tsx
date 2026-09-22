import React, { useState } from 'react';
import { Key, Lock, Shield, Zap, Sparkles, Check, Search, X, ArrowRight, Layers, Sliders, Globe } from 'lucide-react';
import { AuthConfig, KeyValueItem, HttpMethod, Environment } from '../../types';
import { ScopedVariable } from '../../services/variableService';

export interface QuickAuthPreset {
  id: string;
  name: string;
  category: 'OAuth 2.0' | 'API Key' | 'Bearer Token' | 'Custom';
  description: string;
  iconType: 'oauth' | 'apikey' | 'bearer' | 'shield';
  defaultVariable: string;
  authConfig: AuthConfig;
  headers?: { key: string; value: string; description?: string }[];
  params?: { key: string; value: string; description?: string }[];
  methodOverride?: HttpMethod;
  bodyTemplate?: { type: 'x-www-form-urlencoded' | 'json'; rawText?: string; urlEncoded?: { key: string; value: string }[] };
  testsScriptSnippet?: string;
  documentationUrl?: string;
}

export const QUICK_AUTH_PRESETS: QuickAuthPreset[] = [
  // --- OAuth 2.0 Workflows ---
  {
    id: 'oauth2_bearer',
    name: 'OAuth 2.0 Bearer Token (JWT)',
    category: 'OAuth 2.0',
    description: 'Standard RFC 6750 Authorization Bearer header for OAuth2 protected APIs.',
    iconType: 'oauth',
    defaultVariable: 'accessToken',
    authConfig: {
      type: 'bearer',
      bearerToken: '{{accessToken}}',
    },
    headers: [
      { key: 'Authorization', value: 'Bearer {{accessToken}}', description: 'OAuth 2.0 Access Token' }
    ],
  },
  {
    id: 'oauth2_client_credentials',
    name: 'OAuth 2.0 Client Credentials Flow',
    category: 'OAuth 2.0',
    description: 'Generates a token request for machine-to-machine OAuth2 (POST /oauth/token with client_id & client_secret).',
    iconType: 'oauth',
    defaultVariable: 'clientSecret',
    methodOverride: 'POST',
    authConfig: {
      type: 'oauth2',
      oauth2GrantType: 'client_credentials',
      oauth2AccessTokenUrl: '/api/oauth2/token',
      oauth2ClientId: '{{clientId}}',
      oauth2ClientSecret: '{{clientSecret}}',
      oauth2Scope: 'read write',
      oauth2HeaderPrefix: 'Bearer',
      oauth2ClientAuth: 'body',
    },
    headers: [
      { key: 'Content-Type', value: 'application/x-www-form-urlencoded', description: 'OAuth2 form body' },
      { key: 'Accept', value: 'application/json', description: 'JSON token response' }
    ],
    bodyTemplate: {
      type: 'x-www-form-urlencoded',
      urlEncoded: [
        { key: 'grant_type', value: 'client_credentials' },
        { key: 'client_id', value: '{{clientId}}' },
        { key: 'client_secret', value: '{{clientSecret}}' },
        { key: 'scope', value: 'read write' }
      ]
    },
    testsScriptSnippet: `// Postman OAuth 2.0 Token Extraction\npm.test("Status code is 200 OK", function () {\n    pm.response.to.have.status(200);\n});\n\npm.test("Extract and store OAuth Access Token", function () {\n    var jsonData = pm.response.json();\n    pm.expect(jsonData.access_token).to.be.a('string');\n    pm.environment.set("accessToken", jsonData.access_token);\n    console.log("OAuth2 accessToken saved to environment:", jsonData.access_token.substring(0, 10) + "...");\n});`
  },
  {
    id: 'github_pat_oauth',
    name: 'GitHub API (Personal Token / OAuth)',
    category: 'OAuth 2.0',
    description: 'GitHub REST & GraphQL API authentication with recommended API version headers.',
    iconType: 'oauth',
    defaultVariable: 'github_token',
    authConfig: {
      type: 'bearer',
      bearerToken: '{{github_token}}',
    },
    headers: [
      { key: 'Authorization', value: 'Bearer {{github_token}}', description: 'GitHub Personal Access Token' },
      { key: 'X-GitHub-Api-Version', value: '2022-11-28', description: 'GitHub API Version' },
      { key: 'Accept', value: 'application/vnd.github+json', description: 'GitHub JSON format' }
    ]
  },
  {
    id: 'google_firebase_oauth',
    name: 'Google Cloud / Firebase OAuth2',
    category: 'OAuth 2.0',
    description: 'Google Cloud Platform and Firebase Bearer authentication with project headers.',
    iconType: 'oauth',
    defaultVariable: 'google_access_token',
    authConfig: {
      type: 'bearer',
      bearerToken: '{{google_access_token}}',
    },
    headers: [
      { key: 'Authorization', value: 'Bearer {{google_access_token}}', description: 'Google OAuth2 Access Token' },
      { key: 'X-Goog-User-Project', value: '{{gcp_project_id}}', description: 'Google Cloud Project ID' }
    ]
  },
  {
    id: 'supabase_auth',
    name: 'Supabase API (JWT + Anon Key)',
    category: 'OAuth 2.0',
    description: 'Supabase PostgREST & Auth headers combining client anon key and user Bearer JWT.',
    iconType: 'oauth',
    defaultVariable: 'supabase_jwt',
    authConfig: {
      type: 'bearer',
      bearerToken: '{{supabase_jwt}}',
    },
    headers: [
      { key: 'apikey', value: '{{supabase_anon_key}}', description: 'Supabase Project Anon / Service Key' },
      { key: 'Authorization', value: 'Bearer {{supabase_jwt}}', description: 'Supabase Auth User JWT' }
    ]
  },

  // --- API Key Workflows ---
  {
    id: 'standard_x_api_key',
    name: 'Standard Header API Key (X-API-Key)',
    category: 'API Key',
    description: 'Universal custom header API key used across microservices and REST gateways.',
    iconType: 'apikey',
    defaultVariable: 'apiKey',
    authConfig: {
      type: 'apiKey',
      apiKeyName: 'X-API-Key',
      apiKeyValue: '{{apiKey}}',
      apiKeyAddTo: 'header',
    },
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'Gateway API Key' }
    ]
  },
  {
    id: 'openai_api_key',
    name: 'OpenAI API Key (Bearer sk-...)',
    category: 'API Key',
    description: 'OpenAI ChatGPT, GPT-4o, and embeddings authorization.',
    iconType: 'apikey',
    defaultVariable: 'OPENAI_API_KEY',
    authConfig: {
      type: 'bearer',
      bearerToken: '{{OPENAI_API_KEY}}',
    },
    headers: [
      { key: 'Authorization', value: 'Bearer {{OPENAI_API_KEY}}', description: 'OpenAI Secret API Key' },
      { key: 'Content-Type', value: 'application/json', description: 'JSON Payload' }
    ]
  },
  {
    id: 'anthropic_api_key',
    name: 'Anthropic Claude API Key (x-api-key)',
    category: 'API Key',
    description: 'Anthropic Claude 3.5 API header with required anthropic-version.',
    iconType: 'apikey',
    defaultVariable: 'ANTHROPIC_API_KEY',
    authConfig: {
      type: 'apiKey',
      apiKeyName: 'x-api-key',
      apiKeyValue: '{{ANTHROPIC_API_KEY}}',
      apiKeyAddTo: 'header',
    },
    headers: [
      { key: 'x-api-key', value: '{{ANTHROPIC_API_KEY}}', description: 'Anthropic API Key' },
      { key: 'anthropic-version', value: '2023-06-01', description: 'Anthropic API Version' },
      { key: 'Content-Type', value: 'application/json', description: 'JSON Payload' }
    ]
  },
  {
    id: 'stripe_secret_key',
    name: 'Stripe Secret Key (sk_test / sk_live)',
    category: 'API Key',
    description: 'Stripe Payment Gateway API Key with optional Stripe-Version header.',
    iconType: 'apikey',
    defaultVariable: 'STRIPE_SECRET_KEY',
    authConfig: {
      type: 'bearer',
      bearerToken: '{{STRIPE_SECRET_KEY}}',
    },
    headers: [
      { key: 'Authorization', value: 'Bearer {{STRIPE_SECRET_KEY}}', description: 'Stripe Secret API Key' },
      { key: 'Stripe-Version', value: '2023-10-16', description: 'Stripe API Version' }
    ]
  },
  {
    id: 'aws_api_gateway_key',
    name: 'AWS API Gateway (x-api-key)',
    category: 'API Key',
    description: 'Amazon Web Services API Gateway usage plan API key.',
    iconType: 'apikey',
    defaultVariable: 'AWS_API_KEY',
    authConfig: {
      type: 'apiKey',
      apiKeyName: 'x-api-key',
      apiKeyValue: '{{AWS_API_KEY}}',
      apiKeyAddTo: 'header',
    },
    headers: [
      { key: 'x-api-key', value: '{{AWS_API_KEY}}', description: 'AWS Gateway API Key' }
    ]
  },
  {
    id: 'rapidapi_credentials',
    name: 'RapidAPI Hub (Key & Host)',
    category: 'API Key',
    description: 'Dual-header credentials required for all RapidAPI Marketplace endpoints.',
    iconType: 'apikey',
    defaultVariable: 'RAPIDAPI_KEY',
    authConfig: {
      type: 'apiKey',
      apiKeyName: 'X-RapidAPI-Key',
      apiKeyValue: '{{RAPIDAPI_KEY}}',
      apiKeyAddTo: 'header',
    },
    headers: [
      { key: 'X-RapidAPI-Key', value: '{{RAPIDAPI_KEY}}', description: 'RapidAPI Key' },
      { key: 'X-RapidAPI-Host', value: '{{RAPIDAPI_HOST}}', description: 'RapidAPI Host Name' }
    ]
  },
  {
    id: 'query_param_api_key',
    name: 'Query Parameter Key (?api_key=...)',
    category: 'API Key',
    description: 'API Key appended directly to the URL query string (e.g. OpenWeather, Google Maps).',
    iconType: 'apikey',
    defaultVariable: 'apiKey',
    authConfig: {
      type: 'apiKey',
      apiKeyName: 'api_key',
      apiKeyValue: '{{apiKey}}',
      apiKeyAddTo: 'query',
    },
    params: [
      { key: 'api_key', value: '{{apiKey}}', description: 'API Key Query Parameter' }
    ]
  },

  // --- Bearer & Token Workflows ---
  {
    id: 'generic_bearer_jwt',
    name: 'Generic Bearer Token / JWT',
    category: 'Bearer Token',
    description: 'Standard Authorization: Bearer <token> for JWT sessions and token authentication.',
    iconType: 'bearer',
    defaultVariable: 'authToken',
    authConfig: {
      type: 'bearer',
      bearerToken: '{{authToken}}',
    },
    headers: [
      { key: 'Authorization', value: 'Bearer {{authToken}}', description: 'Bearer Authorization Header' }
    ]
  },
  {
    id: 'django_rest_token',
    name: 'Django REST Framework (Token <key>)',
    category: 'Bearer Token',
    description: 'DRF token authentication header with custom Token prefix.',
    iconType: 'bearer',
    defaultVariable: 'drf_token',
    authConfig: {
      type: 'none',
    },
    headers: [
      { key: 'Authorization', value: 'Token {{drf_token}}', description: 'Django REST Token' }
    ]
  },
  {
    id: 'basic_auth_credentials',
    name: 'Basic Auth (username : password)',
    category: 'Bearer Token',
    description: 'HTTP Basic Auth Base64 encoded credentials header.',
    iconType: 'shield',
    defaultVariable: 'password',
    authConfig: {
      type: 'basic',
      basicUsername: '{{username}}',
      basicPassword: '{{password}}',
    },
    headers: [
      { key: 'Authorization', value: 'Basic {{base64_auth}}', description: 'Basic Auth Header' }
    ]
  }
];

interface QuickAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAuth: AuthConfig;
  currentHeaders: KeyValueItem[];
  currentParams: KeyValueItem[];
  scopedVariables?: ScopedVariable[];
  environments?: Environment[];
  activeEnvId?: string;
  onApplyPreset: (options: {
    authConfig: AuthConfig;
    headersToAdd: { key: string; value: string; description?: string }[];
    paramsToAdd: { key: string; value: string; description?: string }[];
    methodOverride?: HttpMethod;
    bodyTemplate?: any;
    testsScriptSnippet?: string;
    applyMode: 'both' | 'auth_only' | 'headers_params_only';
    tokenValue?: string;
  }) => void;
  onQuickUpdateVariable?: (key: string, value: string) => void;
}

export const QuickAuthModal: React.FC<QuickAuthModalProps> = ({
  isOpen,
  onClose,
  currentAuth,
  currentHeaders,
  currentParams,
  scopedVariables = [],
  environments = [],
  activeEnvId,
  onApplyPreset,
  onQuickUpdateVariable,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreset, setActivePreset] = useState<QuickAuthPreset>(QUICK_AUTH_PRESETS[0]);
  const [applyMode, setApplyMode] = useState<'both' | 'auth_only' | 'headers_params_only'>('both');
  const [customTokenValue, setCustomTokenValue] = useState('');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  if (!isOpen) return null;

  const categories = ['All', 'OAuth 2.0', 'API Key', 'Bearer Token'];

  const filteredPresets = QUICK_AUTH_PRESETS.filter(preset => {
    const matchesCategory = selectedCategory === 'All' || preset.category === selectedCategory;
    const matchesSearch =
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleApply = () => {
    onApplyPreset({
      authConfig: activePreset.authConfig,
      headersToAdd: activePreset.headers || [],
      paramsToAdd: activePreset.params || [],
      methodOverride: activePreset.methodOverride,
      bodyTemplate: activePreset.bodyTemplate,
      testsScriptSnippet: activePreset.testsScriptSnippet,
      applyMode,
      tokenValue: customTokenValue.trim() || undefined,
    });

    // If custom token value entered and user wants to save to environment
    if (customTokenValue.trim() && activePreset.defaultVariable && onQuickUpdateVariable) {
      onQuickUpdateVariable(activePreset.defaultVariable, customTokenValue.trim());
    }

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 600);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'oauth':
        return <Zap className="w-4 h-4 text-orange-400" />;
      case 'apikey':
        return <Key className="w-4 h-4 text-emerald-400" />;
      case 'bearer':
        return <Lock className="w-4 h-4 text-blue-400" />;
      default:
        return <Shield className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#11141e] border border-white/15 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#151926]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Quick Auth Presets</span>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono text-orange-300">
                  Postman-Compatible
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                1-Click presets for OAuth2, API Keys, and Bearer tokens that automatically populate Auth & Headers/Params
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Presets list & Right Preset details */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Categories, Search, List */}
          <div className="w-full md:w-80 border-r border-white/10 flex flex-col bg-[#0d1017] min-h-0">
            {/* Search Input */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search auth presets..."
                  className="w-full bg-[#141824] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="p-2 border-b border-white/10 flex items-center gap-1 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Presets List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredPresets.map(preset => {
                const isSelected = activePreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setActivePreset(preset);
                      setCustomTokenValue('');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500/40 shadow-sm'
                        : 'bg-[#141824]/60 border-white/5 hover:border-white/15 hover:bg-[#141824]'
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-black/40 border border-white/5 shrink-0">
                      {getIcon(preset.iconType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-orange-300' : 'text-zinc-200'}`}>
                          {preset.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Preset Configuration Preview & Apply Actions */}
          <div className="flex-1 flex flex-col bg-[#11141e] overflow-y-auto p-6 space-y-5">
            {/* Active Preset Header Card */}
            <div className="p-4 rounded-xl bg-[#151926] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-black/40 border border-white/10">
                    {getIcon(activePreset.iconType)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{activePreset.name}</h3>
                    <span className="text-[10px] text-orange-400 font-mono font-medium">{activePreset.category}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-semibold">
                  Ready to Inject
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{activePreset.description}</p>
            </div>

            {/* Token / Credential Value Input */}
            <div className="p-4 rounded-xl bg-[#0d1017] border border-white/10 space-y-3">
              <label className="block text-xs font-semibold text-zinc-300">
                Credentials / Variable Placeholder:
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={customTokenValue}
                    onChange={e => setCustomTokenValue(e.target.value)}
                    placeholder={`Enter actual secret or leave empty to use {{${activePreset.defaultVariable}}}`}
                    className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>
                    Template variable:{' '}
                    <code className="text-orange-400 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                      {`{{${activePreset.defaultVariable}}}`}
                    </code>
                  </span>
                  <span className="text-[10px] text-zinc-500">Auto-resolved on Send</span>
                </div>
              </div>
            </div>

            {/* Target Auto-Population Preview */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                <span>Automatic Injections on Apply</span>
              </h4>

              {/* Headers Preview */}
              {activePreset.headers && activePreset.headers.length > 0 && (
                <div className="p-3 rounded-xl bg-[#0d1017] border border-white/10 space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
                    <span>Headers to inject:</span>
                    <span className="text-[10px] font-mono text-zinc-500">{activePreset.headers.length} header(s)</span>
                  </div>
                  <div className="space-y-1.5">
                    {activePreset.headers.map((h, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#141824] px-3 py-1.5 rounded-lg text-xs font-mono border border-white/5">
                        <span className="text-orange-300 font-semibold">{h.key}:</span>
                        <span className="text-emerald-300 truncate max-w-xs">{customTokenValue ? h.value.replace(`{{${activePreset.defaultVariable}}}`, customTokenValue) : h.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Params Preview */}
              {activePreset.params && activePreset.params.length > 0 && (
                <div className="p-3 rounded-xl bg-[#0d1017] border border-white/10 space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
                    <span>Query Parameters to inject:</span>
                    <span className="text-[10px] font-mono text-zinc-500">{activePreset.params.length} param(s)</span>
                  </div>
                  <div className="space-y-1.5">
                    {activePreset.params.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#141824] px-3 py-1.5 rounded-lg text-xs font-mono border border-white/5">
                        <span className="text-orange-300 font-semibold">?{p.key}=</span>
                        <span className="text-emerald-300 truncate max-w-xs">{customTokenValue ? p.value.replace(`{{${activePreset.defaultVariable}}}`, customTokenValue) : p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OAuth2 Body / Tests script preview if applicable */}
              {activePreset.bodyTemplate && (
                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs space-y-1">
                  <div className="font-semibold text-orange-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>OAuth2 Request Template</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Sets method to <strong className="text-white">POST</strong> with client_credentials form payload and auto-adds token extraction test script.
                  </p>
                </div>
              )}
            </div>

            {/* Application Mode Selector */}
            <div className="p-3.5 rounded-xl bg-[#0d1017] border border-white/10 space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                How should this preset be applied?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setApplyMode('both')}
                  className={`p-2.5 rounded-lg text-left border transition-all ${
                    applyMode === 'both'
                      ? 'bg-orange-500/20 border-orange-500 text-white'
                      : 'bg-[#141824] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">Both (Recommended)</div>
                  <div className="text-[10px] text-zinc-400">Update Auth tab + Inject Headers & Params</div>
                </button>

                <button
                  type="button"
                  onClick={() => setApplyMode('auth_only')}
                  className={`p-2.5 rounded-lg text-left border transition-all ${
                    applyMode === 'auth_only'
                      ? 'bg-orange-500/20 border-orange-500 text-white'
                      : 'bg-[#141824] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">Auth Tab Only</div>
                  <div className="text-[10px] text-zinc-400">Sets AuthConfig handler</div>
                </button>

                <button
                  type="button"
                  onClick={() => setApplyMode('headers_params_only')}
                  className={`p-2.5 rounded-lg text-left border transition-all ${
                    applyMode === 'headers_params_only'
                      ? 'bg-orange-500/20 border-orange-500 text-white'
                      : 'bg-[#141824] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">Explicit Headers</div>
                  <div className="text-[10px] text-zinc-400">Inserts explicit rows in table</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#151926] flex items-center justify-between">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Preset: <strong className="text-white">{activePreset.name}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {appliedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Applied Successfully!</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Apply Preset</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
