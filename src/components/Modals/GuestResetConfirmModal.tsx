import React from 'react';
import { ShieldAlert, RefreshCw, X, AlertTriangle, Sparkles, Check } from 'lucide-react';

interface GuestResetConfirmModalProps {
  isOpen: boolean;
  currentGuestShortCode: string;
  onConfirm: () => void;
  onCancel: () => void;
  onOpenRegister?: () => void;
}

export const GuestResetConfirmModal: React.FC<GuestResetConfirmModalProps> = ({
  isOpen,
  currentGuestShortCode,
  onConfirm,
  onCancel,
  onOpenRegister,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-md bg-[#131724] border border-amber-500/30 rounded-2xl shadow-2xl p-6 text-zinc-200 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Cancel and close"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Warning Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Change Guest User Session?
            </h3>
            <p className="text-xs text-amber-400/90 font-medium">
              Confirmation required before changing guest session
            </p>
          </div>
        </div>

        {/* Current Guest Identifier Display */}
        <div className="bg-[#181d2d] border border-white/10 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-zinc-400">Current Guest User:</span>
            <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Guest #{currentGuestShortCode || 'LOCAL'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Active</span>
        </div>

        {/* Warning / Informational Message */}
        <div className="space-y-3 mb-6 text-xs text-zinc-300 leading-relaxed">
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Are you sure you want to change your guest user? Starting a fresh guest session assigns a new guest identity. Your existing workspace and request data will remain stored in browser memory under your current guest ID.
            </p>
          </div>

          <p className="text-zinc-400 text-[11.5px]">
            To save your workspaces permanently and access them across devices or collaborate with team members, consider registering a free account.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Cancel (Keep Current)
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirm();
              }}
              id="confirm-guest-reset-btn"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Confirm & Change Guest</span>
            </button>
          </div>

          {onOpenRegister && (
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-zinc-400 text-[11px]">Want permanent cloud backup?</span>
              <button
                type="button"
                onClick={() => {
                  onCancel();
                  onOpenRegister();
                }}
                className="text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 text-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Register Account Instead</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
