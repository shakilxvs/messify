'use client';

import { useState, useEffect } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import Avatar from '@/components/ui/Avatar';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getMemberBilling, deleteMeal, deleteExpense, deletePayment, updateMemberCharges, monthKey, requestLeave } from '@/lib/firestore';
import { generateMemberPDF } from '@/lib/pdf';
import { Download, Trash2, UtensilsCrossed, Receipt, Wallet, Settings, LogOut } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const ROLE_LABELS  = { manager: 'Manager', comanager: 'Co-Manager', member: 'Member' };
const ROLE_STYLES  = { manager: 'badge-manager', comanager: 'badge-comanager', member: 'badge-member' };
const REASON_COLORS = {
  Meal:             '#16A34A',
  Rent:             '#0076D3',
  'Service Charge': '#EA580C',
  Others:           '#64748B',
};

export default function MemberSheet({ open, onClose, member, messId, mess, myRole, userId }) {
  const [tab, setTab] = useState('meals');
  const [billing, setBilling] = useState(null);
  const [meals, setMeals] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [showCharges, setShowCharges] = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [confirming, setConf]   = useState(false);

  const isMyCard = member?.userId === userId;
  const isMember = myRole === 'member';

  // Charges edit state
  const [rent, setRent] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [otherCharge, setOtherCharge] = useState('');
  const [otherLabel, setOtherLabel] = useState('');
  const [savingCharges, setSavingCharges] = useState(false);

  const mk = monthKey();
  const isManager = ['manager', 'comanager'].includes(myRole);

  useEffect(() => {
    if (!open || !member) return;
    setTab('meals');
    setBilling(null);

    getMemberBilling(messId, mk, member.id).then(b => {
      setBilling(b);
      setRent(b.rent || 0);
      setServiceCharge(b.serviceCharge || 0);
      setOtherCharge(b.otherCharge || 0);
      setOtherLabel(b.otherChargeLabel || '');
    });

    const unsubMeals = onSnapshot(
      query(collection(db, 'messes', messId, 'months', mk, 'meals'), where('memberId', '==', member.id)),
      snap => setMeals(snap.docs.filter(d => !d.data().deleted).map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.date?.localeCompare(a.date)))
    );
    const unsubExp = onSnapshot(
      query(collection(db, 'messes', messId, 'months', mk, 'expenses'), where('memberId', '==', member.id)),
      snap => setExpenses(snap.docs.filter(d => !d.data().deleted).map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.date?.localeCompare(a.date)))
    );
    const unsubPay = onSnapshot(
      query(collection(db, 'messes', messId, 'months', mk, 'payments'), where('memberId', '==', member.id)),
      snap => setPayments(snap.docs.filter(d => !d.data().deleted).map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.date?.localeCompare(a.date)))
    );

    return () => { unsubMeals(); unsubExp(); unsubPay(); };
  }, [open, member?.id]);

  const saveCharges = async () => {
    setSavingCharges(true);
    await updateMemberCharges(messId, member.id, {
      rent: Number(rent) || 0,
      serviceCharge: Number(serviceCharge) || 0,
      otherCharge: Number(otherCharge) || 0,
      otherChargeLabel: otherLabel.trim(),
    });
    const b = await getMemberBilling(messId, mk, member.id);
    setBilling(b);
    setSavingCharges(false);
    setShowCharges(false);
  };

  const handlePDF = async () => {
    setDownloading(true);
    await generateMemberPDF({ mess, member, billing, meals, expenses, payments, month: mk });
    setDownloading(false);
  };

  if (!member) return null;

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Profile Header */}
      <div className="px-5 pt-2 pb-4">
        <div className="flex items-center gap-3">
          <Avatar name={member.name} photoURL={member.photoURL} avatarColor={member.avatarColor} size={56} />
          <div className="flex-1">
            <h3 className="text-lg font-black text-gray-900">{member.name}</h3>
            {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${ROLE_STYLES[member.role] || 'badge-member'}`}>
              {ROLE_LABELS[member.role] || 'Member'}
            </span>
          </div>
          {isManager && (
            <button onClick={() => setShowCharges(p => !p)}
              className="p-2 rounded-xl transition-colors"
              style={{ background: showCharges ? '#FFF0F1' : '#F5F5F5' }}>
              <Settings size={18} style={{ color: showCharges ? '#E60023' : '#666' }} />
            </button>
          )}
        </div>
      </div>

      {/* Fixed Charges Editor (Manager only) */}
      {showCharges && isManager && (
        <div className="mx-5 mb-4 p-4 rounded-2xl border-2" style={{ borderColor: '#E60023', background: '#FFF8F8' }}>
          <p className="text-sm font-black text-gray-900 mb-3">Monthly Fixed Charges</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 w-28">Rent (৳)</label>
              <input type="number" className="inp flex-1 py-2 text-sm" min="0" value={rent} onChange={e => setRent(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 w-28">Service Charge (৳)</label>
              <input type="number" className="inp flex-1 py-2 text-sm" min="0" value={serviceCharge} onChange={e => setServiceCharge(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 w-28">Other (৳)</label>
              <input type="number" className="inp flex-1 py-2 text-sm" min="0" value={otherCharge} onChange={e => setOtherCharge(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 w-28">Other Label</label>
              <input className="inp flex-1 py-2 text-sm" placeholder="e.g. Internet" value={otherLabel} onChange={e => setOtherLabel(e.target.value)} />
            </div>
          </div>
          <button onClick={saveCharges} disabled={savingCharges}
            className="w-full mt-3 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: '#E60023' }}>
            {savingCharges ? 'Saving…' : 'Save Charges'}
          </button>
        </div>
      )}

      {/* Billing Summary */}
      {billing ? (
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden border border-gray-100">
          {/* Meal row */}
          <BillRow label="Meals" sub={`${billing.myMeals} meals × ৳${billing.mealRate.toFixed(1)}`} value={billing.mealBill} accent="#0076D3" />
          {/* Fixed charges */}
          {billing.rent > 0 && <BillRow label="Rent" value={billing.rent} accent="#EA580C" />}
          {billing.serviceCharge > 0 && <BillRow label="Service Charge" value={billing.serviceCharge} accent="#9B59B6" />}
          {billing.otherCharge > 0 && <BillRow label={billing.otherChargeLabel || 'Other'} value={billing.otherCharge} accent="#64748B" />}
          {/* Total bill */}
          <div className="px-4 py-3 flex justify-between items-center" style={{ background: '#FFF0F1' }}>
            <span className="text-sm font-black text-gray-900">Total Mess Bill</span>
            <span className="text-base font-black" style={{ color: '#E60023' }}>৳{billing.totalBill.toFixed(0)}</span>
          </div>
          {/* Payments */}
          {billing.paidMeal > 0    && <BillRow label="Paid (Meal)"           value={-billing.paidMeal}    accent="#16A34A" />}
          {billing.paidRent > 0    && <BillRow label="Paid (Rent)"           value={-billing.paidRent}    accent="#16A34A" />}
          {billing.paidService > 0 && <BillRow label="Paid (Service Charge)" value={-billing.paidService} accent="#16A34A" />}
          {billing.paidOthers > 0  && <BillRow label="Paid (Others)"         value={-billing.paidOthers}  accent="#16A34A" />}
          {/* Net Due */}
          <div className="px-4 py-3 flex justify-between items-center border-t border-gray-100">
            <span className="text-sm font-black text-gray-900">Net Due</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-black" style={{ color: billing.netDue > 0 ? '#E60023' : '#16A34A' }}>
                ৳{Math.abs(billing.netDue).toFixed(0)}
              </span>
              <span className={billing.netDue > 0 ? 'badge-owed' : billing.netDue < 0 ? 'badge-advance' : 'badge-clear'}>
                {billing.netDue > 0 ? 'Owed' : billing.netDue < 0 ? 'Advance' : 'Clear'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-5 mb-4 space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-5 gap-1 mb-3">
        {['meals','expenses','payments'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl font-bold text-xs capitalize transition-all"
            style={tab === t ? { background: '#E60023', color: 'white' } : { background: '#F0F0F0', color: '#666' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-5 pb-4 space-y-2 min-h-24">
        {tab === 'meals' && (
          meals.length === 0
            ? <Empty icon={<UtensilsCrossed size={24} />} text="No meals recorded" />
            : meals.map(m => (
              <div key={m.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{m.date}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    B:{m.breakfast||0} · L:{m.lunch||0} · D:{m.dinner||0} = <strong>{m.total}</strong> meals
                  </p>
                </div>
                {isManager && (
                  <button onClick={() => deleteMeal(messId, mk, m.id, userId)} className="p-2 rounded-lg hover:bg-red-50">
                    <Trash2 size={14} className="text-gray-300 hover:text-red-500" />
                  </button>
                )}
              </div>
            ))
        )}

        {tab === 'expenses' && (
          expenses.length === 0
            ? <Empty icon={<Receipt size={24} />} text="No expenses recorded" />
            : expenses.map(e => (
              <div key={e.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{e.description || e.category}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">{e.category}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{e.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-gray-900 text-sm">৳{e.amount}</span>
                  {isManager && (
                    <button onClick={() => deleteExpense(messId, mk, e.id, userId)} className="p-2 rounded-lg hover:bg-red-50">
                      <Trash2 size={14} className="text-gray-300 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))
        )}

        {tab === 'payments' && (
          payments.length === 0
            ? <Empty icon={<Wallet size={24} />} text="No payments recorded" />
            : payments.map(p => (
              <div key={p.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{p.reason || 'Payment'}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: REASON_COLORS[p.reason] || '#666' }}>
                      {p.reason}
                    </span>
                  </div>
                  {p.note && <p className="text-xs text-gray-400 mt-0.5">{p.note}</p>}
                  <p className="text-xs text-gray-400">{p.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-green-600 text-sm">৳{p.amount}</span>
                  {isManager && (
                    <button onClick={() => deletePayment(messId, mk, p.id, userId)} className="p-2 rounded-lg hover:bg-red-50">
                      <Trash2 size={14} className="text-gray-300 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Download PDF */}
      <div className="px-5 pb-6 pt-2 border-t border-gray-100 space-y-2">
        {/* Member can request to leave from their own card */}
        {isMyCard && isMember && !member?.leaveRequested && (
          <button
            onClick={() => setConfirm({
              type: 'warning',
              title: 'Request to Leave?',
              message: 'Your manager will need to approve before you leave the mess.',
              confirmLabel: 'Send Request',
              action: async () => { await requestLeave(messId, member.id); onClose(); },
            })}
            className="w-full py-3 rounded-2xl font-bold text-orange-600 flex items-center justify-center gap-2 border-2 border-orange-200 bg-orange-50">
            <LogOut size={18} /> Request to Leave
          </button>
        )}
        {isMyCard && member?.leaveRequested && (
          <div className="w-full py-3 rounded-2xl font-bold text-gray-400 flex items-center justify-center gap-2 bg-gray-100 text-sm">
            Leave request sent — awaiting approval
          </div>
        )}
        <button onClick={handlePDF} disabled={downloading}
          className="w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: '#E60023' }}>
          <Download size={18} />
          {downloading ? 'Generating PDF…' : 'Download PDF Report'}
        </button>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        type={confirm?.type}
        loading={confirming}
        onConfirm={async () => {
          setConf(true);
          await confirm.action();
          setConf(false);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </BottomSheet>
  );
}

function BillRow({ label, sub, value, accent }) {
  const isNeg = value < 0;
  return (
    <div className="px-4 py-2.5 flex justify-between items-center border-b border-gray-50">
      <div>
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
      <span className="text-sm font-bold" style={{ color: isNeg ? '#16A34A' : accent || '#333' }}>
        {isNeg ? '-' : ''}৳{Math.abs(value).toFixed(0)}
      </span>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="text-center py-6 text-gray-300">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
