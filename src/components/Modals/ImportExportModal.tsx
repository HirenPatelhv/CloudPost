import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Workspace, 
  Collection, 
  Environment, 
  ActivityLog, 
  Role 
} from '../../types';
import { 
  analyzeImportContent, 
  ImportAnalysisResult, 
  exportCollectionToPostmanV2, 
  exportEnvironmentToPostman, 
  exportCloudPostFullBackup, 
  exportCloudPostWorkspace, 
  exportCloudPostCollection, 
  downloadJsonFile 
} from '../../services/importExportService';
import { 
  Upload, 
  Download, 
  FileCode, 
  Check, 
  Copy, 
  AlertCircle, 
  Layers, 
  Globe, 
  Folder as FolderIcon, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  RefreshCw,
  FolderArchive,
  Database,
  Eye,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

export type ExportFormatType = 
  | 'postman_collection' 
  | 'postman_environment' 
  | 'cloudpost_backup' 
  | 'cloudpost_workspace' 
  | 'cloudpost_collection';

export interface ImportExportModalProps {
  initialTab?: 'import' | 'export';
  initialExportType?: ExportFormatType;
  initialCollectionId?: string;
  initialEnvironmentId?: string;
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  collections: Collection[];
  environments: Environment[];
  activityLogs: ActivityLog[];
  userRole: Role;
  onClose: () => void;
  onImportSuccess: (result: {
    workspaces?: Workspace[];
    collections?: Collection[];
    environments?: Environment[];
    activityLogs?: ActivityLog[];
    targetWorkspaceId: string;
    mode: 'add' | 'replace';
  }) => void;
}

// Sample Postman Collection and Environment for Quick Test Drive
const SAMPLE_POSTMAN_COLLECTION = JSON.stringify({
  info: {
    _postman_id: "pm_sample_ecommerce",
    name: "E-Commerce Payments & Orders API",
    description: "Postman Collection v2.1 sample with authentication, orders, checkout, and webhook verification.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "Authentication",
      item: [
        {
          name: "Obtain OAuth2 Bearer Token",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: "{\n  \"client_id\": \"{{clientId}}\",\n  \"client_secret\": \"{{clientSecret}}\",\n  \"grant_type\": \"client_credentials\"\n}",
              options: { raw: { language: "json" } }
            },
            url: {
              raw: "{{baseUrl}}/oauth/token",
              host: ["{{baseUrl}}"],
              path: ["oauth", "token"]
            },
            description: "Authenticates client and receives active session JWT."
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "const jsonData = pm.response.json();",
                  "pm.test(\"Status code is 200 OK\", () => {",
                  "  pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Token is present\", () => {",
                  "  pm.expect(jsonData.access_token).to.be.a('string');",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: "Orders & Invoicing",
      item: [
        {
          name: "List Recent Orders",
          request: {
            method: "GET",
            header: [
              { key: "Authorization", value: "Bearer {{authToken}}" },
              { key: "Accept", value: "application/json" }
            ],
            url: {
              raw: "{{baseUrl}}/v1/orders?status=completed&limit=20",
              query: [
                { key: "status", value: "completed", description: "Filter order status" },
                { key: "limit", value: "20", description: "Page size" }
              ]
            },
            description: "Retrieves paginated customer order history."
          }
        },
        {
          name: "Create Checkout Session",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{authToken}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: "{\n  \"currency\": \"USD\",\n  \"amount\": 8450,\n  \"customer_email\": \"{{$randomEmail}}\",\n  \"idempotency_key\": \"{{$guid}}\"\n}",
              options: { raw: { language: "json" } }
            },
            url: {
              raw: "{{baseUrl}}/v1/checkout/sessions"
            }
          }
        }
      ]
    }
  ],
  variable: [
    { key: "baseUrl", value: "https://api.store.example.com", type: "string" },
    { key: "clientId", value: "client_live_8910a", type: "string" },
    { key: "clientSecret", value: "sk_secret_99182", type: "secret" }
  ]
}, null, 2);

