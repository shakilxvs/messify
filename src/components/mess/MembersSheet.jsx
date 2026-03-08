'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Avatar from '@/components/ui/Avatar';
import {
  approveJoinRequest, rejectJoinRequest,
  addManualMember, removeMember,
  approveLeaveRequest, rejectLeaveRequest,
} from '@/lib/firestore';
import { Check, X, UserPlus, Phone, User, UserX, LogOut } from 'lucide-react';

export default function MembersSheet({
  open, onClose, messId, pendingRequests, members, isManager, myMemberId, myRole,
}) {
  const [tab, setTab]       = useState('requests');
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [confirming, setConf]   = useState(false);

  const isMgr = myRole === 'manager';  // Only manager can remove members

  const leaveRequests = (members || []).filter(m => m.leaveRequested && m.id !== myMemberId);
  const totalBadge    = pendingRequests.length + leaveRequests.length;

  const ask = (cfg) => setConfirm(cfg);
  const runConfirm = async () => {
    setConf(true);
    await confirm.action();
    setConf(false);
    setConfirm(null);
  };

  const handleAddManual = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addManualMember(messId, { name, phone });
    setSaving(false); setName(''); setPhone('');
    setDone(true); setTimeout(() => setDone(false), 2000);
  };

  const handleRemove = (memberId, memberName) => ask({
    type: 'danger',
    title: `Remove ${memberName}?`,
    message: 'Their meals and expenses will be removed from the totals.',
    confirmLabel: 'Remove Member',
    action: () => removeMember(messId, memberId),
  });

  const handleApproveLeave = (memberId, memberName) => ask({
    type: 'warning',
    title: `Approve leave for ${memberName}?`,
    message: 'They will be removed from the mess immediately.',
    confirmLabel: 'Approve Leave',
    action: () => approveLeaveRequest(messId, memberId),
  });

  const tabs = [
    { key: 'requests', label: 'Join Requests', badge: pendingRequests.length },
    { key: 'leave',    label: 'Leave Requests', badge: leaveRequests.length },
    { key: 'add',      label: 'Add Member' },
    ...(isMgr ? [{ key: 'remove', label: 'Remove Member' }] : []),
  ];

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Manage Members">
        <div className="flex px-5 gap-1.5 mb-4 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap"
              style={tab === t.key ? { background: '#E60023', color: 'white' } : { background: '#F0F0F0', color: '#666' }}>
              {t.label}
              {t.badge > 0 && (
                <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{ background: tab === t.key ? 'white' : '#E60023', color: tab === t.key ? '#E60023' : 'white' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* JOIN REQUESTS */}
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
                      className="flex items-center gap-1 px-3 py-2 rounded-xl font-bold text-xs text-white flex-shrink-0"
                      style={{ background: '#16A34A' }}>
                      <Check size={12} /> Approve
                    </button>
                    <button onClick={() => rejectJoinRequest(messId, req.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl font-bold text-xs bg-gray-200 text-gray-600 flex-shrink-0">
                      <X size={12} /> Reject
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEAVE REQUESTS */}
        {tab === 'leave' && (
          <div className="px-5 pb-6">
            {leaveRequests.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🏠</div>
                <p className="font-bold text-gray-600">No leave requests</p>
                <p className="text-xs text-gray-400 mt-1">Members can request to leave from their profile</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map(m => (
                  <div key={m.id} className="bg-orange-50 rounded-2xl p-4 flex items-center gap-3 border border-orange-200">
                    <Avatar name={m.name} photoURL={m.photoURL} avatarColor={m.avatarColor} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{m.name}</p>
                      <p className="text-xs text-orange-500 mt-0.5 font-semibold">Requested to leave</p>
                    </div>
                    <button onClick={() => handleApproveLeave(m.id, m.name)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl font-bold text-xs text-white flex-shrink-0"
                      style={{ background: '#16A34A' }}>
                      <Check size={12} /> Approve
                    </button>
                    <button onClick={() => rejectLeaveRequest(messId, m.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl font-bold text-xs bg-gray-200 text-gray-600 flex-shrink-0">
                      <X size={12} /> Reject
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADD MANUALLY */}
        {tab === 'add' && (
          <div className="px-5 pb-6 space-y-3">
            <p className="text-xs text-gray-400">Add a member who doesn't have a Messify account yet.</p>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Full Name *</label>
              <input
                className="inp"
                placeholder="Enter full name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Phone Number (optional)</label>
              <input
                className="inp"
                placeholder="Enter phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                type="tel"
              />
            </div>
            <button onClick={handleAddManual} disabled={saving || !name.trim()}
              className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              style={{ background: done ? '#16A34A' : '#E60023' }}>
              <UserPlus size={18} />
              {saving ? 'Adding…' : done ? 'Member Added!' : 'Add Member'}
            </button>
          </div>
        )}

        {/* REMOVE MEMBER (manager only) */}
        {tab === 'remove' && isMgr && (
          <div className="px-5 pb-6">
            {(members || []).filter(m => m.id !== myMemberId).length === 0 ? (
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

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        type={confirm?.type}
        loading={confirming}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
