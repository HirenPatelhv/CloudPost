import React, { useState } from 'react';
import { Workspace, Role, WorkspaceMember } from '../../types';
import { Users, Mail, Shield, UserCheck, Trash2, Link, Check, Plus, AlertCircle } from 'lucide-react';

interface ShareModalProps {
  workspace: Workspace;
  currentRole: Role;
  onClose: () => void;
  onInviteMember: (email: string, role: Role) => void;
  onChangeMemberRole: (userId: string, newRole: Role) => void;
  onRemoveMember: (userId: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  workspace,
  currentRole,
  onClose,
  onInviteMember,
  onChangeMemberRole,
  onRemoveMember,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('EDITOR');
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = currentRole === 'ADMIN';

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please provide a valid corporate or personal email address.');
      return;
    }
    if (workspace.members.some(m => m.email.toLowerCase() === email.trim().toLowerCase())) {
      setErrorMsg('A team member with this email already belongs to this workspace.');
      return;
    }

    setErrorMsg('');
    onInviteMember(email.trim(), role);
    setEmail('');
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/join/${workspace.id}?inviteToken=tkn_${Math.random().toString(36).substring(2, 9)}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#141824] border border-white/10 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#181d2c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="font-bold text-white text-base">
                Manage Workspace Collaborators
              </h2>
              <p className="text-xs text-zinc-400">
                Workspace: <span className="text-white font-medium">{workspace.name}</span> ({workspace.type} Workspace)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Invite Input Box */}
          {isAdmin ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Invite New Team Member
              </label>
              <form onSubmit={handleInvite} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="teammate@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0d1017] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="bg-[#0d1017] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="ADMIN">Admin (Full Control)</option>
                  <option value="EDITOR">Editor (Can Edit)</option>
                  <option value="VIEWER">Viewer (Read Only)</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Invite</span>
                </button>
              </form>
              {errorMsg && (
                <div className="text-red-400 text-xs flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              <span>You have <strong>{currentRole}</strong> access. Only Workspace Admins can invite new members or revoke permissions.</span>
            </div>
          )}

          {/* Shareable Link Box */}
          <div className="p-3.5 bg-[#0e111a] border border-white/10 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Link className="w-4 h-4 text-orange-400" />
              <span>Anyone with the secret invite link can request access</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded text-xs flex items-center gap-1.5 transition-colors font-medium"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Active & Pending Members ({workspace.members.length})
              </span>
              <span className="text-[11px] text-zinc-500">
                RBAC Access Control
              </span>
            </div>

            <div className="border border-white/10 rounded-lg divide-y divide-white/5 bg-[#0e111a] overflow-hidden">
              {workspace.members.map((member) => (
                <div key={member.userId} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                      alt={member.name}
                      className="w-8 h-8 rounded-full border border-white/20 object-cover shrink-0"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{member.name}</span>
                        {member.status === 'PENDING' && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded font-medium">
                            Pending Invite
                          </span>
                        )}
                        {member.status === 'ACTIVE' && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-medium flex items-center gap-0.5">
                            <UserCheck className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <span className="text-zinc-400 text-[11px] truncate block">{member.email}</span>
                    </div>
                  </div>

                  {/* Role Selector & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin ? (
                      <select
                        value={member.role}
                        onChange={(e) => onChangeMemberRole(member.userId, e.target.value as Role)}
                        className="bg-[#141824] border border-white/10 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    ) : (
                      <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-zinc-300 text-xs font-medium">
                        {member.role}
                      </span>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => onRemoveMember(member.userId)}
                        title="Remove member"
                        className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-white/5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#181d2c] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
