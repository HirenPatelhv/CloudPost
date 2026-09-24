import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Columns, Rows, RotateCcw, GripVertical, GripHorizontal } from 'lucide-react';

interface PaneSplitterProps {
  layoutMode: 'columns' | 'rows';
  ratio: number; // percentage (15 to 85)
  onChange: (newRatio: number) => void;
  onToggleLayout?: () => void;
  onReset?: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  minRatio?: number;
  maxRatio?: number;
  className?: string;
}

export const PaneSplitter: React.FC<PaneSplitterProps> = ({
  layoutMode,
  ratio,
  onChange,
  onToggleLayout,
  onReset,
  containerRef,
  minRatio = 18,
  maxRatio = 82,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isDraggingRef = useRef(false);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    // If user clicked directly on one of the action buttons, don't drag
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = layoutMode === 'columns' ? 'col-resize' : 'row-resize';
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let newRatio: number;
    if (layoutMode === 'columns') {
      const offset = clientX - rect.left;
      newRatio = (offset / rect.width) * 100;
    } else {
      const offset = clientY - rect.top;
      newRatio = (offset / rect.height) * 100;
    }

    const clamped = Math.max(minRatio, Math.min(maxRatio, Math.round(newRatio)));
    onChange(clamped);
  }, [containerRef, layoutMode, maxRatio, minRatio, onChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [handleMove]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onReset) onReset();
    else onChange(50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.max(minRatio, ratio - 5));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.min(maxRatio, ratio + 5));
    } else if (e.key === 'Home' || e.key === 'End' || e.key === 'Enter') {
      e.preventDefault();
      if (onReset) onReset();
      else onChange(50);
    }
  };

  const isColumns = layoutMode === 'columns';

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={isColumns ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(ratio)}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Drag to resize panes | Double-click to reset 50:50 | Click layout button to switch view"
      className={`relative shrink-0 flex items-center justify-center transition-colors select-none group z-20 outline-none focus-visible:ring-1 focus-visible:ring-orange-500 ${
        isColumns
          ? 'w-2 hover:w-2 cursor-col-resize border-x border-white/5 bg-[#0f121c] hover:bg-orange-500/20 active:bg-orange-500/40'
          : 'h-2 hover:h-2 cursor-row-resize border-y border-white/5 bg-[#0f121c] hover:bg-orange-500/20 active:bg-orange-500/40'
      } ${isDragging ? 'bg-orange-500/40 border-orange-500/50' : ''} ${className}`}
    >
      {/* Expanded invisible hit area for easy grabbing */}
      <div
        className={`absolute pointer-events-auto ${
          isColumns ? '-inset-x-2 inset-y-0 cursor-col-resize' : '-inset-y-2 inset-x-0 cursor-row-resize'
        }`}
      />

      {/* Visual Accent Line */}
      <div
        className={`rounded-full transition-all duration-150 ${
          isColumns
            ? `w-0.5 h-10 ${isDragging || isHovered ? 'bg-orange-400 h-16' : 'bg-white/20'}`
            : `h-0.5 w-10 ${isDragging || isHovered ? 'bg-orange-400 w-16' : 'bg-white/20'}`
        }`}
      />

      {/* Floating Center Control Pill on Hover or Drag */}
      <div
        className={`absolute transition-all duration-200 pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#181c2b] border border-orange-500/40 shadow-xl text-[10px] text-zinc-300 font-mono ${
          isHovered || isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
        } ${isColumns ? 'top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2' : 'left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2'}`}
      >
        {isColumns ? (
          <GripVertical className="w-3 h-3 text-orange-400 shrink-0" />
        ) : (
          <GripHorizontal className="w-3 h-3 text-orange-400 shrink-0" />
        )}

        <span className="text-[9px] font-semibold text-orange-200 whitespace-nowrap">
          {Math.round(ratio)}:{Math.round(100 - ratio)}
        </span>

        {/* 50:50 Reset Button */}
        {Math.round(ratio) !== 50 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onReset) onReset();
              else onChange(50);
            }}
            title="Reset to 50:50 ratio"
            className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5 text-zinc-300 hover:text-orange-400" />
          </button>
        )}

        {/* Toggle Stacked vs Side-by-Side directly on the splitter */}
        {onToggleLayout && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLayout();
            }}
            title={isColumns ? "Switch to Stacked View (Top/Bottom)" : "Switch to Side-by-Side View (Left/Right)"}
            className="p-0.5 rounded hover:bg-orange-500/20 text-zinc-400 hover:text-orange-300 transition-colors cursor-pointer flex items-center gap-0.5 ml-0.5"
          >
            {isColumns ? (
              <Rows className="w-2.5 h-2.5 text-orange-400" />
            ) : (
              <Columns className="w-2.5 h-2.5 text-orange-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
