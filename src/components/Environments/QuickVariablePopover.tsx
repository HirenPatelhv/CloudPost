import React, { useState } from 'react';
import { Variable, Environment, Collection } from '../../types';
import { ScopedVariable, VariableScope, DYNAMIC_VARIABLES } from '../../services/variableService';
import { 
  Globe, 
  Layers, 
  Key, 
  ExternalLink, 
  Plus, 
  Search, 
  FolderArchive, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Check, 
  Edit2 
} from 'lucide-react';

interface QuickVariablePopoverProps {
  variables: ScopedVariable[];
  environments: Environment[];
  activeEnvId?: string;
  currentCollection?: Collection;
  onOpenManager: () => void;
  onQuickAddVariable: (target: { scope: VariableScope; targetId: string; variable: Variable }) => void;
  onQuickUpdateVariable: (key: string, value: string) => void;
  onClose: () => void;
}

export const QuickVariablePopover: React.FC<QuickVariablePopoverProps> = ({
  variables,
  environments,
  activeEnvId,
  currentCollection,
  onOpenManager,
  onQuickAddVariable,
  onQuickUpdateVariable,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'env' | 'global' | 'collection' | 'dynamic'>('all');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [newScope, setNewScope] = useState<VariableScope>('environment');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const activeEnv = environments.find(e => e.id === activeEnvId && !e.isGlobal);
  const globalEnv = environments.find(e => e.isGlobal) || environments[0];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    let targetId = globalEnv?.id || 'env_global';
    if (newScope === 'environment') {
      targetId = activeEnv ? activeEnv.id : (environments.find(e => !e.isGlobal)?.id || 'env_dev');
    } else if (newScope === 'collection' && currentCollection) {
      targetId = currentCollection.id;
    }

    const newVar: Variable = {
      id: 'var_' + Math.random().toString(36).substring(2, 9),
      key: newKey.trim().replace(/^\{\{|\}\}$/g, ''),
      value: newVal,
      initialValue: newVal,
      enabled: true,
      isSecret: false,
    };

    onQuickAddVariable({
      scope: newScope,
      targetId,
      variable: newVar,
    });

    setNewKey('');
    setNewVal('');
    setShowAddForm(false);
  };

  const handleSaveEdit = (key: string) => {
    onQuickUpdateVariable(key, editVal);
    setEditingKey(null);
  };

  // Filter variables by active tab and search
  let displayList: (ScopedVariable | { key: string; value: string; scope: 'dynamic'; scopeName: string; description?: string })[] = [];

  if (activeTab === 'dynamic') {
    displayList = DYNAMIC_VARIABLES.map(d => ({
      key: d.key,
      value: d.generator(),
      scope: 'dynamic' as const,
      scopeName: 'Dynamic ($)',
      description: d.description,
    }));
  } else {
    displayList = variables.filter(v => {
      if (activeTab === 'env' && v.scope !== 'environment') return false;
      if (activeTab === 'global' && v.scope !== 'global') return false;
      if (activeTab === 'collection' && v.scope !== 'collection') return false;
      return true;
    });
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    displayList = displayList.filter(v => 
      v.key.toLowerCase().includes(q) || 
      v.value.toLowerCase().includes(q) ||
      (v.description && v.description.toLowerCase().includes(q))
    );
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-[#141824] border border-white/15 rounded-2xl shadow-2xl z-50 p-4 text-xs animate-in fade-in zoom-in-95 duration-100 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <Key className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">Environment & Variables</span>
            <div className="text-[10px] text-zinc-400">
              {activeEnv ? (
                <span className="text-orange-400 font-medium">{activeEnv.name} active</span>
              ) : (
                <span>Globals only</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2 py-1 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 rounded-lg text-[11px] font-semibold transition-colors"
            title="Add Variable"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenManager();
            }}
            className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] p-1 hover:bg-white/5 rounded transition-colors"
            title="Open Environment Manager"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Quick Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="p-3 bg-[#0d1017] border border-orange-500/30 rounded-xl mb-3 space-y-2 animate-in fade-in duration-100">
          <div className="flex items-center justify-between text-[11px] font-semibold text-orange-400">
            <span>Quick Add Variable</span>
            <select
              value={newScope}
              onChange={e => setNewScope(e.target.value as VariableScope)}
              className="bg-[#141824] border border-white/10 text-white rounded px-2 py-0.5 text-[10px]"
            >
              {activeEnv && <option value="environment">Env: {activeEnv.name}</option>}
              <option value="global">Globals</option>
              {currentCollection && <option value="collection">Collection</option>}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Variable key (e.g. token)"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              className="bg-[#141824] border border-white/10 rounded px-2 py-1 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Value"
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              className="bg-[#141824] border border-white/10 rounded px-2 py-1 text-xs text-emerald-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2 py-0.5 text-zinc-400 hover:text-white text-[11px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-[11px] font-bold"
            >
              Save Variable
            </button>
          </div>
        </form>
      )}

      {/* Scope Tabs */}
      <div className="flex items-center gap-1 pb-2 border-b border-white/10 mb-2 overflow-x-auto text-[11px]">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            activeTab === 'all' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-400 hover:text-white'
          }`}
        >
          All ({variables.length})
        </button>
        <button
          onClick={() => setActiveTab('env')}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            activeTab === 'env' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Env ({variables.filter(v => v.scope === 'environment').length})
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            activeTab === 'global' ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Globals ({variables.filter(v => v.scope === 'global').length})
        </button>
        {currentCollection && (
          <button
            onClick={() => setActiveTab('collection')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              activeTab === 'collection' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Collection
          </button>
        )}
        <button
          onClick={() => setActiveTab('dynamic')}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            activeTab === 'dynamic' ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Dynamic ($)
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
        <input
          type="text"
          placeholder="Filter variables..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0d1017] border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
        />
      </div>

      {/* Variable List */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {displayList.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-xs">
            No variables found. Click <strong>Add</strong> to create one.
          </div>
        ) : (
          displayList.map(v => {
            const isEditing = editingKey === v.key;
            const isSecret = 'isSecret' in v && v.isSecret;
            const showSecret = showSecrets[v.key];

            return (
              <div
                key={v.key}
                className="p-2 bg-[#0e111a] border border-white/5 rounded-lg flex flex-col gap-1 hover:border-white/15 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono text-orange-300 font-bold text-xs truncate">
                      {`{{${v.key}}}`}
                    </span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                      v.scope === 'environment'
                        ? 'bg-orange-500/20 text-orange-300'
                        : v.scope === 'collection'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : v.scope === 'global'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {v.scopeName || v.scope}
                    </span>
                  </div>

                  {v.scope !== 'dynamic' && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isSecret && (
                        <button
                          type="button"
                          onClick={() => setShowSecrets(prev => ({ ...prev, [v.key]: !prev[v.key] }))}
                          className="text-zinc-400 hover:text-white p-0.5"
                        >
                          {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKey(v.key);
                            setEditVal(v.value);
                          }}
                          className="text-zinc-400 hover:text-orange-300 p-0.5"
                          title="Edit variable value"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      className="flex-1 bg-[#141824] border border-orange-500/50 rounded px-2 py-0.5 text-xs text-emerald-300 font-mono focus:outline-none"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(v.key);
                        if (e.key === 'Escape') setEditingKey(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(v.key)}
                      className="p-1 bg-orange-500 hover:bg-orange-600 rounded text-white"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="font-mono text-zinc-300 truncate text-[11px]">
                    {isSecret && !showSecret ? '••••••••' : v.value || '<empty>'}
                  </div>
                )}

                {v.description && (
                  <div className="text-[10px] text-zinc-500 truncate">
                    {v.description}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