const SAMPLE_POSTMAN_ENV = JSON.stringify({
  id: "pm_env_staging",
  name: "Staging Cloud API",
  values: [
    { key: "baseUrl", value: "https://staging-api.example.com/v2", enabled: true, type: "default" },
    { key: "authToken", value: "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", enabled: true, type: "secret" },
    { key: "merchantId", value: "mch_stg_09214", enabled: true, type: "default" },
    { key: "timeoutMs", value: "5000", enabled: true, type: "default" }
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: "2026-08-19T20:00:00.000Z"
}, null, 2);

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  initialTab = 'import',
  initialExportType = 'postman_collection',
  initialCollectionId,
  initialEnvironmentId,
  workspaces,
  currentWorkspace,
  collections,
  environments,
  activityLogs,
  userRole,
  onClose,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialTab);

  // --------------------------------------------------
  // IMPORT STATE
  // --------------------------------------------------
  const [importInputMode, setImportInputMode] = useState<'file' | 'text'>('file');
  const [rawImportText, setRawImportText] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>(currentWorkspace.id);
  const [importMode, setImportMode] = useState<'add' | 'replace'>('add');
  const [isImporting, setIsImporting] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analyze import content in real-time
  const analysis: ImportAnalysisResult = useMemo(() => {
    return analyzeImportContent(rawImportText, targetWorkspaceId);
  }, [rawImportText, targetWorkspaceId]);

  // --------------------------------------------------
  // EXPORT STATE
  // --------------------------------------------------
  const [exportType, setExportType] = useState<ExportFormatType>(initialExportType);
  const [selectedColId, setSelectedColId] = useState<string>(
    initialCollectionId || (collections[0]?.id || '')
  );
  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    initialEnvironmentId || (environments[0]?.id || '')
  );
  const [copiedExport, setCopiedExport] = useState(false);

  const isViewer = userRole === 'VIEWER';

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      setRawImportText(content);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleExecuteImport = () => {
    if (!analysis.isValid || isImporting) return;
    setIsImporting(true);

    setTimeout(() => {
      onImportSuccess({
        workspaces: analysis.parsedData.workspaces,
        collections: analysis.parsedData.collections,
        environments: analysis.parsedData.environments,
        activityLogs: analysis.parsedData.activityLogs,
        targetWorkspaceId,
        mode: importMode,
      });
      setIsImporting(false);
      onClose();
    }, 300);
  };

  // --------------------------------------------------
  // GENERATE EXPORT DATA
  // --------------------------------------------------
  const exportPayload = useMemo(() => {
    if (exportType === 'postman_collection') {
      const col = collections.find(c => c.id === selectedColId) || collections[0];
      if (!col) return null;
      return {
        data: exportCollectionToPostmanV2(col),
        filename: `${col.name.toLowerCase().replace(/\s+/g, '_')}.postman_collection.json`,
        label: `Postman Collection v2.1 (${col.name})`,
      };
    }

    if (exportType === 'postman_environment') {
      const env = environments.find(e => e.id === selectedEnvId) || environments[0];
      if (!env) return null;
      return {
        data: exportEnvironmentToPostman(env),
        filename: `${env.name.toLowerCase().replace(/\s+/g, '_')}.postman_environment.json`,
        label: `Postman Environment (${env.name})`,
      };
    }

    if (exportType === 'cloudpost_backup') {
      return {
        data: exportCloudPostFullBackup(workspaces, collections, environments, activityLogs),
        filename: `cloudpost_full_backup_${new Date().toISOString().slice(0, 10)}.json`,
        label: `CloudPost Full Application Backup (${workspaces.length} workspaces, ${collections.length} collections)`,
      };
    }

    if (exportType === 'cloudpost_workspace') {
      return {
        data: exportCloudPostWorkspace(currentWorkspace, collections, environments),
        filename: `cloudpost_workspace_${currentWorkspace.name.toLowerCase().replace(/\s+/g, '_')}.json`,
        label: `CloudPost Workspace (${currentWorkspace.name})`,
      };
    }

    if (exportType === 'cloudpost_collection') {
      const col = collections.find(c => c.id === selectedColId) || collections[0];
      if (!col) return null;
      return {
        data: exportCloudPostCollection(col),
        filename: `cloudpost_collection_${col.name.toLowerCase().replace(/\s+/g, '_')}.json`,
        label: `CloudPost Native Collection (${col.name})`,
      };
    }

    return null;
  }, [
    exportType, 
    selectedColId, 
    selectedEnvId, 
    collections, 
    environments, 
    workspaces, 
    currentWorkspace, 
    activityLogs
  ]);

  const exportJsonString = useMemo(() => {
    if (!exportPayload?.data) return '';
    return JSON.stringify(exportPayload.data, null, 2);
  }, [exportPayload]);

  const handleDownload = () => {
    if (!exportPayload) return;
    downloadJsonFile(exportPayload.filename, exportPayload.data);
  };

  const handleCopyExport = () => {
    if (!exportJsonString) return;
    navigator.clipboard.writeText(exportJsonString);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  // Keyboard shortcut listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121520] border border-white/15 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header & Tab Navigation */}
        <div className="p-4 border-b border-white/10 bg-[#151926] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                <span>Import & Export Data</span>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 font-mono px-2 py-0.5 rounded font-semibold">
                  POSTMAN & CLOUDPOST NATIVE
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Seamlessly migrate collections, environments, requests, and complete workspace snapshots.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switch buttons */}
            <div className="flex items-center bg-[#0d1017] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('import')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'import'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'export'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ========================================================= */}
          {/* TAB 1: IMPORT                                             */}
          {/* ========================================================= */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              
              {/* Input Mode Selector & Sample Dropdown */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImportInputMode('file')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      importInputMode === 'file'
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-orange-400" />
                    <span>Upload File</span>
                  </button>

                  <button
                    onClick={() => setImportInputMode('text')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      importInputMode === 'text'
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-400" />
                    <span>Paste Raw JSON</span>
                  </button>
                </div>

                {/* Quick Test Samples */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 font-medium">Quick Test:</span>
                  <button
                    onClick={() => {
                      setImportInputMode('text');
                      setRawImportText(SAMPLE_POSTMAN_COLLECTION);
                      setFileName('sample_ecommerce.postman_collection.json');
                    }}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-orange-300 hover:text-white rounded text-[11px] font-mono transition-colors"
                  >
                    + Sample Postman Collection
                  </button>
                  <button
                    onClick={() => {
                      setImportInputMode('text');
                      setRawImportText(SAMPLE_POSTMAN_ENV);
                      setFileName('staging.postman_environment.json');
                    }}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 hover:text-white rounded text-[11px] font-mono transition-colors"
                  >
                    + Sample Postman Env
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone / Text Editor */}
              {importInputMode === 'file' ? (
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    dragOver
                      ? 'border-orange-500 bg-orange-500/10 scale-[0.99]'
                      : 'border-white/15 bg-[#0d1017] hover:border-orange-500/50 hover:bg-white/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {fileName ? `Selected: ${fileName}` : 'Drop Postman or CloudPost JSON file here'}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Supports Postman Collection v2.1/v2.0, Postman Environment, Globals, or CloudPost Full Backup.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg border border-white/10 transition-colors"
                  >
                    Browse Local File...
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Paste raw JSON text below:</span>
                    {rawImportText && (
                      <button
                        onClick={() => {
                          setRawImportText('');
                          setFileName(null);
                        }}
                        className="text-zinc-500 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={7}
                    value={rawImportText}
                    onChange={e => setRawImportText(e.target.value)}
                    placeholder='{\n  "info": {\n    "name": "My Postman Collection",\n    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"\n  },\n  "item": [...] \n}'
                    className="w-full bg-[#0d1017] border border-white/10 rounded-xl p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              {/* Real-Time Detection & Verification Card */}
              {rawImportText.trim() && (
                <div className="space-y-4 animate-in fade-in">
                  <div
                    className={`p-4 rounded-xl border ${
                      analysis.isValid
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {analysis.isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{analysis.title}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-zinc-200">
                              {analysis.type}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300">{analysis.description}</p>
                          {analysis.error && (
                            <p className="text-xs font-mono text-red-300 mt-1">{analysis.error}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metric Stats Badges */}
                    {analysis.isValid && (
                      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/10 text-xs font-mono">
                        {analysis.stats.collectionsCount > 0 && (
                          <span className="px-2.5 py-1 bg-white/10 rounded text-orange-300 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            <span>{analysis.stats.collectionsCount} Collection(s)</span>
                          </span>
                        )}
                        {analysis.stats.requestsCount > 0 && (
                          <span className="px-2.5 py-1 bg-white/10 rounded text-blue-300 flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5" />
                            <span>{analysis.stats.requestsCount} Request(s)</span>
                          </span>
                        )}
                        {analysis.stats.foldersCount > 0 && (
                          <span className="px-2.5 py-1 bg-white/10 rounded text-amber-300 flex items-center gap-1.5">
                            <FolderIcon className="w-3.5 h-3.5" />
                            <span>{analysis.stats.foldersCount} Folder(s)</span>
                          </span>
                        )}
                        {analysis.stats.environmentsCount > 0 && (
                          <span className="px-2.5 py-1 bg-white/10 rounded text-emerald-300 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            <span>{analysis.stats.environmentsCount} Environment(s)</span>
                          </span>
                        )}
                        {analysis.stats.variablesCount > 0 && (
                          <span className="px-2.5 py-1 bg-white/10 rounded text-purple-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{analysis.stats.variablesCount} Scoped Variable(s)</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Target Workspace & Import Mode Selection */}
                  {analysis.isValid && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#0d1017] rounded-xl border border-white/10 text-xs">
                      <div>
                        <label className="block text-zinc-400 font-semibold mb-1">
                          Destination Workspace:
                        </label>
                        <select
                          value={targetWorkspaceId}
                          onChange={e => setTargetWorkspaceId(e.target.value)}
                          className="w-full bg-[#151926] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-orange-500"
                        >
                          {workspaces.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-zinc-400 font-semibold mb-1">
                          Import Strategy:
                        </label>
                        <select
                          value={importMode}
                          onChange={e => setImportMode(e.target.value as 'add' | 'replace')}
                          className="w-full bg-[#151926] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-orange-500"
                        >
                          <option value="add">Add as New (Safe, preserve existing)</option>
                          <option value="replace">Merge & Append</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Collapsible Preview Tree */}
                  {analysis.isValid && analysis.previewTree && (
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0d1017]">
                      <button
                        onClick={() => setPreviewExpanded(!previewExpanded)}
                        className="w-full px-4 py-2.5 bg-[#141824] flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white"
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-orange-400" />
                          <span>Inspect Import Items</span>
                        </div>
                        {previewExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {previewExpanded && (
                        <div className="p-3 max-h-48 overflow-y-auto space-y-1.5 font-mono text-xs">
                          {analysis.previewTree.map((item, idx) => (
                            <div key={idx} className="p-2 bg-[#121520] rounded-lg border border-white/5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white">{item.name}</span>
                                {item.subtitle && <span className="text-zinc-500 text-[11px]">{item.subtitle}</span>}
                              </div>
                              {item.children && (
                                <div className="pl-3 space-y-1 border-l border-white/10 mt-1">
                                  {item.children.map((child: any, cidx: number) => (
                                    <div key={cidx} className="flex items-center justify-between text-[11px] text-zinc-400">
                                      <span className="truncate">{child.name}</span>
                                      {child.subtitle && <span className="text-zinc-600 truncate max-w-[200px]">{child.subtitle}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Import Action Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!analysis.isValid || isImporting || isViewer}
                  onClick={handleExecuteImport}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-orange-500/20"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Confirm & Import Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: EXPORT                                             */}
          {/* ========================================================= */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              
              {/* Export Category Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  onClick={() => setExportType('postman_collection')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    exportType === 'postman_collection'
                      ? 'bg-orange-500/10 border-orange-500 text-white shadow-md'
                      : 'bg-[#0d1017] border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-orange-400" />
                      <span className="font-bold text-xs text-white">Postman Collection</span>
                    </div>
                    <span className="text-[10px] bg-orange-500/20 text-orange-300 font-mono px-1.5 py-0.5 rounded font-semibold">
                      v2.1
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Export collection in standard Postman v2.1 format for import into Postman app.
                  </p>
                </div>

                <div
                  onClick={() => setExportType('postman_environment')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    exportType === 'postman_environment'
                      ? 'bg-orange-500/10 border-orange-500 text-white shadow-md'
                      : 'bg-[#0d1017] border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs text-white">Postman Environment</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded font-semibold">
                      JSON
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Export environment with all active, initial, and secret variables.
                  </p>
                </div>

                <div
                  onClick={() => setExportType('cloudpost_backup')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    exportType === 'cloudpost_backup'
                      ? 'bg-orange-500/10 border-orange-500 text-white shadow-md'
                      : 'bg-[#0d1017] border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-xs text-white">Full App Backup</span>
                    </div>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono px-1.5 py-0.5 rounded font-semibold">
                      Native
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Complete snapshot of all workspaces, collections, environments, and logs.
                  </p>
                </div>
              </div>

              {/* Target Entity Selectors */}
              <div className="p-4 bg-[#0d1017] border border-white/10 rounded-xl space-y-3 text-xs">
                {exportType === 'postman_collection' || exportType === 'cloudpost_collection' ? (
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">
                      Select Collection to Export:
                    </label>
                    <select
                      value={selectedColId}
                      onChange={e => setSelectedColId(e.target.value)}
                      className="w-full bg-[#151926] border border-white/10 rounded-lg p-2.5 text-white font-medium text-xs focus:outline-none focus:border-orange-500"
                    >
                      {collections.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.requests.length} requests, {c.folders.length} folders)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : exportType === 'postman_environment' ? (
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">
                      Select Environment to Export:
                    </label>
                    <select
                      value={selectedEnvId}
                      onChange={e => setSelectedEnvId(e.target.value)}
                      className="w-full bg-[#151926] border border-white/10 rounded-lg p-2.5 text-white font-medium text-xs focus:outline-none focus:border-orange-500"
                    >
                      {environments.map(env => (
                        <option key={env.id} value={env.id}>
                          {env.name} {env.isGlobal ? '(Global)' : `(${env.variables.length} vars)`}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Exporting all data for: <strong className="text-white">{currentWorkspace.name}</strong> & connected environments</span>
                    <span className="text-[11px] text-zinc-500 font-mono">{workspaces.length} workspaces, {collections.length} collections</span>
                  </div>
                )}
              </div>

              {/* Export Preview Code Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span>JSON Preview:</span>
                    <span className="font-mono text-zinc-500">
                      ({(exportJsonString.length / 1024).toFixed(1)} KB)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyExport}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs transition-colors"
                    >
                      {copiedExport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedExport ? 'Copied JSON!' : 'Copy to Clipboard'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#0d1017] border border-white/10 rounded-xl p-3 max-h-60 overflow-y-auto font-mono text-xs text-emerald-300/90 whitespace-pre">
                  {exportJsonString}
                </div>
              </div>

              {/* Export Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="text-xs text-zinc-400 font-mono">
                  Target file: <span className="text-orange-300">{exportPayload?.filename}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-orange-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .json File</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
