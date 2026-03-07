'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import Avatar from '@/components/ui/Avatar';
import { updateMessInfo, regenerateInviteCode } from '@/lib/firestore';
import { Copy, Share2, RefreshCw, Check, Edit2 } from 'lucide-react';

export default function MessInfoSheet({ open, onClose, mess, manager, myRole, messId }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mess?.name || '');
  const [address, setAddress] = useState(mess?.address || '');
  const [description, setDescription] = useState(mess?.description || '');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const isManager = myRole === 'manager';

  const copyCode = () => {
    navigator.clipboard.writeText(mess?.inviteCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join ${mess?.name} on Messify`,
        text: `Use invite code: ${mess?.inviteCode}`,
        url: window.location.href,
      });
    } else {
      copyCode();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await updateMessInfo(messId, { name: name.trim(), address: address.trim(), description: description.trim() });
    setSaving(false);
    setEditing(false);
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate invite code? The old code will stop working.')) return;
    setRegenerating(true);
    await regenerateInviteCode(messId);
    setRegenerating(false);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={mess?.name}>
      <div className="px-5 pb-6 space-y-4">
        {/* Mess Info */}
        {!editing ? (
          <div>
            {mess?.address && <p className="text-sm text-gray-500">{mess.address}</p>}
            {mess?.description && <p className="text-sm text-gray-600 mt-1">{mess.description}</p>}
            {isManager && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 mt-2 text-sm font-bold" style={{ color: '#E60023' }}>
                <Edit2 size={14} /> Edit Mess Info
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Mess name" />
            <input className="inp" value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" />
            <textarea className="inp resize-none" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: '#E60023' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Manager */}
        {manager && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
            <Avatar name={manager.name} photoURL={manager.photoURL} avatarColor={manager.avatarColor} size={42} />
            <div>
              <p className="font-bold text-gray-900 text-sm">{manager.name}</p>
              <span className="badge-manager text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFE0E4', color: '#E60023' }}>Manager</span>
            </div>
          </div>
        )}

        {/* Invite Code */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Invite Code</p>
          <div className="bg-gray-50 rounded-2xl p-4 border-2 border-dashed border-gray-200">
            <p className="text-2xl font-black text-center tracking-widest text-gray-900 font-mono mb-3">
              {mess?.inviteCode}
            </p>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all"
style={{ background: copied ? '#DCFCE7' : '#FFF0F1', color: copied ? '#16A34A' : '#E60023', border: `1.5px solid ${copied ? '#16A34A' : '#E60023'}` }}              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={shareCode}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white"
                style={{ background: '#E60023' }}
              >
                <Share2 size={16} /> Share
              </button>
            </div>
          </div>
          {isManager && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-gray-400"
            >
              <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
              Regenerate code
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
