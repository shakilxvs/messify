'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import Avatar from '@/components/ui/Avatar';
import { approveJoinRequest, rejectJoinRequest, addManualMember, removeMember } from '@/lib/firestore';
import { Check, X, UserPlus, Phone, User, UserX } from 'lucide-react';

export default function MembersSheet({ open, onClose, messId, pendingRequests, members, isManager, myMemberId }) {
  const [tab, setTab] = useState('requests');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleAddManual = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addManualMember(messId, { name, phone });
    setSaving(false);
    setName(''); setPhone('');
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  const handleRemove = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from the mess?`)) return;
    await removeMember(messId, memberId);
  };

  const tabs = [
    { key: 'requests', label: 'Requests' },
    { key: 'add',      label: 'Add Manually' },
    { key: 'remove',   label: 'Remove Member' },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Manage Members">
      <div className="flex px-5 gap-1.5 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all"
            style={tab === t.key ? { background: '#E60023', color: 'white' } : { background: '#F0F0F0', color: '#666' }}>
            {t.label}
            {t.key === 'requests' && pendingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                style={{ background: tab === 'requests' ? 'white' : '#E60023', color: tab === 'requests' ? '#E60023' : 'white' }}>
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* REQUESTS TAB */}
      {tab === 'requests' && (
        <div className="px-5 pb-6">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-bold text-gray-600">No pending requests</p>
              <p className="text-xs text-gray-400 mt-1">Share the invite code to get join requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                  <Avatar name={req.name} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{req.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Wants to join</p>
                  </div>
                  <button onClick={() => approveJoinRequest(messId, req.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-white flex-shrink-0"
                    style={{ background: '#16A34A' }}>
                    <Check size={13} /> Approve
                  </button>
                  <button onClick={() => rejectJoinRequest(messId, req.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-gray-200 text-gray-600 flex-shrink-0">
                    <X size={13} /> Reject
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD MANUALLY TAB */}
      {tab === 'add' && (
        <div className="px-5 pb-6 space-y-3">
          <p className="text-xs text-gray-400">Add a member who doesn't have a Messify account yet.</p>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="inp pl-9" placeholder="Full name *" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="inp pl-9" placeholder="Phone number (optional)" value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
          </div>
          <button onClick={handleAddManual} disabled={saving || !name.trim()}
            className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            style={{ background: done ? '#16A34A' : '#E60023' }}>
            <UserPlus size={18} />
            {saving ? 'Adding…' : done ? 'Member Added!' : 'Add Member'}
          </button>
        </div>
      )}

      {/* REMOVE MEMBER TAB */}
      {tab === 'remove' && (
        <div className="px-5 pb-6">
          {(!members || members.filter(m => m.id !== myMemberId).length === 0) ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">👥</div>
              <p className="font-bold text-gray-600">No other members</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(members || []).filter(m => m.id !== myMemberId).map(m => (
                <div key={m.id} className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3">
                  <Avatar name={m.name} photoURL={m.photoURL} avatarColor={m.avatarColor} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                  </div>
                  <button onClick={() => handleRemove(m.id, m.name)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-red-500 bg-red-50 flex-shrink-0">
                    <UserX size={13} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
