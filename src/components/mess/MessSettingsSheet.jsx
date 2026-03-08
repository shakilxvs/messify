'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Avatar from '@/components/ui/Avatar';
import {
  updateMessInfo, regenerateInviteCode, updateMemberRole,
  transferManager, deleteMess, removeMember, updateMessCharges,
} from '@/lib/firestore';
import {
  Edit2, RefreshCw, Shield, UserX, Trash2,
  Copy, Share2, Check, Crown, AlertTriangle,
  Building2, ToggleLeft, ToggleRight,
} from 'lucide-react';

export default function MessSettingsSheet({ open, onClose, mess, members, myRole, myMemberId, messId }) {
  const router = useRouter();
  const [tab, setTab]           = useState('info');
  const [name, setName]         = useState(mess?.name || '');
  const [address, setAddress]   = useState(mess?.address || '');
  const [saving, setSaving]     = useState(false);
  const [copied, setCopied]     = useState(false);
  const [regenerating, setReg]  = useState(false);

  // Mess-level charges
  const [useShared,       setUseShared]       = useState(mess?.useMessLevelCharges || false);
  const [messRent,        setMessRent]        = useState(mess?.messRent || 0);
  const [messSvc,         setMessSvc]         = useState(mess?.messServiceCharge || 0);
  const [messOther,       setMessOther]       = useState(mess?.messOtherCharge || 0);
  const [messOtherLabel,  setMessOtherLabel]  = useState(mess?.messOtherChargeLabel || '');
  const [savingCharges,   setSavingCharges]   = useState(false);

  // Confirm dialogs
  const [confirm, setConfirm] = useState(null); // { type, title, message, action }
  const [confirming, setConfirming] = useState(false);

  const isManager   = myRole === 'manager';
  const isComanager = myRole === 'comanager';
  const canEdit     = isManager || isComanager;

  const otherMembers = members.filter(m => m.id !== myMemberId);

  const ask = (cfg) => setConfirm(cfg);
  const closeConfirm = () => setConfirm(null);
  const runConfirm = async () => {
    setConfirming(true);
    await confirm.action();
    setConfirming(false);
    setConfirm(null);
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    await updateMessInfo(messId, { name: name.trim(), address: address.trim() });
    setSaving(false);
  };

  const handleRegenerate = () => ask({
    type: 'warning',
    title: 'Regenerate Code?',
    message: 'The old invite code will stop working immediately.',
    confirmLabel: 'Regenerate',
    action: async () => {
      setReg(true);
      await regenerateInviteCode(messId);
      setReg(false);
    },
  });

  const copyCode = () => {
    navigator.clipboard.writeText(mess?.inviteCode || '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const shareCode = () => {
    if (navigator.share) navigator.share({ title: `Join ${mess?.name} on Messify`, text: `Invite code: ${mess?.inviteCode}` });
    else copyCode();
  };

  const handleMakeComanager = (memberId, memberName) => ask({
    type: 'info',
    title: 'Make Co-Manager?',
    message: `${memberName} will be able to manage meals, expenses and payments.`,
    confirmLabel: 'Make Co-Manager',
    action: () => updateMemberRole(messId, memberId, 'comanager'),
  });

  const handleRemoveComanager = (memberId, memberName) => ask({
    type: 'warning',
    title: 'Remove Co-Manager?',
    message: `${memberName} will go back to being a regular member.`,
    confirmLabel: 'Remove',
    action: () => updateMemberRole(messId, memberId, 'member'),
  });

  const handleTransferManager = (memberId, memberName) => ask({
    type: 'danger',
    title: 'Transfer Manager Role?',
    message: `${memberName} will become the new manager. You will become a regular member.`,
    confirmLabel: 'Transfer',
    action: async () => { await transferManager(messId, myMemberId, memberId); onClose(); },
  });

  const handleRemoveMember = (memberId, memberName) => ask({
    type: 'danger',
    title: `Remove ${memberName}?`,
    message: 'All their meals and expenses will be removed from the totals.',
    confirmLabel: 'Remove Member',
    action: () => removeMember(messId, memberId),
  });

  const handleDeleteMess = () => ask({
    type: 'danger',
    title: 'Delete This Mess?',
    message: 'This will permanently archive the mess. No one will be able to add new entries.',
    confirmLabel: 'Yes, Delete',
    action: async () => { await deleteMess(messId); router.push('/dashboard'); },
  });

  const handleSaveCharges = async () => {
    setSavingCharges(true);
    await updateMessCharges(messId, {
      useMessLevelCharges: useShared,
      messRent: Number(messRent) || 0,
      messServiceCharge: Number(messSvc) || 0,
      messOtherCharge: Number(messOther) || 0,
      messOtherChargeLabel: messOtherLabel.trim(),
    });
    setSavingCharges(false);
  };

  const tabs = [
    { key: 'info',    label: 'Mess Info' },
    { key: 'invite',  label: 'Invite Code' },
    { key: 'charges', label: 'Charges' },
    { key: 'roles',   label: 'Roles' },
    ...(isManager ? [{ key: 'danger', label: 'Danger', icon: true }] : []),
  ];

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Mess Settings">
        {/* Tabs */}
        <div className="flex px-5 gap-1.5 mb-4 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all"
              style={tab === t.key
                ? { background: t.key === 'danger' ? '#DC2626' : '#E60023', color: 'white' }
                : { background: '#F0F0F0', color: t.key === 'danger' ? '#DC2626' : '#666' }}>
              {t.key === 'danger' && <AlertTriangle size={11} />}
              {t.label}
            </button>
          ))}
        </div>

        {/* INFO TAB */}
        {tab === 'info' && (
          <div className="px-5 pb-6 space-y-3">
            <input className="inp" placeholder="Mess name *" value={name} onChange={e => setName(e.target.value)} />
            <input className="inp" placeholder="Address (optional)" value={address} onChange={e => setAddress(e.target.value)} />
            <button onClick={handleSaveInfo} disabled={saving || !name.trim() || !canEdit}
              className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-50" style={{ background: '#E60023' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* INVITE TAB */}
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

        {/* CHARGES TAB */}
        {tab === 'charges' && (
          <div className="px-5 pb-6 space-y-4">
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-1">Monthly Charges</p>
              <p className="text-xs text-blue-500">These charges renew automatically each month. You can set shared charges for the whole apartment (divided equally) or individual charges per member.</p>
            </div>

            {/* Toggle shared vs individual */}
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
              <div>
                <p className="font-bold text-sm text-gray-900">Shared Apartment Charges</p>
                <p className="text-xs text-gray-400">Divide equally among all members</p>
              </div>
              <button onClick={() => setUseShared(p => !p)} disabled={!isManager}>
                {useShared
                  ? <ToggleRight size={32} style={{ color: '#E60023' }} />
                  : <ToggleLeft size={32} className="text-gray-300" />}
              </button>
            </div>

            {useShared ? (
              <>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apartment-wide (will be split equally)</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Rent (total)</label>
                    <input type="number" className="inp" placeholder="0" value={messRent} onChange={e => setMessRent(e.target.value)} disabled={!isManager} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Service Charge (total)</label>
                    <input type="number" className="inp" placeholder="0" value={messSvc} onChange={e => setMessSvc(e.target.value)} disabled={!isManager} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Other Charge Label</label>
                    <input className="inp" placeholder="e.g. Gas, Internet" value={messOtherLabel} onChange={e => setMessOtherLabel(e.target.value)} disabled={!isManager} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Other Charge (total)</label>
                    <input type="number" className="inp" placeholder="0" value={messOther} onChange={e => setMessOther(e.target.value)} disabled={!isManager} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 bg-yellow-50 rounded-xl px-3 py-2">
                  ⚠️ When shared charges are ON, individual member charges (Rent/Service) are ignored.
                </p>
              </>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <Building2 size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-500">Individual charges mode</p>
                <p className="text-xs text-gray-400 mt-1">Set rent & charges per member in their profile (tap a member card)</p>
              </div>
            )}

            {isManager && (
              <button onClick={handleSaveCharges} disabled={savingCharges}
                className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-50" style={{ background: '#E60023' }}>
                {savingCharges ? 'Saving…' : 'Save Charges'}
              </button>
            )}
          </div>
        )}

        {/* ROLES TAB */}
        {tab === 'roles' && (
          <div className="px-5 pb-6 space-y-3">
            {otherMembers.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">No other members yet.</p>
            )}
            {otherMembers.map(m => {
              const isThisManager = m.userId === mess?.managerId;
              return (
                <div key={m.id} className="bg-gray-50 rounded-2xl p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar name={m.name} photoURL={m.photoURL} avatarColor={m.avatarColor} size={38} />
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">{m.name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={isThisManager ? { background: '#FFE0E4', color: '#E60023' } :
                               m.role === 'comanager' ? { background: '#EDE9FE', color: '#7C3AED' } :
                               { background: '#F0F0F0', color: '#666' }}>
                        {isThisManager ? 'Manager' : m.role === 'comanager' ? 'Co-Manager' : 'Member'}
                      </span>
                    </div>
                  </div>
                  {/* Only manager can change roles — co-manager sees read-only */}
                  {isManager && !isThisManager && (
                    <div className="flex gap-2 flex-wrap">
                      {m.role !== 'comanager' && (
                        <button onClick={() => handleMakeComanager(m.id, m.name)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                          style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                          <Shield size={11} /> Make Co-Manager
                        </button>
                      )}
                      {m.role === 'comanager' && (
                        <button onClick={() => handleRemoveComanager(m.id, m.name)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-200 text-gray-600">
                          Remove Co-Manager
                        </button>
                      )}
                      <button onClick={() => handleTransferManager(m.id, m.name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                        style={{ background: '#FFE0E4', color: '#E60023' }}>
                        <Crown size={11} /> Make Manager
                      </button>
                      <button onClick={() => handleRemoveMember(m.id, m.name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-500 ml-auto">
                        <UserX size={11} /> Remove
                      </button>
                    </div>
                  )}
                  {isComanager && (
                    <p className="text-xs text-gray-400 mt-1">Only the manager can change roles.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* DANGER TAB — manager only */}
        {tab === 'danger' && isManager && (
          <div className="px-5 pb-6">
            <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-red-500" />
                <p className="font-black text-red-700 text-sm">Delete This Mess</p>
              </div>
              <p className="text-xs text-red-500 mb-4">
                This will permanently archive the mess. All data is preserved but no one can add new entries.
              </p>
              <button onClick={handleDeleteMess}
                className="w-full py-3 rounded-2xl font-bold text-white text-sm" style={{ background: '#DC2626' }}>
                <span className="flex items-center justify-center gap-2">
                  <Trash2 size={16} /> Delete Mess
                </span>
              </button>
            </div>
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
        onCancel={closeConfirm}
      />
    </>
  );
}
