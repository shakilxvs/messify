'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomSheet from '@/components/ui/BottomSheet';
import Avatar from '@/components/ui/Avatar';
import {
  updateMessInfo, regenerateInviteCode, updateMemberRole,
  transferManager, deleteMess, removeMember,
} from '@/lib/firestore';
import { RefreshCw, Shield, UserX, Copy, Share2, Check, Crown, AlertTriangle } from 'lucide-react';

export default function MessSettingsSheet({ open, onClose, mess, members, myRole, myMemberId, messId }) {
  const router = useRouter();
  const [tab, setTab] = useState('info');
  const [name, setName] = useState(mess?.name || '');
  const [address, setAddress] = useState(mess?.address || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isManager = myRole === 'manager';
  const otherMembers = members.filter(m => m.id !== myMemberId);

  const handleSaveInfo = async () => {
    setSaving(true);
    await updateMessInfo(messId, { name: name.trim(), address: address.trim() });
    setSaving(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await regenerateInviteCode(messId);
    setRegenerating(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(mess?.inviteCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = () => {
    if (navigator.share) navigator.share({ title: `Join ${mess?.name} on Messify`, text: `Invite code: ${mess?.inviteCode}` });
    else copyCode();
  };

  const handleTransferManager = async (memberId) => {
    if (!confirm('Transfer manager role? You will become a regular member.')) return;
    await transferManager(messId, myMemberId, memberId);
    onClose();
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from the mess?`)) return;
    await removeMember(messId, memberId);
  };

  const handleDeleteMess = async () => {
    setDeleting(true);
    await deleteMess(messId);
    router.push('/dashboard');
  };

  const tabs = [
    { key: 'info', label: 'Mess Info' },
    { key: 'invite', label: 'Invite Code' },
    { key: 'roles', label: 'Roles' },
    ...(isManager ? [{ key: 'danger', label: '⚠️ Danger' }] : []),
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Mess Settings">
      <div className="flex px-5 gap-1.5 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all"
            style={tab === t.key ? { background: '#E60023', color: 'white' } : { background: '#F0F0F0', color: '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="px-5 pb-6 space-y-3">
          <input className="inp" placeholder="Mess name *" value={name} onChange={e => setName(e.target.value)} />
          <input className="inp" placeholder="Address (optional)" value={address} onChange={e => setAddress(e.target.value)} />
          <button onClick={handleSaveInfo} disabled={saving || !name.trim()}
            className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-50" style={{ background: '#E60023' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}

      {tab === 'invite' && (
        <div className="px-5 pb-6">
          <div className="bg-gray-50 rounded-2xl p-5 border-2 border-dashed border-gray-200 text-center mb-4">
            <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Invite Code</p>
            <p className="text-3xl font-black tracking-widest text-gray-900 font-mono">{mess?.inviteCode}</p>
          </div>
          <div className="flex gap-2 mb-3">
            <button onClick={copyCode}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all"
              style={{ background: copied ? '#DCFCE7' : '#FFF0F1', color: copied ? '#16A34A' : '#E60023', border: `1.5px solid ${copied ? '#16A34A' : '#E60023'}` }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={shareCode}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white"
              style={{ background: '#E60023' }}>
              <Share2 size={16} /> Share
            </button>
          </div>
          {isManager && (
            <button onClick={handleRegenerate} disabled={regenerating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100">
              <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
              {regenerating ? 'Regenerating…' : 'Regenerate Code'}
            </button>
          )}
        </div>
      )}

      {tab === 'roles' && (
        <div className="px-5 pb-6 space-y-3">
          {otherMembers.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">No other members yet.</p>
          )}
          {otherMembers.map(m => (
            <div key={m.id} className="bg-gray-50 rounded-2xl p-3">
              <div className="flex items-center gap-3 mb-2">
                <Avatar name={m.name} photoURL={m.photoURL} avatarColor={m.avatarColor} size={38} />
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-900">{m.name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={m.role === 'manager' ? { background: '#FFE0E4', color: '#E60023' } :
                           m.role === 'comanager' ? { background: '#EDE9FE', color: '#7C3AED' } :
                           { background: '#F0F0F0', color: '#666' }}>
                    {m.role === 'comanager' ? 'Co-Manager' : m.role === 'manager' ? 'Manager' : 'Member'}
                  </span>
                </div>
              </div>
              {isManager && (
                <div className="flex gap-2 flex-wrap">
                  {m.role !== 'comanager' && m.role !== 'manager' && (
                    <button onClick={() => updateMemberRole(messId, m.id, 'comanager')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                      <Shield size={11} /> Make Co-Manager
                    </button>
                  )}
                  {m.role === 'comanager' && (
                    <button onClick={() => updateMemberRole(messId, m.id, 'member')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-200 text-gray-600">
                      Remove Co-Manager
                    </button>
                  )}
                  {m.role !== 'manager' && (
                    <button onClick={() => handleTransferManager(m.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: '#FFE0E4', color: '#E60023' }}>
                      <Crown size={11} /> Make Manager
                    </button>
                  )}
                  <button onClick={() => handleRemoveMember(m.id, m.name)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-500 ml-auto">
                    <UserX size={11} /> Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'danger' && isManager && (
        <div className="px-5 pb-6">
          <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-red-500" />
              <p className="font-black text-red-700 text-sm">Delete This Mess</p>
            </div>
            <p className="text-xs text-red-500 mb-4">This will permanently archive the mess. All data will be preserved but no one can add new entries.</p>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl font-bold text-white text-sm" style={{ background: '#DC2626' }}>
                Delete Mess
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-red-600 text-center">Are you absolutely sure?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-600">Cancel</button>
                  <button onClick={handleDeleteMess} disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#DC2626' }}>
                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
