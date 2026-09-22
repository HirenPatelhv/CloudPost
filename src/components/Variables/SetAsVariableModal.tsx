import React, { useState } from 'react';
import { Environment, Collection, Variable } from '../../types';
import { VariableScope } from '../../services/variableService';
import { 
  Sparkles, 
  Layers, 
  Globe, 
  FolderArchive, 
  Eye, 
  EyeOff, 
  Check, 
  Key, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export interface SetAsVariableModalProps {
  initialKey?: string;
  initialValue?: string;
  initialScope?: VariableScope;
  environments: Environment[];
  activeEnvId?: string;
  currentCollection?: Collection;
  onSave: (target: {
    scope: VariableScope;
    targetId: string; // envId or collectionId
    variable: Variable;
  }) => void;
  onClose: () => void;
}

export const SetAsVariableModal: React.FC<SetAsVariableModalProps> = ({
  initialKey = '',
  initialValue = '',
  initialScope,
  environments,
  activeEnvId,
  currentCollection,
  onSave,
  onClose,
}) => {
  // Generate default clean key name from initial key or initial value
  const sanitizeKey = (str: string) => {
    return str
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 40) || 'new_variable';
  };

  const [varKey, setVarKey] = useState<string>(
    initialKey ? sanitizeKey(initialKey) : (initialValue.length < 30 ? sanitizeKey(initialValue) : 'var_token')
  );
  const [currentValue, setCurrentValue] = useState<string>(initialValue);
  const [initialVal, setInitialVal] = useState<string>(initialValue);
  const [isSecret, setIsSecret] = useState<boolean>(false);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');

  // Default scope
  const activeEnv = environments.find(e => e.id === activeEnvId && !e.isGlobal);
  const globalEnv = environments.find(e => e.isGlobal) || environments[0];

  const [selectedScope, setSelectedScope] = useState<VariableScope>(
    initialScope || (activeEnv ? 'environment' : (currentCollection ? 'collection' : 'global'))
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    activeEnv ? activeEnv.id : (currentCollection ? currentCollection.id : globalEnv?.id || 'env_global')
  );

  const [error, setError] = useState<string | null>(null);

  const handleScopeChange = (scope: VariableScope) => {
    setSelectedScope(scope);
    if (scope === 'environment') {
      if (activeEnv) {
        setSelectedTargetId(activeEnv.id);
      } else {
        const firstNonGlobal = environments.find(e => !e.isGlobal);
        if (firstNonGlobal) setSelectedTargetId(firstNonGlobal.id);
      }
    } else if (scope === 'global') {
      setSelectedTargetId(globalEnv?.id || 'env_global');
    } else if (scope === 'collection' && currentCollection) {
      setSelectedTargetId(currentCollection.id);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = varKey.trim().replace(/^\{\{|\}\}$/g, '');
    if (!cleanKey) {
      setError('Variable name cannot be empty');
      return;
    }

    const newVar: Variable = {
      id: 'var_' + Math.random().toString(36).substring(2, 9),
      key: cleanKey,
      value: currentValue,
      initialValue: initialVal || currentValue,
      enabled: true,
      isSecret,
      description: description.trim() || undefined,
    };

    onSave({
      scope: selectedScope,
      targetId: selectedTargetId,
      variable: newVar,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#141824] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#181d2c] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Set as Variable</h2>
              <p className="text-xs text-zinc-400">
                Create a reusable Postman variable across your active scope
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Scope Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Select Scope
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Environment Scope */}
              <button
                type="button"
                onClick={() => handleScopeChange('environment')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  selectedScope === 'environment'
                    ? 'bg-orange-500/15 border-orange-500/50 text-white ring-1 ring-orange-500/30'
                    : 'bg-[#0e111a] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Layers className="w-3.5 h-3.5 text-orange-400" />
                  <span>Environment</span>
                </div>
                <span className="text-[10px] text-zinc-400 truncate">
                  {activeEnv ? activeEnv.name : 'Choose Env'}
                </span>
              </button>

              {/* Global Scope */}
              <button
                type="button"
                onClick={() => handleScopeChange('global')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  selectedScope === 'global'
                    ? 'bg-blue-500/15 border-blue-500/50 text-white ring-1 ring-blue-500/30'
                    : 'bg-[#0e111a] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Global</span>
                </div>
                <span className="text-[10px] text-zinc-400 truncate">All Workspaces</span>
              </button>

              {/* Collection Scope */}
              <button
                type="button"
                onClick={() => handleScopeChange('collection')}
                disabled={!currentCollection}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  selectedScope === 'collection'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white ring-1 ring-emerald-500/30'
                    : !currentCollection
                    ? 'bg-[#0e111a]/40 border-transparent text-zinc-600 cursor-not-allowed'
                    : 'bg-[#0e111a] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Collection</span>
                </div>
                <span className="text-[10px] text-zinc-400 truncate">
                  {currentCollection ? currentCollection.name : 'No active col'}
                </span>
              </button>
            </div>

            {/* If Environment Scope and multiple envs available, show selector */}
            {selectedScope === 'environment' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 shrink-0">Target Environment:</span>
                <select
                  value={selectedTargetId}
                  onChange={e => setSelectedTargetId(e.target.value)}
                  className="bg-[#0e111a] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  {environments.filter(e => !e.isGlobal).map(env => (
                    <option key={env.id} value={env.id}>
                      {env.name} {env.id === activeEnvId ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Variable Name / Key */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Variable Name
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-orange-400 font-mono font-bold text-xs">
                {"{{"}
              </div>
              <input
                type="text"
                value={varKey}
                onChange={e => {
                  setVarKey(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. baseUrl, authToken, userId"
                className="w-full bg-[#0d1017] border border-white/10 rounded-lg pl-8 pr-8 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                autoFocus
              />
              <div className="absolute right-3 top-2.5 text-orange-400 font-mono font-bold text-xs">
                {"}}"}
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Referenced as <span className="text-orange-300 font-mono">{`{{${varKey || 'variableName'}}}`}</span> in any URL, header, or body
            </p>
          </div>

          {/* Variable Value (Current Value) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Current Value
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSecret(!isSecret)}
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors ${
                    isSecret ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Key className="w-3 h-3" />
                  <span>{isSecret ? 'Secret Variable' : 'Plain Text'}</span>
                </button>
                {isSecret && (
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-zinc-400 hover:text-white p-0.5"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            <input
              type={isSecret && !showSecret ? 'password' : 'text'}
              value={currentValue}
              onChange={e => {
                setCurrentValue(e.target.value);
                if (!initialVal) setInitialVal(e.target.value);
              }}
              placeholder="Enter variable value"
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Initial Value (Optional) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Initial Value <span className="text-zinc-500 font-normal">(Shared with workspace collaborators)</span>
            </label>
            <input
              type="text"
              value={initialVal}
              onChange={e => setInitialVal(e.target.value)}
              placeholder="Initial fallback value"
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Description <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. JWT Token for OAuth authentication"
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg text-xs transition-colors shadow-md flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Set Variable</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
