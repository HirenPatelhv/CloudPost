import React, { useState } from 'react';
import { Environment, Variable, Collection } from '../../types';
import { DYNAMIC_VARIABLES, ScopedVariable } from '../../services/variableService';
import { 
  Globe, 
  Layers, 
  FolderArchive, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  Copy, 
  AlertCircle,
  Search,
  Download,
  Upload,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

interface EnvironmentManagerModalProps {
  environments: Environment[];
  collections?: Collection[];
  activeEnvId: string;
  onClose: () => void;
  onUpdateEnvironments: (envs: Environment[]) => void;
  onUpdateCollections?: (cols: Collection[]) => void;
  onSetActiveEnv: (id: string) => void;
}

export const EnvironmentManagerModal: React.FC<EnvironmentManagerModalProps> = ({
  environments,
  collections = [],
  activeEnvId,
  onClose,
  onUpdateEnvironments,
  onUpdateCollections,
  onSetActiveEnv,
}) => {
  const [localEnvs, setLocalEnvs] = useState<Environment[]>(JSON.parse(JSON.stringify(environments)));
  const [localCols, setLocalCols] = useState<Collection[]>(JSON.parse(JSON.stringify(collections)));

  // Selected item can be an environment id, 'globals', 'dynamic', or 'col_' + collectionId
  const [selectedTargetId, setSelectedTargetId] = useState<string>(() => {
    if (activeEnvId && activeEnvId !== 'no_env') return activeEnvId;
    const firstNonGlobal = localEnvs.find(e => !e.isGlobal);
    return firstNonGlobal ? firstNonGlobal.id : (localEnvs[0]?.id || 'env_global');
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});
  const [newEnvName, setNewEnvName] = useState('');
  const [showNewEnvInput, setShowNewEnvInput] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bulk import mode
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Determine current active view: Environment vs Collection vs Dynamic Variables
  const isDynamicView = selectedTargetId === 'dynamic_variables';
  const isCollectionView = selectedTargetId.startsWith('col_');
  const selectedCollectionId = isCollectionView ? selectedTargetId.replace('col_', '') : null;
  const currentCollection = selectedCollectionId ? localCols.find(c => c.id === selectedCollectionId) : null;
  const currentEnv = !isCollectionView && !isDynamicView ? localEnvs.find(e => e.id === selectedTargetId) : null;

  // Active variables for current view
  const currentVariables: Variable[] = isCollectionView
    ? (currentCollection?.variables || [])
    : (currentEnv?.variables || []);

  const handleAddVariable = () => {
    const newVar: Variable = {
      id: 'var_' + Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      initialValue: '',
      enabled: true,
      isSecret: false,
    };

    if (isCollectionView && currentCollection) {
      const updatedCols = localCols.map(col => {
        if (col.id === currentCollection.id) {
          return { ...col, variables: [...(col.variables || []), newVar] };
        }
        return col;
      });
      setLocalCols(updatedCols);
    } else if (currentEnv) {
      const updatedEnvs = localEnvs.map(env => {
        if (env.id === currentEnv.id) {
          return { ...env, variables: [...env.variables, newVar] };
        }
        return env;
      });
      setLocalEnvs(updatedEnvs);
    }
  };

  const handleUpdateVar = (varId: string, field: keyof Variable, value: any) => {
    if (isCollectionView && currentCollection) {
      const updatedCols = localCols.map(col => {
        if (col.id === currentCollection.id) {
          return {
            ...col,
            variables: (col.variables || []).map(v => (v.id === varId ? { ...v, [field]: value } : v)),
          };
        }
        return col;
      });
      setLocalCols(updatedCols);
    } else if (currentEnv) {
      const updatedEnvs = localEnvs.map(env => {
        if (env.id === currentEnv.id) {
          return {
            ...env,
            variables: env.variables.map(v => (v.id === varId ? { ...v, [field]: value } : v)),
          };
        }
        return env;
      });
      setLocalEnvs(updatedEnvs);
    }
  };

  const handleDeleteVar = (varId: string) => {
    if (isCollectionView && currentCollection) {
      const updatedCols = localCols.map(col => {
        if (col.id === currentCollection.id) {
          return {
            ...col,
            variables: (col.variables || []).filter(v => v.id !== varId),
          };
        }
        return col;
      });
      setLocalCols(updatedCols);
    } else if (currentEnv) {
      const updatedEnvs = localEnvs.map(env => {
        if (env.id === currentEnv.id) {
          return {
            ...env,
            variables: env.variables.filter(v => v.id !== varId),
          };
        }
        return env;
      });
      setLocalEnvs(updatedEnvs);
    }
  };

  const handleCreateNewEnvironment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;
    const newEnv: Environment = {
      id: 'env_' + Math.random().toString(36).substring(2, 9),
      name: newEnvName.trim(),
      isGlobal: false,
      variables: [
        {
          id: 'v_base',
          key: 'baseUrl',
          value: 'https://api.example.com',
          initialValue: 'https://api.example.com',
          enabled: true,
        },
      ],
      createdAt: new Date().toISOString(),
    };
    setLocalEnvs([...localEnvs, newEnv]);
    setSelectedTargetId(newEnv.id);
    setNewEnvName('');
    setShowNewEnvInput(false);
  };

  const handleDeleteEnvironment = (envId: string) => {
    if (localEnvs.length <= 1) return;
    const filtered = localEnvs.filter(e => e.id !== envId);
    setLocalEnvs(filtered);
    if (selectedTargetId === envId) {
      setSelectedTargetId(filtered[0].id);
    }
  };

  const handleBulkImportSubmit = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n');
    const parsedVars: Variable[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      let key = '';
      let val = '';

      if (trimmed.includes('=')) {
        const [k, ...rest] = trimmed.split('=');
        key = k.trim();
        val = rest.join('=').trim().replace(/^["']|["']$/g, '');
      } else if (trimmed.includes(':')) {
        const [k, ...rest] = trimmed.split(':');
        key = k.trim();
        val = rest.join(':').trim();
      } else if (trimmed.includes('\t') || trimmed.includes(',')) {
        const parts = trimmed.split(/[\t,]/);
        key = parts[0].trim();
        val = (parts[1] || '').trim();
      } else {
        key = trimmed;
        val = '';
      }

      if (key) {
        parsedVars.push({
          id: 'var_' + Math.random().toString(36).substring(2, 9),
          key: key.replace(/^\{\{|\}\}$/g, ''),
          value: val,
          initialValue: val,
          enabled: true,
          isSecret: false,
        });
      }
    }

    if (parsedVars.length > 0) {
      if (isCollectionView && currentCollection) {
        const updatedCols = localCols.map(col => {
          if (col.id === currentCollection.id) {
            return { ...col, variables: [...(col.variables || []), ...parsedVars] };
          }
          return col;
        });
        setLocalCols(updatedCols);
      } else if (currentEnv) {
        const updatedEnvs = localEnvs.map(env => {
          if (env.id === currentEnv.id) {
            return { ...env, variables: [...env.variables, ...parsedVars] };
          }
          return env;
        });
        setLocalEnvs(updatedEnvs);
      }
    }

    setBulkText('');
    setShowBulkImport(false);
  };

  const handleExportJson = () => {
    let exportObj: any = null;
    let filename = 'variables.json';

    if (isCollectionView && currentCollection) {
      exportObj = {
        name: `${currentCollection.name} Variables`,
        values: currentCollection.variables || [],
      };
      filename = `${currentCollection.name.toLowerCase().replace(/\s+/g, '_')}_variables.json`;
    } else if (currentEnv) {
      exportObj = {
        id: currentEnv.id,
        name: currentEnv.name,
        values: currentEnv.variables.map(v => ({
          key: v.key,
          value: v.value,
          enabled: v.enabled,
          type: v.isSecret ? 'secret' : 'default',
        })),
        _postman_variable_scope: currentEnv.isGlobal ? 'globals' : 'environment',
      };
      filename = `${currentEnv.name.toLowerCase().replace(/\s+/g, '_')}_environment.json`;
    }

    if (exportObj) {
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSave = () => {
    onUpdateEnvironments(localEnvs);
    if (onUpdateCollections) {
      onUpdateCollections(localCols);
    }
    onClose();
  };

  // Filtered list by search
  const filteredVars = currentVariables.filter(v =>
    v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 font-sans">
      <div className="bg-[#141824] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[700px] max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#181d2c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Variables & Environments Manager</h2>
              <p className="text-xs text-zinc-400">
                Manage global variables, environment overrides, collection variables, and dynamic Postman tokens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Content Split: Left Navigation / Right Variables Table */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Scopes List */}
          <div className="w-64 border-r border-white/10 bg-[#0d1017] p-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              {/* Globals */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 px-2">
                  Global Scope
                </div>
                {localEnvs.filter(e => e.isGlobal).map(env => (
                  <div
                    key={env.id}
                    onClick={() => setSelectedTargetId(env.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                      selectedTargetId === env.id
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">Global Variables</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{env.variables.length}</span>
                  </div>
                ))}
              </div>

              {/* Environments */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 px-2">
                  <span>Environments</span>
                  <button
                    onClick={() => setShowNewEnvInput(true)}
                    className="p-1 hover:bg-white/10 rounded text-orange-400 hover:text-orange-300"
                    title="Add Environment"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {showNewEnvInput && (
                  <form onSubmit={handleCreateNewEnvironment} className="p-2 bg-[#161b26] border border-orange-500/40 rounded-lg mb-2 space-y-1.5 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="e.g. Staging, Production"
                      value={newEnvName}
                      onChange={e => setNewEnvName(e.target.value)}
                      className="w-full bg-[#0d1017] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setShowNewEnvInput(false)}
                        className="px-2 py-0.5 text-[10px] text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2 py-0.5 bg-orange-500 text-white rounded text-[10px] font-medium"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-1">
                  {localEnvs.filter(e => !e.isGlobal).map(env => (
                    <div
                      key={env.id}
                      onClick={() => setSelectedTargetId(env.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                        selectedTargetId === env.id
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="truncate">{env.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {activeEnvId === env.id && (
                          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[9px] rounded font-bold">
                            Active
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500">{env.variables.length}</span>
                        {localEnvs.filter(e => !e.isGlobal).length > 1 && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteEnvironment(env.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collections Variables */}
              {localCols.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 px-2">
                    Collection Variables
                  </div>
                  <div className="space-y-1">
                    {localCols.map(col => (
                      <div
                        key={col.id}
                        onClick={() => setSelectedTargetId('col_' + col.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                          selectedTargetId === 'col_' + col.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FolderArchive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{col.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{(col.variables || []).length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Postman Variables */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 px-2">
                  Built-in Reference
                </div>
                <div
                  onClick={() => setSelectedTargetId('dynamic_variables')}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                    selectedTargetId === 'dynamic_variables'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Dynamic Mock ($)</span>
                  </div>
                  <span className="text-[10px] text-purple-400 font-bold">{DYNAMIC_VARIABLES.length}</span>
                </div>
              </div>
            </div>

            {/* Bottom active switcher */}
            {currentEnv && !currentEnv.isGlobal && (
              <div className="pt-3 border-t border-white/10">
                <button
                  onClick={() => onSetActiveEnv(currentEnv.id)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    activeEnvId === currentEnv.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}
                >
                  {activeEnvId === currentEnv.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Active Environment</span>
                    </>
                  ) : (
                    <span>Set as Active Env</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Main Panel: Variables Grid or Dynamic Cheatsheet */}
          <div className="flex-1 flex flex-col bg-[#11141e] overflow-hidden">
            {isDynamicView ? (
              /* Dynamic Postman Variables Cheatsheet */
              <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Postman Dynamic Mock Variables</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Use these dynamic tokens anywhere in URLs, Headers, Body, or Auth. They generate dynamic mock data automatically on every request run.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DYNAMIC_VARIABLES.map(dyn => {
                    const sample = dyn.generator();
                    const isCopied = copiedId === dyn.key;
                    return (
                      <div
                        key={dyn.key}
                        className="p-3 bg-[#0d1017] border border-white/5 rounded-xl hover:border-purple-500/30 transition-colors flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono font-bold text-purple-300 text-xs">
                              {`{{${dyn.key}}}`}
                            </div>
                            <div className="text-[11px] text-zinc-400">{dyn.description}</div>
                          </div>
                          <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded font-semibold">
                            {dyn.category}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                          <span className="text-zinc-500 font-mono truncate max-w-[200px]">
                            Sample: <span className="text-emerald-400">{sample}</span>
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`{{${dyn.key}}}`);
                              setCopiedId(dyn.key);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="text-zinc-400 hover:text-white flex items-center gap-1 text-[10px]"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Standard Variables Grid */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Panel Header */}
                <div className="p-4 border-b border-white/10 bg-[#151926] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">
                        {isCollectionView ? currentCollection?.name : currentEnv?.name}
                      </h3>
                      {currentEnv?.isGlobal && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] rounded font-semibold">
                          Global Scope
                        </span>
                      )}
                      {isCollectionView && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-semibold">
                          Collection Scope
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Referenced in URLs, headers, or payload templates as <code className="text-orange-300 font-mono">{"{{variableName}}"}</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowBulkImport(!showBulkImport)}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-zinc-300 flex items-center gap-1.5 transition-colors"
                      title="Bulk Add Variables (Key=Value)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                      <span>Bulk Add</span>
                    </button>

                    <button
                      onClick={handleExportJson}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-zinc-300 flex items-center gap-1.5 transition-colors"
                      title="Export as JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>

                    <button
                      onClick={handleAddVariable}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variable</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Import Form Tray */}
                {showBulkImport && (
                  <div className="p-4 bg-[#0d1017] border-b border-white/10 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span>Bulk Paste Variables (KEY=VALUE or KEY,VALUE format per line):</span>
                      <button
                        onClick={() => setShowBulkImport(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                      placeholder={`baseUrl=https://api.myapp.com\nauthToken=eyJhbGciOiJIUzI1NiIs...\nuserId=10492`}
                      className="w-full bg-[#141824] border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowBulkImport(false)}
                        className="px-3 py-1 bg-white/5 text-zinc-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBulkImportSubmit}
                        className="px-4 py-1 bg-orange-500 text-white rounded text-xs font-bold"
                      >
                        Import Variables
                      </button>
                    </div>
                  </div>
                )}

                {/* Filter Search Bar */}
                <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Filter variables by name, value, or description..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0d1017] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 shrink-0">
                    {filteredVars.length} of {currentVariables.length} variables
                  </span>
                </div>

                {/* Variables Table */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase text-zinc-400 px-3 py-1.5 border-b border-white/10">
                    <div className="col-span-1 text-center">Active</div>
                    <div className="col-span-3">Variable Key</div>
                    <div className="col-span-3">Initial Value</div>
                    <div className="col-span-4">Current Value</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {filteredVars.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs">
                      {searchQuery ? (
                        <span>No variables matching "{searchQuery}".</span>
                      ) : (
                        <span>
                          No variables defined yet. Click <strong>Add Variable</strong> or <strong>Bulk Add</strong>.
                        </span>
                      )}
                    </div>
                  ) : (
                    filteredVars.map(item => {
                      const isMasked = item.isSecret && !showSecretMap[item.id];
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 bg-[#0e111a] border border-white/5 rounded-lg text-xs hover:border-white/15 transition-colors"
                        >
                          {/* Enable Checkbox */}
                          <div className="col-span-1 flex justify-center">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={e => handleUpdateVar(item.id, 'enabled', e.target.checked)}
                              className="rounded border-zinc-700 text-orange-500 focus:ring-orange-500"
                            />
                          </div>

                          {/* Variable Key */}
                          <div className="col-span-3">
                            <input
                              type="text"
                              placeholder="e.g. baseUrl"
                              value={item.key}
                              onChange={e => handleUpdateVar(item.id, 'key', e.target.value)}
                              className="w-full bg-transparent px-2 py-1 text-white font-mono text-xs focus:outline-none focus:bg-white/5 rounded"
                            />
                          </div>

                          {/* Initial Value */}
                          <div className="col-span-3">
                            <input
                              type="text"
                              placeholder="Initial fallback"
                              value={item.initialValue || ''}
                              onChange={e => handleUpdateVar(item.id, 'initialValue', e.target.value)}
                              className="w-full bg-transparent px-2 py-1 text-zinc-400 font-mono text-xs focus:outline-none focus:bg-white/5 rounded"
                            />
                          </div>

                          {/* Current Value + Masking */}
                          <div className="col-span-4 flex items-center gap-1 bg-[#141824] rounded px-2 py-0.5 border border-white/5">
                            <input
                              type={isMasked ? 'password' : 'text'}
                              placeholder="Current value"
                              value={item.value}
                              onChange={e => handleUpdateVar(item.id, 'value', e.target.value)}
                              className="w-full bg-transparent text-emerald-300 font-mono text-xs focus:outline-none py-1"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecretMap(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className={`p-1 rounded transition-colors ${
                                item.isSecret ? 'text-orange-400' : 'text-zinc-600 hover:text-zinc-400'
                              }`}
                              title={item.isSecret ? 'Secret Variable' : 'Toggle Secret Masking'}
                            >
                              {item.isSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Delete Action */}
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => handleDeleteVar(item.id)}
                              className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                              title="Delete Variable"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#181d2c] border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
            <span>Variables apply automatically across request builders, headers, scripts, and code export</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-1.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg text-xs transition-colors shadow-sm"
            >
              Save Variables
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
