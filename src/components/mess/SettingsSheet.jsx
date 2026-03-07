'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import Avatar from '@/components/ui/Avatar';
import { updateMemberRole, removeMember } from '@/lib/firestore';
import { Shield, ShieldCheck, User, UserMinus, ChevronDown, ChevronUp } from 'lucide-react';

const ROLES = [
  {
    key: 'manager',
    label: 'Manager',
    desc: 'Full access — add, edit, delete everything, manage members',
    icon: ShieldCheck,
    style: { background: '#FFE0E4', color: '#E60023' },
  },
  {
    key: 'comanager',
    label: 'Co-Manager',
    desc: 'Can add, edit, delete entries and approve join requests',
    icon: Shield,
    style: { background: '#EDE9FE', color: '#7C3AED' },
  },
  {
    key: 'member',
    label: 'Member',
    desc: 'View-only — can see own data and download own PDF',
    icon: User,
    style: { background: '#F0F0F0', color: '#666' },
  },
];

export default function SettingsSheet({ open, onClose, members, messId, currentUserId }) {
  const [expandedMember, setExpandedMember] = useState(null);
  const [saving, setSaving] = useState(null);

  const handleRoleChange = async (memberId, role) => {
    setSaving(memberId + role);
    await updateMemberRole(messId, memberId, role);
    setSaving(null);
  };

  const handleRemove = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from this mess? Their data will be preserved.`)) return;
    setSaving(memberId + 'remove');
    await removeMember(messId, memberId);
    setSaving(null);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Manage Members & Roles">
      <div className="px-5 pb-8 space-y-3">

        {/* Role legend */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Role Permissions</p>
          {ROLES.map(r => {
            const Icon = r.icon;
            return (
              <div key={r.key} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={r.style}>
                  <Icon size={15} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{r.label}</p>
                  <p className="text-xs text-gray-400">{r.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs font-black text-gray-500 uppercase tracking-wider pt-2">Members</p>

        {members.map(m => {
          const isExpanded = expandedMember === m.id;
          const isMe = m.userId === currentUserId;
          const currentRole = ROLES.find(r => r.key === m.role) || ROLES[2];
          const CurrentIcon = currentRole.icon;

          return (
            <div key={m.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
              {/* Member row */}
              <button
                onClick={() => setExpandedMember(isExpanded ? null : m.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <Avatar name={m.name} photoURL={m.photoURL} avatarColor={m.avatarColor} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                    {isMe && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={currentRole.style}>
                      <CurrentIcon size={11} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: currentRole.style.color }}>
                      {currentRole.label}
                    </span>
                  </div>
                </div>
                {!isMe && (
                  isExpanded
                    ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
                    : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Role picker (expanded, not for self) */}
              {isExpanded && !isMe && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                  <p className="text-xs font-bold text-gray-400 mb-2">Change Role</p>
                  {ROLES.map(role => {
                    const RIcon = role.icon;
                    const isActive = m.role === role.key;
                    const isSaving = saving === m.id + role.key;
                    return (
                      <button
                        key={role.key}
                        disabled={isActive || !!saving}
                        onClick={() => handleRoleChange(m.id, role.key)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all border-2 text-left"
                        style={{
                          borderColor: isActive ? role.style.color : '#F0F0F0',
                          background: isActive ? role.style.background : 'transparent',
                          opacity: saving && !isSaving ? 0.5 : 1,
                        }}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={role.style}>
                          <RIcon size={15} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">{role.label}</p>
                          <p className="text-xs text-gray-400">{role.desc}</p>
                        </div>
                        {isActive && (
                          <span className="text-xs font-black px-2 py-1 rounded-lg" style={role.style}>
                            Active
                          </span>
                        )}
                        {isSaving && (
                          <span className="text-xs text-gray-400 font-medium">Saving…</span>
                        )}
                      </button>
                    );
                  })}

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(m.id, m.name)}
                    disabled={!!saving}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-red-100 bg-red-50 text-left mt-3 transition-all hover:bg-red-100"
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                      <UserMinus size={15} style={{ color: '#E60023' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#E60023' }}>Remove from Mess</p>
                      <p className="text-xs text-red-400">Data is preserved in history</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}