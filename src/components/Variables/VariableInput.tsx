import React, { useState, useRef, useEffect } from 'react';
import { Variable, Environment, Collection } from '../../types';
import { 
  ScopedVariable, 
  VariableScope, 
  getAllAvailableVariablesForAutocomplete,
  extractVariableTokens 
} from '../../services/variableService';
import { VariableHoverCard } from './VariableHoverCard';
import { 
  Sparkles, 
  Layers, 
  Globe, 
  FolderArchive, 
  Plus, 
  Key, 
  AlertCircle 
} from 'lucide-react';

interface VariableInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  scopedVariables?: ScopedVariable[];
  environments?: Environment[];
  activeEnvId?: string;
  collection?: Collection;
  onRequestSetAsVariable?: (text: string) => void;
  onQuickUpdateVariable?: (key: string, value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  type?: string;
  autoFocus?: boolean;
}

export const VariableInput: React.FC<VariableInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className = '',
  scopedVariables = [],
  environments = [],
  activeEnvId,
  collection,
  onRequestSetAsVariable,
  onQuickUpdateVariable,
  onKeyDown,
  type = 'text',
  autoFocus,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Autocomplete state
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownQuery, setDropdownQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);

  // Text selection "Set as variable" badge state
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  // Hover card state
  const [hoveredVar, setHoveredVar] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  const allVars = getAllAvailableVariablesForAutocomplete(scopedVariables);

  // Filter autocomplete suggestions based on query
  const filteredVars = allVars.filter(v => 
    v.key.toLowerCase().includes(dropdownQuery.toLowerCase()) ||
    (v.description && v.description.toLowerCase().includes(dropdownQuery.toLowerCase()))
  );

  // Detect `{{` trigger while typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    const targetPos = e.target.selectionStart || 0;
    setCursorPos(targetPos);

    // Look back from cursor to see if `{{` was typed and not yet closed
    const textBeforeCursor = val.slice(0, targetPos);
    const lastOpenIndex = textBeforeCursor.lastIndexOf('{{');
    const lastCloseIndex = textBeforeCursor.lastIndexOf('}}');

    if (lastOpenIndex !== -1 && lastOpenIndex > lastCloseIndex) {
      const query = textBeforeCursor.slice(lastOpenIndex + 2);
      // Only show if query doesn't contain spaces/newlines
      if (!query.includes(' ') && !query.includes('\n')) {
        setDropdownQuery(query);
        setShowDropdown(true);
        setSelectedIndex(0);
        return;
      }
    }

    setShowDropdown(false);
  };

  // Detect text selection for "Set as variable" action
  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;

    if (end > start && end - start >= 2) {
      const selected = input.value.slice(start, end).trim();
      if (selected && !selected.startsWith('{{') && !selected.endsWith('}}')) {
        setSelectedText(selected);
        setSelectionRange({ start, end });
        return;
      }
    }
    setSelectedText('');
    setSelectionRange(null);
  };

  // Keyboard navigation for dropdown
  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredVars.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredVars.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredVars.length) % filteredVars.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertVariable(filteredVars[selectedIndex]?.key || dropdownQuery);
        return;
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Insert chosen variable at cursor location
  const insertVariable = (varKey: string) => {
    if (!inputRef.current) return;
    const val = value;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastOpenIndex = textBeforeCursor.lastIndexOf('{{');

    let newVal = '';
    let newCursor = 0;

    if (lastOpenIndex !== -1) {
      const before = val.slice(0, lastOpenIndex);
      const after = val.slice(cursorPos);
      newVal = `${before}{{${varKey}}}${after}`;
      newCursor = (before + `{{${varKey}}}`).length;
    } else {
      newVal = `${val}{{${varKey}}}`;
      newCursor = newVal.length;
    }

    onChange(newVal);
    setShowDropdown(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setSelectedText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper for scope icon & color
  const getScopeBadge = (scope: VariableScope) => {
    switch (scope) {
      case 'environment':
        return <span className="flex items-center gap-0.5 text-[9px] bg-orange-500/20 text-orange-300 px-1 py-0.2 rounded font-mono font-bold">E</span>;
      case 'collection':
        return <span className="flex items-center gap-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-mono font-bold">C</span>;
      case 'global':
        return <span className="flex items-center gap-0.5 text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-mono font-bold">G</span>;
      case 'dynamic':
        return <span className="flex items-center gap-0.5 text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-mono font-bold">$</span>;
    }
  };

  const detectedTokens = extractVariableTokens(value);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input */}
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={handleInputChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDownInternal}
        className={className}
      />

      {/* Floating Selection "Set as variable" button */}
      {selectedText && onRequestSetAsVariable && !disabled && (
        <div className="absolute right-2 -top-8 z-40 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              onRequestSetAsVariable(selectedText);
              setSelectedText('');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-[11px] font-bold shadow-lg transition-transform hover:scale-105 border border-orange-400/50 cursor-pointer"
            title={`Set "${selectedText}" as a reusable Postman variable`}
          >
            <Sparkles className="w-3 h-3 text-yellow-200 animate-pulse" />
            <span>Set as variable</span>
          </button>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] max-w-md bg-[#141824] border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in duration-100">
          <div className="px-3 py-1.5 bg-[#181d2c] border-b border-white/10 flex items-center justify-between text-[10px] text-zinc-400 font-semibold uppercase">
            <span>Variables & Dynamic Values</span>
            <span>Tab / ↵ to insert</span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
            {filteredVars.length === 0 ? (
              <div className="p-3 text-center text-zinc-400 text-xs">
                No matching variables for "<code>{dropdownQuery}</code>"
              </div>
            ) : (
              filteredVars.map((item, idx) => (
                <div
                  key={item.key + idx}
                  onClick={() => insertVariable(item.key)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                    selectedIndex === idx
                      ? 'bg-orange-500/20 text-white font-medium'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {getScopeBadge(item.scope)}
                    <span className="font-mono text-xs font-semibold text-white truncate">
                      {item.key}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] truncate max-w-[160px] text-zinc-400">
                    <span className="font-mono text-emerald-400 truncate">
                      {item.isSecret ? '••••••••' : item.value}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick inline create button in dropdown footer */}
          {onRequestSetAsVariable && dropdownQuery.trim() && !dropdownQuery.startsWith('$') && (
            <div className="p-2 bg-[#0e111a] border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  onRequestSetAsVariable(dropdownQuery.trim());
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 hover:text-orange-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create new variable "<strong>{dropdownQuery.trim()}</strong>"</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Variable Hover Inspector */}
      {hoveredVar && (
        <div 
          className="absolute left-0 top-full mt-2 z-50"
          onMouseEnter={() => setHoveredVar(hoveredVar)}
          onMouseLeave={() => setHoveredVar(null)}
        >
          <VariableHoverCard
            varName={hoveredVar}
            scopedVariables={scopedVariables}
            environments={environments}
            activeEnvId={activeEnvId}
            collection={collection}
            onQuickUpdateValue={onQuickUpdateVariable}
            onRequestCreate={varName => {
              onRequestSetAsVariable?.(varName);
              setHoveredVar(null);
            }}
            onClose={() => setHoveredVar(null)}
          />
        </div>
      )}
    </div>
  );
};
