import React, { useState, useEffect, useRef } from 'react';
import { ApiRequest, HttpMethod, Variable, Role, Collection, Environment, KeyValueItem, AuthConfig } from '../../types';
import { interpolateString, ScopedVariable, extractVariableTokens } from '../../services/variableService';
import { ParamsEditor } from './ParamsEditor';
import { AuthEditor } from './AuthEditor';
import { HeadersEditor } from './HeadersEditor';
import { BodyEditor } from './BodyEditor';
import { TestsEditor } from './TestsEditor';
import { PreRequestEditor } from './PreRequestEditor';
import { CodeSnippetModal } from './CodeSnippetModal';
import { QuickAuthModal, QUICK_AUTH_PRESETS, QuickAuthPreset } from './QuickAuthModal';
import { VariableInput } from '../Variables/VariableInput';
import { VariableHoverCard } from '../Variables/VariableHoverCard';
import { 
  Send, 
  Save, 
  Code2, 
  Loader2, 
  AlertCircle, 
  ShieldAlert,
  Sparkles,
  Key,
  Plus,
  Zap,
  Share2
} from 'lucide-react';

interface RequestBuilderProps {
  request: ApiRequest;
  variables: Variable[];
  scopedVariables?: ScopedVariable[];
  environments?: Environment[];
  activeEnvId?: string;
  collection?: Collection;
  userRole: Role;
  isLoading: boolean;
  onSend: (request: ApiRequest) => void;
  onSave: (request: ApiRequest) => void;
  onRequestSetAsVariable?: (text: string) => void;
  onQuickUpdateVariable?: (key: string, value: string) => void;
  onShareRequest?: (request: ApiRequest) => void;
  isDirty?: boolean;
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/30',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  OPTIONS: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  HEAD: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
};

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  request: initialRequest,
  variables,
  scopedVariables = [],
  environments = [],
  activeEnvId,
  collection,
  userRole,
  isLoading,
  onSend,
  onSave,
  onRequestSetAsVariable,
  onQuickUpdateVariable,
  onShareRequest,
  isDirty: externalIsDirty,
}) => {
  const [request, setRequest] = useState<ApiRequest>(initialRequest);
  const [activeTab, setActiveTab] = useState<'params' | 'auth' | 'headers' | 'body' | 'scripts' | 'tests'>('params');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showQuickAuthModal, setShowQuickAuthModal] = useState(false);
  const [isLocalDirty, setIsLocalDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Hover state for resolved URL tokens
  const [hoveredToken, setHoveredToken] = useState<string | null>(null);

  // Sync internal state when active tab switches to a different request
  useEffect(() => {
    setRequest(initialRequest);
    setIsLocalDirty(false);
  }, [initialRequest.id]);

  const handleApplyQuickPreset = (options: {
    authConfig: AuthConfig;
    headersToAdd: { key: string; value: string; description?: string }[];
    paramsToAdd: { key: string; value: string; description?: string }[];
    methodOverride?: HttpMethod;
    bodyTemplate?: any;
    testsScriptSnippet?: string;
    applyMode: 'both' | 'auth_only' | 'headers_params_only';
    tokenValue?: string;
  }) => {
    setRequest(prev => {
      let updatedAuth = { ...prev.auth };
      let updatedHeaders = [...prev.headers];
      let updatedParams = [...prev.params];
      const updatedMethod = options.methodOverride || prev.method;
      let updatedBody = { ...prev.body };
      let updatedTests = prev.testsScript || '';

      // If custom token value passed, interpolate in authConfig
      if (options.applyMode === 'both' || options.applyMode === 'auth_only') {
        updatedAuth = JSON.parse(JSON.stringify(options.authConfig));
        if (options.tokenValue) {
          if (updatedAuth.bearerToken) updatedAuth.bearerToken = options.tokenValue;
          if (updatedAuth.apiKeyValue) updatedAuth.apiKeyValue = options.tokenValue;
        }
      }

      // Headers injection
      if (options.applyMode === 'both' || options.applyMode === 'headers_params_only') {
        options.headersToAdd.forEach(h => {
          const val = options.tokenValue && h.value.includes('{{')
            ? h.value.replace(/\{\{[^}]+\}\}/, options.tokenValue)
            : h.value;
          const existingIdx = updatedHeaders.findIndex(item => item.key.toLowerCase() === h.key.toLowerCase());
          if (existingIdx >= 0) {
            updatedHeaders[existingIdx] = {
              ...updatedHeaders[existingIdx],
              value: val,
              enabled: true,
              description: h.description || updatedHeaders[existingIdx].description,
            };
          } else {
            updatedHeaders.push({
              id: 'h_' + Math.random().toString(36).substring(2, 7),
              key: h.key,
              value: val,
              enabled: true,
              description: h.description,
            });
          }
        });

        // Params injection
        options.paramsToAdd.forEach(p => {
          const val = options.tokenValue && p.value.includes('{{')
            ? p.value.replace(/\{\{[^}]+\}\}/, options.tokenValue)
            : p.value;
          const existingIdx = updatedParams.findIndex(item => item.key.toLowerCase() === p.key.toLowerCase());
          if (existingIdx >= 0) {
            updatedParams[existingIdx] = {
              ...updatedParams[existingIdx],
              value: val,
              enabled: true,
              description: p.description || updatedParams[existingIdx].description,
            };
          } else {
            updatedParams.push({
              id: 'p_' + Math.random().toString(36).substring(2, 7),
              key: p.key,
              value: val,
              enabled: true,
              description: p.description,
            });
          }
        });
      }

      // Body template if provided
      if (options.bodyTemplate) {
        if (options.bodyTemplate.type === 'x-www-form-urlencoded' && options.bodyTemplate.urlEncoded) {
          updatedBody = {
            ...updatedBody,
            type: 'x-www-form-urlencoded',
            urlEncoded: options.bodyTemplate.urlEncoded.map((item: any) => ({
              id: 'b_' + Math.random().toString(36).substring(2, 7),
              key: item.key,
              value: item.value,
              enabled: true,
            })),
          };
        }
      }

      // Test script snippet
      if (options.testsScriptSnippet) {
        updatedTests = updatedTests.trim()
          ? updatedTests.trim() + '\n\n' + options.testsScriptSnippet
          : options.testsScriptSnippet;
      }

      return {
        ...prev,
        auth: updatedAuth,
        headers: updatedHeaders,
        params: updatedParams,
        method: updatedMethod,
        body: updatedBody,
        testsScript: updatedTests,
      };
    });
    setIsLocalDirty(true);
  };

  const handleSelectQuickPresetById = (presetId: string) => {
    const preset = QUICK_AUTH_PRESETS.find(p => p.id === presetId);
    if (preset) {
      handleApplyQuickPreset({
        authConfig: preset.authConfig,
        headersToAdd: preset.headers || [],
        paramsToAdd: preset.params || [],
        methodOverride: preset.methodOverride,
        bodyTemplate: preset.bodyTemplate,
        testsScriptSnippet: preset.testsScriptSnippet,
        applyMode: 'both',
      });
    }
  };

  const isViewer = userRole === 'VIEWER';
  const hasBodyContent = request.body.type !== 'none';
  const activeParamsCount = request.params.filter(p => p.enabled && p.key).length;
  const activeHeadersCount = request.headers.filter(h => h.enabled && h.key).length;

  const { resolved: resolvedUrl, missingVars } = interpolateString(request.url, variables);
  const detectedTokensInUrl = extractVariableTokens(request.url);

  const handleUrlChange = (newUrl: string) => {
    // Parse query params typed directly into URL and sync to params table
    let updatedParams = [...request.params];
    try {
      if (newUrl.includes('?')) {
        const [, query] = newUrl.split('?');
        const searchParams = new URLSearchParams(query);
        const newParamsList: any[] = [];
        searchParams.forEach((val, key) => {
          newParamsList.push({
            id: 'p_' + Math.random().toString(36).substring(2, 7),
            key,
            value: val,
            enabled: true,
          });
        });
        if (newParamsList.length > 0) {
          updatedParams = newParamsList;
        }
      }
    } catch {
      // ignore
    }

    setRequest(prev => ({ ...prev, url: newUrl, params: updatedParams }));
    setIsLocalDirty(true);
  };

  const handleMethodChange = (method: HttpMethod) => {
    setRequest(prev => ({ ...prev, method }));
    setIsLocalDirty(true);
  };

  const handleSaveClick = async () => {
    if (isViewer || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(request);
      setIsLocalDirty(false);
      await new Promise(r => setTimeout(r, 400));
    } catch {
      // Handled upstream
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendClick = () => {
    onSend(request);
  };

  // Keyboard shortcut Ctrl/Cmd + Enter to send, and Alt + C / Ctrl+Shift+C to open Code Snippet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onSend(request);
      } else if ((e.altKey && e.key.toLowerCase() === 'c') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        setShowCodeModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [request, onSend]);

  return (
    <div className="flex flex-col h-full bg-[#11141e] text-[#e1e4ea] overflow-hidden">
      {/* Top Request Bar: Name, Method, URL, Send, Save, Code, Variable */}
      <div className="p-3 sm:p-4 border-b border-white/10 bg-[#151926] space-y-3 shrink-0">
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              type="text"
              value={request.name}
              disabled={isViewer}
              onChange={e => {
                setRequest(prev => ({ ...prev, name: e.target.value }));
                setIsLocalDirty(true);
              }}
              placeholder="Request Name"
              className="bg-transparent font-bold text-white text-sm focus:outline-none focus:bg-white/5 px-2 py-1 rounded transition-colors truncate max-w-[200px] sm:max-w-xs md:max-w-sm"
            />
            {(isLocalDirty || externalIsDirty) && (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Unsaved changes
              </span>
            )}
          </div>

          {/* Action buttons: Code, Variable, Save */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowQuickAuthModal(true)}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-2 sm:px-3 bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/60 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title="Open Quick Auth presets for OAuth2, API Keys, and Bearer Tokens"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Quick Auth</span>
              <span className="sm:hidden">Auth</span>
            </button>

            {onRequestSetAsVariable && (
              <button
                onClick={() => onRequestSetAsVariable('')}
                className="inline-flex items-center justify-center gap-1.5 h-8 px-2 sm:px-3 bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/60 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                title="Create a new Environment / Global variable"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="hidden md:inline">Variable</span>
              </button>
            )}

            {onShareRequest && (
              <button
                onClick={() => onShareRequest(request)}
                className="inline-flex items-center justify-center gap-1.5 h-8 px-2 sm:px-3 bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/60 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                title="Share this API request via link or cURL"
              >
                <Share2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="hidden md:inline">Share</span>
              </button>
            )}

            <button
              onClick={() => setShowCodeModal(true)}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-2 sm:px-3 bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/60 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              title="Export as Code (cURL, Fetch, Python, PHP, Go, C#, Java, etc.) [Alt + C]"
            >
              <Code2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="hidden sm:inline">Export Code</span>
            </button>

            <button
              onClick={handleSaveClick}
              disabled={isViewer || isSaving}
              className={`inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 shadow-sm ${
                isViewer
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-transparent'
                  : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-orange-500/20'
              }`}
              title={isViewer ? 'Viewer role cannot modify saved requests' : 'Save request (Ctrl+S)'}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic URL Bar */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Method Dropdown */}
          <div className="relative shrink-0">
            <select
              value={request.method}
              disabled={isViewer}
              onChange={e => handleMethodChange(e.target.value as HttpMethod)}
              className={`h-10 font-mono font-bold text-xs px-3 rounded-lg border focus:outline-none appearance-none cursor-pointer pr-6 shrink-0 whitespace-nowrap ${
                METHOD_COLORS[request.method]
              }`}
            >
              {HTTP_METHODS.map(m => (
                <option key={m} value={m} className="bg-[#141824] text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* URL Input with Variable Support */}
          <div className="relative flex-1 min-w-[140px]">
            <VariableInput
              value={request.url}
              disabled={isViewer}
              onChange={handleUrlChange}
              placeholder="Enter request URL or {{baseUrl}}/api/v1/resource"
              scopedVariables={scopedVariables}
              environments={environments}
              activeEnvId={activeEnvId}
              collection={collection}
              onRequestSetAsVariable={onRequestSetAsVariable}
              onQuickUpdateVariable={onQuickUpdateVariable}
              className="w-full h-10 bg-[#0d1017] border border-white/10 rounded-lg px-3 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendClick}
            disabled={isLoading}
            className="h-10 inline-flex items-center justify-center gap-1.5 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 font-bold text-white rounded-lg text-xs transition-colors shadow-md shrink-0 cursor-pointer whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>

        {/* Resolved URL preview & tokens bar with bottom spacer */}
        {request.url.includes('{{') && (
          <div className="relative text-[10px] font-mono flex items-center gap-2 flex-wrap px-1 pt-1 pb-3 text-zinc-400">
            <span className="text-zinc-500">Resolves:</span>
            <span className="text-emerald-400 truncate max-w-sm">{resolvedUrl}</span>

            {/* Variable Token inspection chips */}
            <div className="flex items-center gap-1">
              {detectedTokensInUrl.map(token => (
                <button
                  key={token}
                  type="button"
                  onClick={() => setHoveredToken(hoveredToken === token ? null : token)}
                  className="px-1.5 py-0.5 bg-white/10 hover:bg-orange-500/20 text-orange-300 rounded text-[9px] font-mono transition-colors cursor-pointer"
                >
                  {`{{${token}}}`}
                </button>
              ))}
            </div>

            {missingVars.length > 0 && (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Unresolved: {missingVars.join(', ')}</span>
              </span>
            )}

            {/* Hover card for token */}
            {hoveredToken && (
              <div className="absolute left-2 top-full mt-1 z-50">
                <VariableHoverCard
                  varName={hoveredToken}
                  scopedVariables={scopedVariables}
                  environments={environments}
                  activeEnvId={activeEnvId}
                  collection={collection}
                  onQuickUpdateValue={onQuickUpdateVariable}
                  onRequestCreate={varName => {
                    onRequestSetAsVariable?.(varName);
                    setHoveredToken(null);
                  }}
                  onClose={() => setHoveredToken(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Viewer Banner if readonly */}
      {isViewer && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>You have <strong>Viewer</strong> access. You can dispatch tests and inspect responses, but cannot save configuration changes.</span>
        </div>
      )}

      {/* Request Config Sub-Tabs */}
      <div className="px-4 border-b border-white/10 bg-[#141824] flex items-center gap-1 text-xs shrink-0">
        <button
          onClick={() => setActiveTab('params')}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'params'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span>Params</span>
          {activeParamsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-white/10 rounded text-[10px] text-zinc-300">
              {activeParamsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('auth')}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'auth'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span>Authorization</span>
          {request.auth.type !== 'none' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('headers')}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'headers'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span>Headers</span>
          {activeHeadersCount > 0 && (
            <span className="px-1.5 py-0.2 bg-white/10 rounded text-[10px] text-zinc-300">
              {activeHeadersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('body')}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'body'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span>Body</span>
          {hasBodyContent && (
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('scripts')}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'scripts'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span>Pre-request</span>
          {Boolean(request.preRequestScript?.trim()) && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'tests'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span>Tests</span>
          {Boolean(request.testsScript?.trim()) && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          )}
        </button>
      </div>

      {/* Active Tab Panel Content */}
      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'params' && (
          <ParamsEditor
            params={request.params}
            disabled={isViewer}
            scopedVariables={scopedVariables}
            environments={environments}
            activeEnvId={activeEnvId}
            collection={collection}
            onRequestSetAsVariable={onRequestSetAsVariable}
            onQuickUpdateVariable={onQuickUpdateVariable}
            onChange={params => {
              setRequest(prev => ({ ...prev, params }));
              setIsLocalDirty(true);
            }}
          />
        )}

        {activeTab === 'auth' && (
          <AuthEditor
            auth={request.auth}
            disabled={isViewer}
            scopedVariables={scopedVariables}
            environments={environments}
            activeEnvId={activeEnvId}
            collection={collection}
            onRequestSetAsVariable={onRequestSetAsVariable}
            onQuickUpdateVariable={onQuickUpdateVariable}
            onOpenQuickAuth={() => setShowQuickAuthModal(true)}
            onSelectQuickPreset={handleSelectQuickPresetById}
            onChange={auth => {
              setRequest(prev => ({ ...prev, auth }));
              setIsLocalDirty(true);
            }}
          />
        )}

        {activeTab === 'headers' && (
          <HeadersEditor
            headers={request.headers}
            disabled={isViewer}
            scopedVariables={scopedVariables}
            environments={environments}
            activeEnvId={activeEnvId}
            collection={collection}
            onRequestSetAsVariable={onRequestSetAsVariable}
            onQuickUpdateVariable={onQuickUpdateVariable}
            onChange={headers => {
              setRequest(prev => ({ ...prev, headers }));
              setIsLocalDirty(true);
            }}
          />
        )}

        {activeTab === 'body' && (
          <BodyEditor
            body={request.body}
            disabled={isViewer}
            scopedVariables={scopedVariables}
            environments={environments}
            activeEnvId={activeEnvId}
            collection={collection}
            onRequestSetAsVariable={onRequestSetAsVariable}
            onQuickUpdateVariable={onQuickUpdateVariable}
            onChange={body => {
              setRequest(prev => {
                let updatedHeaders = [...prev.headers];
                
                // If body type changed or is configured, auto-sync Content-Type just like Postman
                let targetContentType: string | null = null;
                if (body.type === 'x-www-form-urlencoded') {
                  targetContentType = 'application/x-www-form-urlencoded';
                } else if (body.type === 'json') {
                  targetContentType = 'application/json';
                } else if (body.type === 'raw') {
                  targetContentType = body.rawType || 'text/plain';
                }

                if (targetContentType) {
                  const ctIdx = updatedHeaders.findIndex(h => h.key.toLowerCase() === 'content-type');
                  if (ctIdx >= 0) {
                    updatedHeaders[ctIdx] = {
                      ...updatedHeaders[ctIdx],
                      value: targetContentType,
                      enabled: true,
                    };
                  } else {
                    updatedHeaders.push({
                      id: 'h_ct_' + Math.random().toString(36).substring(2, 7),
                      key: 'Content-Type',
                      value: targetContentType,
                      enabled: true,
                      description: 'Auto-managed by Body format',
                    });
                  }
                }

                return { ...prev, body, headers: updatedHeaders };
              });
              setIsLocalDirty(true);
            }}
          />
        )}

        {activeTab === 'scripts' && (
          <PreRequestEditor
            script={request.preRequestScript}
            disabled={isViewer}
            variables={variables}
            onSetVariable={onQuickUpdateVariable}
            onChange={preRequestScript => {
              setRequest(prev => ({ ...prev, preRequestScript }));
              setIsLocalDirty(true);
            }}
          />
        )}

        {activeTab === 'tests' && (
          <TestsEditor
            testsScript={request.testsScript}
            disabled={isViewer}
            variables={variables}
            onChange={testsScript => {
              setRequest(prev => ({ ...prev, testsScript }));
              setIsLocalDirty(true);
            }}
          />
        )}
      </div>

      {/* Code Snippet Modal */}
      {showCodeModal && (
        <CodeSnippetModal
          request={request}
          variables={variables}
          collection={collection}
          onClose={() => setShowCodeModal(false)}
        />
      )}

      {/* Quick Auth Presets Modal */}
      {showQuickAuthModal && (
        <QuickAuthModal
          isOpen={showQuickAuthModal}
          onClose={() => setShowQuickAuthModal(false)}
          currentAuth={request.auth}
          currentHeaders={request.headers}
          currentParams={request.params}
          scopedVariables={scopedVariables}
          environments={environments}
          activeEnvId={activeEnvId}
          onApplyPreset={handleApplyQuickPreset}
          onQuickUpdateVariable={onQuickUpdateVariable}
        />
      )}
    </div>
  );
};
