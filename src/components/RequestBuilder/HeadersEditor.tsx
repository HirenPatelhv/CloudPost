import React from 'react';
import { KeyValueItem, Environment, Collection } from '../../types';
import { ScopedVariable } from '../../services/variableService';
import { VariableInput } from '../Variables/VariableInput';
import { Plus, Trash2 } from 'lucide-react';

interface HeadersEditorProps {
  headers: KeyValueItem[];
  onChange: (headers: KeyValueItem[]) => void;
  disabled?: boolean;
  scopedVariables?: ScopedVariable[];
  environments?: Environment[];
  activeEnvId?: string;
  collection?: Collection;
  onRequestSetAsVariable?: (text: string) => void;
  onQuickUpdateVariable?: (key: string, value: string) => void;
}

export const HeadersEditor: React.FC<HeadersEditorProps> = ({ 
  headers, 
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
    const updated = headers.map(h => (h.id === id ? { ...h, [field]: val } : h));
    onChange(updated);
  };

  const handleAdd = (presetKey?: string, presetVal?: string) => {
    const newItem: KeyValueItem = {
      id: 'hdr_' + Math.random().toString(36).substring(2, 9),
      key: presetKey || '',
      value: presetVal || '',
      enabled: true,
    };
    onChange([...headers, newItem]);
  };

  const handleDelete = (id: string) => {
    onChange(headers.filter(h => h.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Headers ({headers.filter(h => h.enabled && h.key).length})
          </span>
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-[11px] text-zinc-500">Presets:</span>
            <button
              type="button"
              onClick={() => handleAdd('Content-Type', 'application/json')}
              className="text-[11px] text-zinc-400 hover:text-white bg-white/5 px-2 py-0.5 rounded transition-colors"
            >
              + JSON
            </button>
            <button
              type="button"
              onClick={() => handleAdd('Authorization', 'Bearer {{apiKey}}')}
              className="text-[11px] text-zinc-400 hover:text-white bg-white/5 px-2 py-0.5 rounded transition-colors"
            >
              + Bearer
            </button>
          </div>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => handleAdd()}
            className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Header</span>
          </button>
        )}
      </div>

      <div className="border border-white/10 rounded-lg overflow-x-auto bg-[#0d1017]">
        <div className="min-w-[480px]">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase text-zinc-400 px-3 py-2 bg-[#141824] border-b border-white/10">
          <div className="col-span-1 text-center">Active</div>
          <div className="col-span-4">Header Key</div>
          <div className="col-span-6">Value</div>
          <div className="col-span-1 text-center">Action</div>
        </div>

        <div className="divide-y divide-white/5">
          {headers.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">
              No custom headers configured. Click <strong>Add Header</strong> or pick a preset above.
            </div>
          ) : (
            headers.map(item => (
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
                <div className="col-span-4 relative">
                  <VariableInput
                    value={item.key}
                    disabled={disabled}
                    onChange={val => handleUpdate(item.id, 'key', val)}
                    placeholder="e.g. Content-Type, X-API-Key"
                    scopedVariables={scopedVariables}
                    environments={environments}
                    activeEnvId={activeEnvId}
                    collection={collection}
                    onRequestSetAsVariable={onRequestSetAsVariable}
                    onQuickUpdateVariable={onQuickUpdateVariable}
                    className="w-full bg-transparent text-white font-mono text-xs focus:outline-none placeholder-zinc-600"
                  />
                </div>
                <div className="col-span-6">
                  <VariableInput
                    value={item.value}
                    disabled={disabled}
                    onChange={val => handleUpdate(item.id, 'value', val)}
                    placeholder="e.g. application/json or {{apiKey}}"
                    scopedVariables={scopedVariables}
                    environments={environments}
                    activeEnvId={activeEnvId}
                    collection={collection}
                    onRequestSetAsVariable={onRequestSetAsVariable}
                    onQuickUpdateVariable={onQuickUpdateVariable}
                    className="w-full bg-transparent text-emerald-300 font-mono text-xs focus:outline-none placeholder-zinc-600"
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
