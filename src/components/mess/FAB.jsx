'use client';

import { useState } from 'react';
import { Plus, UtensilsCrossed, Receipt, Wallet, UserPlus, Copy, Check, Share2 } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import Avatar from '@/components/ui/Avatar';
import { addMeal, addExpense, addPayment, monthKey } from '@/lib/firestore';
import { format } from 'date-fns';

const CATEGORIES = [
  { label: 'Meal',    color: '#16A34A', bg: '#DCFCE7' },
  { label: 'Rent',    color: '#0076D3', bg: '#DBEAFE' },
  { label: 'Utility', color: '#EA580C', bg: '#FED7AA' },
  { label: 'Gas',     color: '#9B59B6', bg: '#EDE9FE' },
  { label: 'Misc',    color: '#64748B', bg: '#F1F5F9' },
];

const PAYMENT_REASONS = ['Meal', 'Rent', 'Service Charge', 'Others'];
const REASON_COLORS = {
  'Meal':           { color: '#16A34A', bg: '#DCFCE7' },
  'Rent':           { color: '#0076D3', bg: '#DBEAFE' },
  'Service Charge': { color: '#EA580C', bg: '#FED7AA' },
  'Others':         { color: '#64748B', bg: '#F1F5F9' },
};

export default function FAB({ messId, members, myRole, userId, inviteCode, messName, currentMonth }) {
  const isManager = myRole === 'manager' || myRole === 'comanager';

  const [open, setOpen]     = useState(false);
  const [sheet, setSheet]   = useState(null);
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const [mealDate, setMealDate] = useState(today);
  const [mealData, setMealData] = useState({});
  const setMeal = (memberId, field, val) =>
    setMealData(p => ({ ...p, [memberId]: { ...(p[memberId] || {}), [field]: Number(val) } }));

  const [expMember, setExpMember] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCat,    setExpCat]    = useState('Meal');
  const [expDesc,   setExpDesc]   = useState('');
  const [expDate,   setExpDate]   = useState(today);

  const [payMember, setPayMember] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payReason, setPayReason] = useState('Meal');
  const [payNote,   setPayNote]   = useState('');
  const [payDate,   setPayDate]   = useState(today);

  const [copied, setCopied] = useState(false);

  const openSheet  = (s) => { setSheet(s); setOpen(false); };
  const closeSheet = ()  => setSheet(null);

  const saveMeals = async () => {
    const hasMeals = Object.values(mealData).some(d => d.breakfast || d.lunch || d.dinner);
    if (!hasMeals) { closeSheet(); return; }
    setSaving(true);
    const mk = monthKey(new Date(mealDate));
    await Promise.all(
      Object.entries(mealData).map(([memberId, data]) =>
        (data.breakfast || data.lunch || data.dinner)
          ? addMeal(messId, mk, { memberId, date: mealDate, ...data }, userId)
          : Promise.resolve()
      )
    );
    setSaving(false);
    setMealData({});
    closeSheet();
  };

  const saveExpense = async () => {
    if (!expAmount || !expMember) return;
    setSaving(true);
    await addExpense(messId, monthKey(new Date(expDate)), {
      memberId: expMember, amount: Number(expAmount), category: expCat, description: expDesc, date: expDate,
    }, userId);
    setSaving(false);
    setExpAmount(''); setExpDesc(''); setExpMember('');
    closeSheet();
  };

  const savePayment = async () => {
    if (!payAmount || !payMember) return;
    setSaving(true);
    await addPayment(messId, monthKey(new Date(payDate)), {
      memberId: payMember, amount: Number(payAmount), reason: payReason, note: payNote, date: payDate,
    }, userId);
    setSaving(false);
    setPayAmount(''); setPayNote(''); setPayMember('');
    closeSheet();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = () => {
    if (navigator.share) {
      navigator.share({ title: `Join ${messName} on Messify`, text: `Use invite code: ${inviteCode}` });
    } else copyCode();
  };

  // Manager sees all 4 options; member sees only Add Meal
  const fabItems = isManager
    ? [
        { label: 'Add Meal',      icon: UtensilsCrossed, key: 'meal'    },
        { label: 'Add Expense',   icon: Receipt,         key: 'expense' },
        { label: 'Add Payment',   icon: Wallet,          key: 'payment' },
        { label: 'Invite Member', icon: UserPlus,        key: 'invite'  },
      ]
    : [
        { label: 'Add My Meal', icon: UtensilsCrossed, key: 'meal' },
      ];

  // Members can only add meals for themselves
  const mealMembers = isManager
    ? members
    : members.filter(m => m.userId === userId);

  return (
    <>
      {/* FAB Button + Speed Dial */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3">
        {open && fabItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-2">
              <span className="bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap">
                {item.label}
              </span>
              <button
                onClick={() => openSheet(item.key)}
                className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <Icon size={20} style={{ color: '#E60023' }} />
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setOpen(p => !p)}
          className="w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          style={{ background: '#E60023' }}
        >
          <Plus size={26} style={{ transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* ── ADD MEAL ── */}
      <BottomSheet open={sheet === 'meal'} onClose={closeSheet} title={isManager ? 'Add Meals' : 'Add My Meal'}>
        <div className="px-5 pb-6">
          <input type="date" className="inp mb-4" value={mealDate}
            onChange={e => setMealDate(e.target.value)} max={today} />
          <div className="space-y-3">
            {mealMembers.map(m => (
              <div key={m.id} className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={m.name} photoURL={m.photoURL} avatarColor={m.avatarColor} size={30} />
                  <span className="font-semibold text-sm text-gray-900">{m.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['breakfast', 'lunch', 'dinner'].map(meal => (
                    <div key={meal}>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">
                        {meal.charAt(0).toUpperCase() + meal.slice(1)}
                      </label>
                      <input
                        type="number" min="0" max="3" step="0.5"
                        className="inp text-center text-sm py-2" placeholder="0"
                        value={mealData[m.id]?.[meal] || ''}
                        onChange={e => setMeal(m.id, meal, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveMeals} disabled={saving}
            className="w-full mt-4 py-3 rounded-2xl font-bold text-white disabled:opacity-60"
            style={{ background: '#E60023' }}>
            {saving ? 'Saving…' : 'Save Meals'}
          </button>
        </div>
      </BottomSheet>

      {/* ── ADD EXPENSE (manager only) ── */}
      {isManager && (
        <BottomSheet open={sheet === 'expense'} onClose={closeSheet} title="Add Expense">
          <div className="px-5 pb-6 space-y-3">
            <select className="inp" value={expMember} onChange={e => setExpMember(e.target.value)}>
              <option value="">Select member</option>
              <option value="all">All Members (Shared)</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" className="inp" placeholder="Amount (৳)"
              value={expAmount} onChange={e => setExpAmount(e.target.value)} min="0" />
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.label} onClick={() => setExpCat(cat.label)}
                    className="px-3 py-1.5 rounded-xl font-semibold text-xs transition-all"
                    style={{ background: expCat === cat.label ? cat.color : cat.bg, color: expCat === cat.label ? 'white' : cat.color }}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <input className="inp" placeholder="Description (optional)"
              value={expDesc} onChange={e => setExpDesc(e.target.value)} />
            <input type="date" className="inp" value={expDate}
              onChange={e => setExpDate(e.target.value)} max={today} />
            <button onClick={saveExpense} disabled={saving || !expAmount || !expMember}
              className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-50"
              style={{ background: '#E60023' }}>
              {saving ? 'Saving…' : 'Save Expense'}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── ADD PAYMENT (manager only) ── */}
      {isManager && (
        <BottomSheet open={sheet === 'payment'} onClose={closeSheet} title="Add Payment">
          <div className="px-5 pb-6 space-y-3">
            <select className="inp" value={payMember} onChange={e => setPayMember(e.target.value)}>
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" className="inp" placeholder="Amount (৳)"
              value={payAmount} onChange={e => setPayAmount(e.target.value)} min="0" />
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">Payment For</p>
              <p className="text-[11px] text-gray-400 mb-2">Only "Meal" payments reduce the meal bill</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_REASONS.map(r => {
                  const c = REASON_COLORS[r];
                  return (
                    <button key={r} onClick={() => setPayReason(r)}
                      className="py-2 rounded-xl font-bold text-sm transition-all"
                      style={{ background: payReason === r ? c.color : c.bg, color: payReason === r ? 'white' : c.color }}>
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
            <input className="inp" placeholder="Note (optional)"
              value={payNote} onChange={e => setPayNote(e.target.value)} />
            <input type="date" className="inp" value={payDate}
              onChange={e => setPayDate(e.target.value)} max={today} />
            <button onClick={savePayment} disabled={saving || !payAmount || !payMember}
              className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-50"
              style={{ background: '#E60023' }}>
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── INVITE (manager only) ── */}
      {isManager && (
        <BottomSheet open={sheet === 'invite'} onClose={closeSheet} title="Invite Member">
          <div className="px-5 pb-6">
            <p className="text-sm text-gray-500 mb-4">
              Share this code to invite someone to <strong>{messName}</strong>.
            </p>
            <div className="bg-gray-50 rounded-2xl p-5 border-2 border-dashed border-gray-200 text-center mb-4">
              <p className="text-3xl font-black tracking-widest text-gray-900 font-mono">{inviteCode}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copyCode}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all"
                style={{
                  background: copied ? '#DCFCE7' : '#FFF0F1',
                  color: copied ? '#16A34A' : '#E60023',
                  border: `1.5px solid ${copied ? '#16A34A' : '#E60023'}`
                }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button onClick={shareCode}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white"
                style={{ background: '#E60023' }}>
                <Share2 size={16} /> Share
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
