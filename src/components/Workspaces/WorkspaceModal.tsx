import React, { useState } from 'react';
import { Layers, Users, User } from 'lucide-react';

interface WorkspaceModalProps {
  onClose: () => void;
  onCreateWorkspace: (name: string, description: string, type: 'PERSONAL' | 'TEAM') => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  onClose,
  onCreateWorkspace,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PERSONAL' | 'TEAM'>('TEAM');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }
    onCreateWorkspace(name.trim(), description.trim(), type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#141824] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 bg-[#181d2c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-400" />
            <h2 className="font-bold text-white text-base">Create New Workspace</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Workspace Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Payments Microservice or Analytics API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              autoFocus
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of collections and teams in this workspace"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0d1017] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Workspace Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('PERSONAL')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  type === 'PERSONAL'
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-white/10 bg-[#0d1017] text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                  <User className="w-4 h-4 text-orange-400" />
                  <span>Personal</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Private to you only. Ideal for sandbox tests.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setType('TEAM')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  type === 'TEAM'
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-white/10 bg-[#0d1017] text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                  <Users className="w-4 h-4 text-orange-400" />
                  <span>Team Workspace</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Share collections with teammates and assign RBAC roles.
                </p>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg text-xs transition-colors shadow-sm"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
