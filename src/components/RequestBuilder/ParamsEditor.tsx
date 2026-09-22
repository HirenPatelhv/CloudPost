import React from 'react';
import { KeyValueItem, Environment, Collection } from '../../types';
import { ScopedVariable } from '../../services/variableService';
import { VariableInput } from '../Variables/VariableInput';
import { Plus, Trash2 } from 'lucide-react';

interface ParamsEditorProps {
  params: KeyValueItem[];
  onChange: (params: KeyValueItem[]) => void;
  disabled?: boolean;
  scopedVariables?: ScopedVariable[];
  environments?: Environment[];
  activeEnvId?: string;
  collection?: Collection;
  onRequestSetAsVariable?: (text: string) => void;
  onQuickUpdateVariable?: (key: string, value: string) => void;
}

export const ParamsEditor: React.FC<ParamsEditorProps> = ({ 
  params, 
  onChange, 
  disabled,
  scopedVariables = [],
  environments = [],
  activeEnvId,
  collection,
  onRequestSetAsVariable,
  onQuickUpdateVariable,
}) => {
  const handleUpdate = (id: string, field: keyof KeyValueItem, val: any) => {
    const updated = params.map(p => (p.id === id ? { ...p, [field]: val } : p));
    onChange(updated);
  };

  const handleAdd = () => {
    const newItem: KeyValueItem = {
      id: 'param_' + Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      description: '',
      enabled: true,
    };
    onChange([...params, newItem]);
  };

  const handleDelete = (id: string) => {
    onChange(params.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Query Parameters ({params.filter(p => p.enabled && p.key).length})
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Param</span>
          </button>
        )}
      </div>

      <div className="border border-white/10 rounded-lg overflow-x-auto bg-[#0d1017]">
        <div className="min-w-[500px]">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase text-zinc-400 px-3 py-2 bg-[#141824] border-b border-white/10">
          <div className="col-span-1 text-center">Active</div>
          <div className="col-span-3">Key</div>
          <div className="col-span-4">Value</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-1 text-center">Action</div>
        </div>

        <div className="divide-y divide-white/5">
          {params.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">
              No query parameters added. Type above or click <strong>Add Param</strong>.
            </div>
          ) : (
            params.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center px-3 py-1.5 text-xs">
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    disabled={disabled}
                    onChange={e => handleUpdate(item.id, 'enabled', e.target.checked)}
                    className="rounded border-zinc-700 text-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-3">
                  <VariableInput
                    value={item.key}
                    disabled={disabled}
                    onChange={val => handleUpdate(item.id, 'key', val)}
                    placeholder="Key"
                    scopedVariables={scopedVariables}
                    environments={environments}
                    activeEnvId={activeEnvId}
                    collection={collection}
                    onRequestSetAsVariable={onRequestSetAsVariable}
                    onQuickUpdateVariable={onQuickUpdateVariable}
                    className="w-full bg-transparent text-white font-mono text-xs focus:outline-none placeholder-zinc-600"
                  />
                </div>
                <div className="col-span-4">
                  <VariableInput
                    value={item.value}
                    disabled={disabled}
                    onChange={val => handleUpdate(item.id, 'value', val)}
                    placeholder="Value (e.g. {{userId}})"
                    scopedVariables={scopedVariables}
                    environments={environments}
                    activeEnvId={activeEnvId}
                    collection={collection}
                    onRequestSetAsVariable={onRequestSetAsVariable}
                    onQuickUpdateVariable={onQuickUpdateVariable}
                    className="w-full bg-transparent text-emerald-300 font-mono text-xs focus:outline-none placeholder-zinc-600"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description || ''}
                    disabled={disabled}
                    onChange={e => handleUpdate(item.id, 'description', e.target.value)}
                    className="w-full bg-transparent text-zinc-400 text-xs focus:outline-none placeholder-zinc-600"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      </div>
    </div>
  );
};
