import React, { useState } from 'react';
import { Variable, Environment, Collection } from '../../types';
import { ScopedVariable, VariableScope } from '../../services/variableService';
import { Layers, Globe, FolderArchive, Sparkles, AlertCircle, Edit2, Check, Key, Plus } from 'lucide-react';

interface VariableHoverCardProps {
  varName: string;
  scopedVariables: ScopedVariable[];
  environments: Environment[];
  activeEnvId?: string;
  collection?: Collection;
  onQuickUpdateValue?: (varKey: string, newValue: string) => void;
  onRequestCreate?: (varName: string) => void;
  onClose: () => void;
}

export const VariableHoverCard: React.FC<VariableHoverCardProps> = ({
  varName,
  scopedVariables,
  onQuickUpdateValue,
  onRequestCreate,
  onClose,
}) => {
  const variable = scopedVariables.find(v => v.key === varName);
  const isDynamic = varName.startsWith('$');
  const isUnresolved = !variable && !isDynamic;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(variable?.value || '');

  const handleSaveEdit = () => {
    if (variable && onQuickUpdateValue) {
      onQuickUpdateValue(variable.key, editValue);
      setIsEditing(false);
    }
  };

  const getScopeBadge = (scope: VariableScope) => {
    switch (scope) {
      case 'environment':
        return {
          label: 'Environment',
          icon: <Layers className="w-3 h-3 text-orange-400" />,
          bg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        };
      case 'collection':
        return {
          label: 'Collection',
          icon: <FolderArchive className="w-3 h-3 text-emerald-400" />,
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        };
      case 'global':
        return {
          label: 'Global',
          icon: <Globe className="w-3 h-3 text-blue-400" />,
          bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        };
      case 'dynamic':
        return {
          label: 'Dynamic',
          icon: <Sparkles className="w-3 h-3 text-purple-400" />,
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        };
    }
  };

  const badge = variable ? getScopeBadge(variable.scope) : (isDynamic ? getScopeBadge('dynamic') : null);

  return (
    <div className="w-72 bg-[#141824] border border-white/15 rounded-xl shadow-2xl p-3 text-xs z-50 animate-in fade-in zoom-in-95 duration-100 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-mono font-bold text-white text-xs truncate">
            {`{{${varName}}}`}
          </span>
        </div>
        {badge && (
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}>
            {badge.icon}
            <span>{badge.label}</span>
          </span>
        )}
      </div>

      {/* Body Content */}
      {isUnresolved ? (
        <div className="space-y-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 flex items-start gap-1.5 text-[11px]">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Unresolved Variable</div>
              <div className="text-zinc-400 text-[10px]">
                Variable <code>{varName}</code> is not defined in the active environment, globals, or collection.
              </div>
            </div>
          </div>

          {onRequestCreate && (
            <button
              onClick={() => onRequestCreate(varName)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg text-xs transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Define "{varName}"</span>
            </button>
          )}
        </div>
      ) : isDynamic ? (
        <div className="space-y-1.5">
          <div className="text-[11px] text-zinc-400">
            Postman Dynamic Mock Variable. Generates random simulated value on each request execution.
          </div>
          <div className="p-2 bg-[#0d1017] rounded border border-white/5 font-mono text-[11px] text-purple-300">
            {variable?.value || 'Dynamic Generator Active'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Scope Source info */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Scope Source:</span>
            <span className="font-medium text-white">{variable?.scopeName}</span>
          </div>

          {/* Current Value */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Current Value:</span>
              {!isEditing && onQuickUpdateValue && (
                <button
                  onClick={() => {
                    setEditValue(variable?.value || '');
                    setIsEditing(true);
                  }}
                  className="text-orange-400 hover:text-orange-300 flex items-center gap-1 text-[10px]"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  <span>Quick Edit</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type={variable?.isSecret ? 'password' : 'text'}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1 bg-[#0d1017] border border-orange-500/50 rounded px-2 py-1 text-xs text-emerald-300 font-mono focus:outline-none"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-1 bg-orange-500 hover:bg-orange-600 rounded text-white"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-1.5 bg-[#0d1017] border border-white/5 rounded font-mono text-emerald-300 text-xs truncate">
                {variable?.isSecret ? '••••••••' : variable?.value || '<empty>'}
              </div>
            )}
          </div>

          {/* Initial Value */}
          {variable?.initialValue && (
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Initial Value:</span>
              <span className="font-mono text-zinc-400 truncate max-w-[150px]">
                {variable.initialValue}
              </span>
            </div>
          )}

          {/* Description if any */}
          {variable?.description && (
            <div className="text-[10px] text-zinc-400 italic">
              {variable.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
