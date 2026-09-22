import React, { useState } from 'react';
import { AuthConfig, AuthType, Environment, Collection } from '../../types';
import { ScopedVariable } from '../../services/variableService';
import { VariableInput } from '../Variables/VariableInput';
import { 
  Lock, 
  Shield, 
  Key, 
  Zap, 
  Sparkles, 
  Sliders,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Globe,
  Clock,
  ExternalLink,
  Trash2,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { requestOAuth2Token, OAUTH2_PRESETS, OAuth2Preset } from '../../services/oauth2Service';

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
  disabled?: boolean;
  scopedVariables?: ScopedVariable[];
  environments?: Environment[];
  activeEnvId?: string;
  collection?: Collection;
  onRequestSetAsVariable?: (text: string) => void;
  onQuickUpdateVariable?: (key: string, value: string) => void;
  onOpenQuickAuth?: () => void;
  onSelectQuickPreset?: (presetId: string) => void;
}

export const AuthEditor: React.FC<AuthEditorProps> = ({ 
  auth, 
  onChange, 
  disabled,
  scopedVariables = [],
  environments = [],
  activeEnvId,
  collection,
  onRequestSetAsVariable,
  onQuickUpdateVariable,
  onOpenQuickAuth,
  onSelectQuickPreset,
}) => {
  const [isRetrievingToken, setIsRetrievingToken] = useState(false);
  const [tokenError, setTokenError] = useState<{ title: string; description: string; raw?: any } | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState<{ message: string; latencyMs?: number } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [savedToVar, setSavedToVar] = useState(false);

  const handleTypeChange = (type: AuthType) => {
    // If switching to oauth2, ensure default fields exist
    if (type === 'oauth2') {
      onChange({
        ...auth,
        type,
        oauth2GrantType: auth.oauth2GrantType || 'client_credentials',
        oauth2HeaderPrefix: auth.oauth2HeaderPrefix || 'Bearer',
        oauth2ClientAuth: auth.oauth2ClientAuth || 'body',
      });
    } else {
      onChange({ ...auth, type });
    }
    setTokenError(null);
    setTokenSuccess(null);
  };

  const handleUpdate = (field: keyof AuthConfig, val: any) => {
    onChange({ ...auth, [field]: val });
  };

  const handleApplyPreset = (preset: OAuth2Preset) => {
    onChange({
      ...auth,
      type: 'oauth2',
      oauth2AccessTokenUrl: preset.accessTokenUrl,
      oauth2ClientId: preset.clientId,
      oauth2ClientSecret: preset.clientSecret,
      oauth2Scope: preset.scope || '',
      oauth2Audience: preset.audience || '',
      oauth2GrantType: preset.grantType,
      oauth2ClientAuth: preset.clientAuth,
      oauth2HeaderPrefix: 'Bearer'
    });
    setTokenError(null);
    setTokenSuccess({
      message: `Loaded template: ${preset.name}`
    });
  };

  const handleInitiateTokenRetrieval = async () => {
    setIsRetrievingToken(true);
    setTokenError(null);
    setTokenSuccess(null);

    try {
      const result = await requestOAuth2Token(auth, scopedVariables);

      if (result.success && result.accessToken) {
        const updatedAuth: AuthConfig = {
          ...auth,
          oauth2Token: result.accessToken,
          oauth2TokenType: result.tokenType || 'Bearer',
          oauth2ExpiresIn: result.expiresIn,
          oauth2ExpiresAt: result.expiresAt,
          oauth2LastRetrievedAt: new Date().toISOString(),
          oauth2RawResponse: JSON.stringify(result.rawResponse, null, 2),
          bearerToken: result.accessToken, // Auto sync with bearer header
        };

        onChange(updatedAuth);
        setTokenSuccess({
          message: 'Access token acquired successfully!',
          latencyMs: result.latencyMs
        });
      } else {
        setTokenError({
          title: result.error || 'Token Retrieval Failed',
          description: result.errorDescription || 'The authorization server declined or could not process the request.',
          raw: result.rawResponse
        });
      }
    } catch (err: any) {
      setTokenError({
        title: 'Network / Client Error',
        description: err.message || 'An unexpected error occurred during token retrieval.'
      });
    } finally {
      setIsRetrievingToken(false);
    }
  };

  const handleCopyToken = () => {
    const token = auth.oauth2Token || auth.bearerToken || '';
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSaveToVariable = () => {
    const token = auth.oauth2Token || auth.bearerToken || '';
    if (!token) return;
    if (onQuickUpdateVariable) {
      onQuickUpdateVariable('accessToken', token);
      setSavedToVar(true);
      setTimeout(() => setSavedToVar(false), 2500);
    } else if (onRequestSetAsVariable) {
      onRequestSetAsVariable(token);
    }
  };

  const handleClearToken = () => {
    onChange({
      ...auth,
      oauth2Token: undefined,
      oauth2TokenType: undefined,
      oauth2ExpiresIn: undefined,
      oauth2ExpiresAt: undefined,
      oauth2LastRetrievedAt: undefined,
      oauth2RawResponse: undefined,
    });
    setTokenSuccess(null);
    setTokenError(null);
  };

  const hasActiveToken = Boolean(auth.oauth2Token || (auth.type === 'oauth2' && auth.bearerToken));

  return (
    <div className="space-y-4">
      {/* Quick Auth Presets Banner & Shortcuts */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Quick Auth Presets</span>
              <span className="text-[10px] text-orange-400 font-mono bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
                1-Click Setup
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Quickly configure OAuth 2.0, Bearer tokens, OpenAI/Claude keys, or Query params
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleTypeChange('oauth2')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
              auth.type === 'oauth2'
                ? 'bg-orange-500 text-white border-orange-400 shadow-sm'
                : 'bg-white/5 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-300 border-white/10'
            }`}
            title="Configure OAuth 2.0 Flow"
          >
            OAuth 2.0 Flow
          </button>

          {onSelectQuickPreset && (
            <>
              <button
                type="button"
                onClick={() => onSelectQuickPreset('oauth2_bearer')}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-orange-500/20 text-[11px] font-medium text-zinc-300 hover:text-orange-300 border border-white/10 transition-colors"
                title="Apply OAuth 2.0 Bearer Token"
              >
                Bearer Token
              </button>
              <button
                type="button"
                onClick={() => onSelectQuickPreset('openai_api_key')}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[11px] font-medium text-zinc-300 hover:text-emerald-300 border border-white/10 transition-colors"
                title="Apply OpenAI API Key"
              >
                OpenAI
              </button>
              <button
                type="button"
                onClick={() => onSelectQuickPreset('anthropic_api_key')}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-[11px] font-medium text-zinc-300 hover:text-amber-300 border border-white/10 transition-colors"
                title="Apply Anthropic Claude Key"
              >
                Claude
              </button>
              <button
                type="button"
                onClick={() => onSelectQuickPreset('standard_x_api_key')}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-blue-500/20 text-[11px] font-medium text-zinc-300 hover:text-blue-300 border border-white/10 transition-colors"
                title="Apply Standard X-API-Key Header"
              >
                X-API-Key
              </button>
            </>
          )}

          {onOpenQuickAuth && (
            <button
              type="button"
              onClick={onOpenQuickAuth}
              className="px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>All Presets...</span>
            </button>
          )}
        </div>
      </div>

      {/* Auth Type Selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Auth Type:
        </label>
        <select
          value={auth.type}
          disabled={disabled}
          onChange={e => handleTypeChange(e.target.value as AuthType)}
          className="bg-[#0d1017] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 font-medium"
        >
          <option value="none">No Auth</option>
          <option value="oauth2">OAuth 2.0</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apiKey">API Key (Header / Query)</option>
          <option value="inherit">Inherit auth from parent collection</option>
        </select>

        {auth.type === 'oauth2' && hasActiveToken && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Token Active</span>
          </div>
        )}
      </div>

      {auth.type === 'none' && (
        <div className="p-6 bg-[#0d1017] border border-white/5 rounded-lg text-center text-xs text-zinc-500">
          This request does not use any authentication credentials.
        </div>
      )}

      {auth.type === 'inherit' && (
        <div className="p-6 bg-[#0d1017] border border-white/5 rounded-lg text-xs text-zinc-300 flex items-center gap-2">
          <Shield className="w-4 h-4 text-orange-400" />
          <span>Inheriting authentication helper configured at the parent Collection level.</span>
        </div>
      )}

      {/* OAuth 2.0 Flow Configuration Panel */}
      {auth.type === 'oauth2' && (
        <div className="p-5 bg-[#0d1017] border border-white/10 rounded-xl space-y-4">
          {/* Section Header & Preset Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-white">OAuth 2.0 Authorization Flow</span>
              <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                RFC 6749
              </span>
            </div>

            {/* Quick Template Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Presets:</span>
              {OAUTH2_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  disabled={disabled}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-300 border border-white/5 transition-colors whitespace-nowrap"
                  title={p.description}
                >
                  {p.provider}
                </button>
              ))}
            </div>
          </div>

          {/* Core Configuration Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Grant Type */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Grant Type:</label>
              <select
                value={auth.oauth2GrantType || 'client_credentials'}
                disabled={disabled}
                onChange={e => handleUpdate('oauth2GrantType', e.target.value)}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="client_credentials">Client Credentials (Machine-to-Machine)</option>
                <option value="password">Resource Owner Password Credentials</option>
                <option value="refresh_token">Refresh Token</option>
                <option value="authorization_code">Authorization Code</option>
              </select>
            </div>

            {/* Access Token URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                  <span>Access Token URL:</span>
                  <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleUpdate('oauth2AccessTokenUrl', '/api/oauth2/token')}
                  className="text-[10px] text-orange-400 hover:underline"
                >
                  Use Built-in Mock Server
                </button>
              </div>
              <VariableInput
                value={auth.oauth2AccessTokenUrl || ''}
                disabled={disabled}
                onChange={val => handleUpdate('oauth2AccessTokenUrl', val)}
                placeholder="https://auth.company.com/oauth/token or {{tokenUrl}}"
                scopedVariables={scopedVariables}
                environments={environments}
                activeEnvId={activeEnvId}
                collection={collection}
                onRequestSetAsVariable={onRequestSetAsVariable}
                onQuickUpdateVariable={onQuickUpdateVariable}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                <span>Client ID:</span>
                <span className="text-red-400">*</span>
              </label>
              <VariableInput
                value={auth.oauth2ClientId || ''}
                disabled={disabled}
                onChange={val => handleUpdate('oauth2ClientId', val)}
                placeholder="client_id or {{clientId}}"
                scopedVariables={scopedVariables}
                environments={environments}
                activeEnvId={activeEnvId}
                collection={collection}
                onRequestSetAsVariable={onRequestSetAsVariable}
                onQuickUpdateVariable={onQuickUpdateVariable}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Client Secret with Visibility Mask Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                  <span>Client Secret:</span>
                  <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showSecret ? 'Hide Secret' : 'Show Secret'}</span>
                </button>
              </div>
              <VariableInput
                type={showSecret ? 'text' : 'password'}
                value={auth.oauth2ClientSecret || ''}
                disabled={disabled}
                onChange={val => handleUpdate('oauth2ClientSecret', val)}
                placeholder="•••••••• or {{clientSecret}}"
                scopedVariables={scopedVariables}
                environments={environments}
                activeEnvId={activeEnvId}
                collection={collection}
                onRequestSetAsVariable={onRequestSetAsVariable}
                onQuickUpdateVariable={onQuickUpdateVariable}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Scope */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Scope (Optional):</label>
              <VariableInput
                value={auth.oauth2Scope || ''}
                disabled={disabled}
                onChange={val => handleUpdate('oauth2Scope', val)}
                placeholder="read write profile offline_access or {{scope}}"
                scopedVariables={scopedVariables}
                environments={environments}
                activeEnvId={activeEnvId}
                collection={collection}
                onRequestSetAsVariable={onRequestSetAsVariable}
                onQuickUpdateVariable={onQuickUpdateVariable}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Client Authentication method & Header Prefix */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Client Auth:</label>
                <select
                  value={auth.oauth2ClientAuth || 'body'}
                  disabled={disabled}
                  onChange={e => handleUpdate('oauth2ClientAuth', e.target.value as 'body' | 'basic')}
                  className="w-full bg-[#141824] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="body">Send in Request Body</option>
                  <option value="basic">Send as Basic Auth Header</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Header Prefix:</label>
                <input
                  type="text"
                  value={auth.oauth2HeaderPrefix || 'Bearer'}
                  disabled={disabled}
                  onChange={e => handleUpdate('oauth2HeaderPrefix', e.target.value)}
                  placeholder="Bearer"
                  className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Conditional Fields for Password Grant */}
            {auth.oauth2GrantType === 'password' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Username:</label>
                  <VariableInput
                    value={auth.oauth2Username || ''}
                    disabled={disabled}
                    onChange={val => handleUpdate('oauth2Username', val)}
                    placeholder="user@example.com or {{username}}"
                    scopedVariables={scopedVariables}
                    environments={environments}
                    activeEnvId={activeEnvId}
                    collection={collection}
                    onRequestSetAsVariable={onRequestSetAsVariable}
                    onQuickUpdateVariable={onQuickUpdateVariable}
                    className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Password:</label>
                  <VariableInput
                    type="password"
                    value={auth.oauth2Password || ''}
                    disabled={disabled}
                    onChange={val => handleUpdate('oauth2Password', val)}
                    placeholder="•••••••• or {{password}}"
                    scopedVariables={scopedVariables}
                    environments={environments}
                    activeEnvId={activeEnvId}
                    collection={collection}
                    onRequestSetAsVariable={onRequestSetAsVariable}
                    onQuickUpdateVariable={onQuickUpdateVariable}
                    className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </>
            )}

            {/* Conditional Fields for Refresh Token Grant */}
            {auth.oauth2GrantType === 'refresh_token' && (
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Refresh Token:</label>
                <VariableInput
                  value={auth.oauth2RefreshToken || ''}
                  disabled={disabled}
                  onChange={val => handleUpdate('oauth2RefreshToken', val)}
                  placeholder="cp_rf_... or {{refreshToken}}"
                  scopedVariables={scopedVariables}
                  environments={environments}
                  activeEnvId={activeEnvId}
                  collection={collection}
                  onRequestSetAsVariable={onRequestSetAsVariable}
                  onQuickUpdateVariable={onQuickUpdateVariable}
                  className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            )}
          </div>

          {/* Action Button: Initiate Token Retrieval Flow */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInitiateTokenRetrieval}
                disabled={disabled || isRetrievingToken}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrievingToken ? 'animate-spin' : ''}`} />
                <span>{isRetrievingToken ? 'Retrieving Token...' : 'Get New Access Token'}</span>
              </button>

              {hasActiveToken && (
                <button
                  type="button"
                  onClick={handleClearToken}
                  disabled={disabled}
                  className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 border border-white/10 text-xs transition-colors"
                  title="Clear current token"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span>Header:</span>
              <code className="bg-[#141824] px-2 py-0.5 rounded text-orange-300 font-mono text-[10px] border border-white/10">
                Authorization: {auth.oauth2HeaderPrefix || 'Bearer'} &lt;token&gt;
              </code>
            </div>
          </div>

          {/* Retrieval Status / Error Feedback */}
          {tokenError && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-white">{tokenError.title}</div>
                <div className="text-[11px] text-red-300/90">{tokenError.description}</div>
                {tokenError.raw && (
                  <pre className="mt-1 p-2 rounded bg-black/40 text-[10px] font-mono text-zinc-400 overflow-x-auto max-h-24">
                    {JSON.stringify(tokenError.raw, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {tokenSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{tokenSuccess.message}</span>
              </div>
              {tokenSuccess.latencyMs !== undefined && (
                <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/20 px-2 py-0.5 rounded">
                  {tokenSuccess.latencyMs}ms
                </span>
              )}
            </div>
          )}

          {/* Active Token Display & Management */}
          {hasActiveToken && (
            <div className="p-4 rounded-xl bg-[#080a10] border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">Current Access Token</span>
                  {auth.oauth2ExpiresIn && (
                    <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      Expires in {auth.oauth2ExpiresIn}s
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-medium text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
                  >
                    {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToVariable}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-orange-500/20 text-[11px] font-medium text-zinc-300 hover:text-orange-300 border border-white/10 transition-colors flex items-center gap-1"
                    title="Save to {{accessToken}} environment variable"
                  >
                    {savedToVar ? <Check className="w-3 h-3 text-emerald-400" /> : <Sliders className="w-3 h-3" />}
                    <span>{savedToVar ? 'Saved as {{accessToken}}' : 'Save to Var'}</span>
                  </button>

                  {auth.oauth2RawResponse && (
                    <button
                      type="button"
                      onClick={() => setShowRawResponse(!showRawResponse)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-medium text-zinc-400 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>{showRawResponse ? 'Hide JSON' : 'Raw JSON'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Monospace Token Input */}
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={auth.oauth2Token || auth.bearerToken || ''}
                  className="w-full bg-[#121522] border border-emerald-500/30 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none select-all"
                />
              </div>

              {/* Expandable Raw JSON Response */}
              {showRawResponse && auth.oauth2RawResponse && (
                <div className="mt-2 p-3 bg-[#05060a] border border-white/10 rounded-lg">
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Authorization Server Raw Response
                  </div>
                  <pre className="text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-40 leading-relaxed">
                    {auth.oauth2RawResponse}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bearer Token */}
      {auth.type === 'bearer' && (
        <div className="p-5 bg-[#0d1017] border border-white/10 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Lock className="w-4 h-4 text-orange-400" />
            <span>Bearer Token Authorization</span>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Token (supports {"{{apiKey}}"} or {"{{authToken}}"}):</label>
            <VariableInput
              value={auth.bearerToken || ''}
              disabled={disabled}
              onChange={val => handleUpdate('bearerToken', val)}
              placeholder="e.g. eyJhbGciOiJIUzI1NiIs... or {{authToken}}"
              scopedVariables={scopedVariables}
              environments={environments}
              activeEnvId={activeEnvId}
              collection={collection}
              onRequestSetAsVariable={onRequestSetAsVariable}
              onQuickUpdateVariable={onQuickUpdateVariable}
              className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-orange-500"
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            Will automatically inject header <code className="text-zinc-400 font-mono">Authorization: Bearer &lt;token&gt;</code> to the dispatched request.
          </p>
        </div>
      )}

      {/* Basic Authentication */}
      {auth.type === 'basic' && (
        <div className="p-5 bg-[#0d1017] border border-white/10 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Lock className="w-4 h-4 text-blue-400" />
            <span>Basic Authentication</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Username:</label>
              <VariableInput
                value={auth.basicUsername || ''}
                disabled={disabled}
                onChange={val => handleUpdate('basicUsername', val)}
                placeholder="admin or {{username}}"
                scopedVariables={scopedVariables}
                environments={environments}
                activeEnvId={activeEnvId}
                collection={collection}
                onRequestSetAsVariable={onRequestSetAsVariable}
                onQuickUpdateVariable={onQuickUpdateVariable}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Password:</label>
              <VariableInput
                type="password"
                value={auth.basicPassword || ''}
                disabled={disabled}
                onChange={val => handleUpdate('basicPassword', val)}
                placeholder="•••••••• or {{password}}"
                scopedVariables={scopedVariables}
                environments={environments}
                activeEnvId={activeEnvId}
                collection={collection}
                onRequestSetAsVariable={onRequestSetAsVariable}
                onQuickUpdateVariable={onQuickUpdateVariable}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Encodes credentials with Base64 and injects <code className="text-zinc-400 font-mono">Authorization: Basic &lt;base64&gt;</code>.
          </p>
        </div>
      )}

      {/* API Key */}
      {auth.type === 'apiKey' && (
        <div className="p-5 bg-[#0d1017] border border-white/10 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Key className="w-4 h-4 text-emerald-400" />
            <span>API Key Header or Query Param</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Key Name:</label>
              <VariableInput
                value={auth.apiKeyName || ''}
                disabled={disabled}
                onChange={val => handleUpdate('apiKeyName', val)}
                placeholder="X-API-Key"
                scopedVariables={scopedVariables}
                environments={environments}
                activeEnvId={activeEnvId}
                collection={collection}
                onRequestSetAsVariable={onRequestSetAsVariable}
                onQuickUpdateVariable={onQuickUpdateVariable}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Value (or {"{{apiKey}}"}):</label>
              <VariableInput
                value={auth.apiKeyValue || ''}
                disabled={disabled}
                onChange={val => handleUpdate('apiKeyValue', val)}
                placeholder="{{apiKey}}"
                scopedVariables={scopedVariables}
                environments={environments}
                activeEnvId={activeEnvId}
                collection={collection}
                onRequestSetAsVariable={onRequestSetAsVariable}
                onQuickUpdateVariable={onQuickUpdateVariable}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Add To:</label>
              <select
                value={auth.apiKeyAddTo || 'header'}
                disabled={disabled}
                onChange={e => handleUpdate('apiKeyAddTo', e.target.value as 'header' | 'query')}
                className="w-full bg-[#141824] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
