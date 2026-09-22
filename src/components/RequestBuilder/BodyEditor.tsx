import React, { useState, useRef } from 'react';
import { BodyConfig, BodyType, FormDataItem, KeyValueItem, Environment, Collection } from '../../types';
import { ScopedVariable } from '../../services/variableService';
import { VariableInput } from '../Variables/VariableInput';
import { Sparkles, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface BodyEditorProps {
  body: BodyConfig;
  onChange: (body: BodyConfig) => void;
  disabled?: boolean;
  scopedVariables?: ScopedVariable[];
  environments?: Environment[];
  activeEnvId?: string;
  collection?: Collection;
  onRequestSetAsVariable?: (text: string) => void;
  onQuickUpdateVariable?: (key: string, value: string) => void;
}

export const BodyEditor: React.FC<BodyEditorProps> = ({ 
  body, 
  onChange, 
  disabled,
  scopedVariables = [],
  environments = [],
  activeEnvId,
  collection,
  onRequestSetAsVariable,
  onQuickUpdateVariable,
}) => {
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [formatSuccess, setFormatSuccess] = useState(false);
  const [rawSelectedText, setRawSelectedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTypeChange = (newType: BodyType) => {
    onChange({ ...body, type: newType });
  };

  const handleBeautifyJson = () => {
    try {
      if (!body.rawText.trim()) return;
      const parsed = JSON.parse(body.rawText);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange({ ...body, rawText: formatted });
      setJsonError(null);
      setFormatSuccess(true);
      setTimeout(() => setFormatSuccess(false), 2000);
    } catch (err: any) {
      setJsonError(`JSON Syntax Error: ${err.message}`);
    }
  };

  const handleRawTextChange = (text: string) => {
    onChange({ ...body, rawText: text });
    if (body.type === 'json' && text.trim()) {
      try {
        JSON.parse(text);
        setJsonError(null);
      } catch (err: any) {
        setJsonError(`JSON Syntax Error: ${err.message}`);
      }
    } else {
      setJsonError(null);
    }
  };

  const handleRawSelect = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    if (end > start && end - start >= 2) {
      const sel = textareaRef.current.value.slice(start, end).trim();
      if (sel && !sel.startsWith('{{') && !sel.endsWith('}}')) {
        setRawSelectedText(sel);
        return;
      }
    }
    setRawSelectedText('');
  };

  // Form-Data handlers
  const handleAddFormData = () => {
    const newItem: FormDataItem = {
      id: 'fd_' + Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      type: 'text',
      enabled: true,
    };
    onChange({ ...body, formData: [...(body.formData || []), newItem] });
  };

  const handleUpdateFormData = (id: string, field: keyof FormDataItem, val: any) => {
    const updated = (body.formData || []).map(item => (item.id === id ? { ...item, [field]: val } : item));
    onChange({ ...body, formData: updated });
  };

  const handleDeleteFormData = (id: string) => {
    onChange({ ...body, formData: (body.formData || []).filter(item => item.id !== id) });
  };

  // URL-Encoded handlers
  const handleAddUrlEncoded = () => {
    const newItem: KeyValueItem = {
      id: 'ue_' + Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      enabled: true,
    };
    onChange({ ...body, urlEncoded: [...(body.urlEncoded || []), newItem] });
  };

  const handleUpdateUrlEncoded = (id: string, field: keyof KeyValueItem, val: any) => {
    const updated = (body.urlEncoded || []).map(item => (item.id === id ? { ...item, [field]: val } : item));
    onChange({ ...body, urlEncoded: updated });
  };

  const handleDeleteUrlEncoded = (id: string) => {
    onChange({ ...body, urlEncoded: (body.urlEncoded || []).filter(item => item.id !== id) });
  };

  return (
    <div className="space-y-3">
      {/* Body Type Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={body.type === 'json' ? 'raw' : body.type}
              disabled={disabled}
              onChange={(e) => {
                const val = e.target.value as any;
                handleTypeChange(val === 'raw' ? 'json' : val);
              }}
              className="appearance-none bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded py-1 pl-2.5 pr-7 text-[11px] text-zinc-300 focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm transition-colors font-mono"
            >
              <option value="none">none</option>
              <option value="form-data">form-data</option>
              <option value="x-www-form-urlencoded">x-www-form-urlencoded</option>
              <option value="raw">raw</option>
              <option value="binary">binary</option>
              <option value="graphql">GraphQL</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-zinc-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          {(body.type === 'raw' || body.type === 'json') && (
            <div className="relative">
              <select
                value={body.type === 'json' ? 'JSON' : 'Text'}
                disabled={disabled}
                onChange={(e) => {
                  const val = e.target.value;
                  handleTypeChange(val === 'JSON' ? 'json' : 'raw');
                }}
                className="appearance-none bg-transparent hover:bg-zinc-800/50 border border-transparent rounded py-1 pl-2.5 pr-6 text-[11px] text-orange-400 focus:outline-none cursor-pointer transition-colors font-mono"
              >
                <option value="Text">Text</option>
                <option value="JavaScript">JavaScript</option>
                <option value="JSON">JSON</option>
                <option value="HTML">HTML</option>
                <option value="XML">XML</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-orange-400">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          )}
        </div>

        {body.type === 'json' && !disabled && (
          <button
            type="button"
            onClick={handleBeautifyJson}
            className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-zinc-300 hover:text-white transition-colors"
          >
            {formatSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-orange-400" />}
            <span>{formatSuccess ? 'Formatted' : 'Beautify JSON'}</span>
          </button>
        )}
      </div>

      {/* None View */}
      {body.type === 'none' && (
        <div className="p-8 text-center text-xs text-zinc-500 border border-white/5 rounded-lg bg-[#0d1017]">
          This request does not include a body payload. Select <strong>JSON</strong> or <strong>form-data</strong> above to configure payload data.
        </div>
      )}

      {/* JSON and RAW View */}
      {(body.type === 'json' || body.type === 'raw') && (
        <div className="space-y-2 relative">
          {rawSelectedText && onRequestSetAsVariable && !disabled && (
            <div className="absolute right-4 top-2 z-40">
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  onRequestSetAsVariable(rawSelectedText);
                  setRawSelectedText('');
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-[11px] font-bold shadow-lg border border-orange-400/50"
              >
                <Sparkles className="w-3 h-3 text-yellow-200" />
                <span>Set as variable</span>
              </button>
            </div>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={10}
              placeholder={body.type === 'json' ? '{\n  "key": "value",\n  "userId": "{{userId}}",\n  "requestId": "{{$guid}}"\n}' : 'Raw payload string with {{variables}}'}
              value={body.rawText || ''}
              disabled={disabled}
              onChange={e => handleRawTextChange(e.target.value)}
              onSelect={handleRawSelect}
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-4 font-mono text-xs text-emerald-300 focus:outline-none focus:border-orange-500 resize-y leading-relaxed"
              spellCheck={false}
            />
          </div>
          {jsonError && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}
        </div>
      )}

      {/* Form-Data View */}
      {body.type === 'form-data' && (
        <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0d1017]">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase text-zinc-400 px-3 py-2 bg-[#141824] border-b border-white/10">
            <div className="col-span-1 text-center">Active</div>
            <div className="col-span-4">Key</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-4">Value / File</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          <div className="divide-y divide-white/5">
            {(!body.formData || body.formData.length === 0) ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No form-data fields. Click Add below.
              </div>
            ) : (
              body.formData.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center px-3 py-1.5 text-xs">
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      disabled={disabled}
                      onChange={e => handleUpdateFormData(item.id, 'enabled', e.target.checked)}
                      className="rounded border-zinc-700 text-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div className="col-span-4">
                    <VariableInput
                      value={item.key}
                      disabled={disabled}
                      onChange={val => handleUpdateFormData(item.id, 'key', val)}
                      placeholder="Key"
                      scopedVariables={scopedVariables}
                      environments={environments}
                      activeEnvId={activeEnvId}
                      collection={collection}
                      onRequestSetAsVariable={onRequestSetAsVariable}
                      onQuickUpdateVariable={onQuickUpdateVariable}
                      className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={item.type}
                      disabled={disabled}
                      onChange={e => handleUpdateFormData(item.id, 'type', e.target.value as 'text' | 'file')}
                      className="bg-[#141824] border border-white/10 rounded px-1.5 py-0.5 text-zinc-300 text-xs focus:outline-none"
                    >
                      <option value="text">Text</option>
                      <option value="file">File</option>
                    </select>
                  </div>
                  <div className="col-span-4">
                    <VariableInput
                      value={item.value}
                      disabled={disabled}
                      onChange={val => handleUpdateFormData(item.id, 'value', val)}
                      placeholder={item.type === 'file' ? 'File path / reference' : 'Value (supports {{var}})'}
                      scopedVariables={scopedVariables}
                      environments={environments}
                      activeEnvId={activeEnvId}
                      collection={collection}
                      onRequestSetAsVariable={onRequestSetAsVariable}
                      onQuickUpdateVariable={onQuickUpdateVariable}
                      className="w-full bg-transparent text-emerald-300 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFormData(item.id)}
                        className="p-1 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {!disabled && (
            <div className="p-2 border-t border-white/5 bg-[#141824]">
              <button
                type="button"
                onClick={handleAddFormData}
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium px-2 py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Form Field</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* URL-Encoded View */}
      {body.type === 'x-www-form-urlencoded' && (
        <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0d1017]">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase text-zinc-400 px-3 py-2 bg-[#141824] border-b border-white/10">
            <div className="col-span-1 text-center">Active</div>
            <div className="col-span-5">Key</div>
            <div className="col-span-5">Value</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          <div className="divide-y divide-white/5">
            {(!body.urlEncoded || body.urlEncoded.length === 0) ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No url-encoded fields. Click Add below.
              </div>
            ) : (
              body.urlEncoded.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center px-3 py-1.5 text-xs">
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      disabled={disabled}
                      onChange={e => handleUpdateUrlEncoded(item.id, 'enabled', e.target.checked)}
                      className="rounded border-zinc-700 text-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div className="col-span-5">
                    <VariableInput
                      value={item.key}
                      disabled={disabled}
                      onChange={val => handleUpdateUrlEncoded(item.id, 'key', val)}
                      placeholder="Key"
                      scopedVariables={scopedVariables}
                      environments={environments}
                      activeEnvId={activeEnvId}
                      collection={collection}
                      onRequestSetAsVariable={onRequestSetAsVariable}
                      onQuickUpdateVariable={onQuickUpdateVariable}
                      className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="col-span-5">
                    <VariableInput
                      value={item.value}
                      disabled={disabled}
                      onChange={val => handleUpdateUrlEncoded(item.id, 'value', val)}
                      placeholder="Value (supports {{var}})"
                      scopedVariables={scopedVariables}
                      environments={environments}
                      activeEnvId={activeEnvId}
                      collection={collection}
                      onRequestSetAsVariable={onRequestSetAsVariable}
                      onQuickUpdateVariable={onQuickUpdateVariable}
                      className="w-full bg-transparent text-emerald-300 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUrlEncoded(item.id)}
                        className="p-1 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {!disabled && (
            <div className="p-2 border-t border-white/5 bg-[#141824]">
              <button
                type="button"
                onClick={handleAddUrlEncoded}
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium px-2 py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Field</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
