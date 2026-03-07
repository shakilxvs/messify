'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { monthKey, getMemberBilling, approveJoinRequest, rejectJoinRequest, getUser } from '@/lib/firestore';
import Avatar from '@/components/ui/Avatar';
import MemberSheet from '@/components/mess/MemberSheet';
import MessInfoSheet from '@/components/mess/MessInfoSheet';
import FAB from '@/components/mess/FAB';
import SkeletonPage from '@/components/ui/SkeletonLoader';
import { ChevronDown, ArrowLeft, Check, X } from 'lucide-react';
import { format } from 'date-fns';

const ROLE_LABELS = { manager: 'Manager', comanager: 'Co-Manager', member: 'Member' };
const ROLE_STYLES = {
  manager:   { background: '#FFE0E4', color: '#E60023' },
  comanager: { background: '#EDE9FE', color: '#7C3AED' },
  member:    { background: '#F0F0F0', color: '#666' },
};

export default function MessPage() {
  const { messId } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [mess, setMess]                 = useState(null);
  const [members, setMembers]           = useState([]);
  const [summary, setSummary]           = useState({ totalExpense: 0, totalMeals: 0, mealRate: 0 });
  const [pendingRequests, setPending]   = useState([]);
  const [memberBillings, setBillings]   = useState({});
  const [myRole, setMyRole]             = useState(null);
  const [manager, setManager]           = useState(null);
  const [loadingPage, setLoadingPage]   = useState(true);
  const [selectedMember, setSelected]   = useState(null);
  const [showMessInfo, setShowMessInfo] = useState(false);

  const mk = monthKey();

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [user, loading]);

  useEffect(() => {
    if (!messId || !user) return;

    const unsubMess = onSnapshot(doc(db, 'messes', messId), snap => {
      if (snap.exists()) {
        setMess({ id: snap.id, ...snap.data() });
        getUser(snap.data().managerId).then(setManager);
      }
    });

    const unsubMembers = onSnapshot(
      query(collection(db, 'messes', messId, 'members'), where('status', '==', 'active')),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMembers(list);
        const me = list.find(m => m.userId === user.uid);
        setMyRole(me?.role || null);
        setLoadingPage(false);
        list.forEach(async m => {
          const b = await getMemberBilling(messId, mk, m.id);
          setBillings(p => ({ ...p, [m.id]: b }));
        });
      }
    );

    const unsubSummary = onSnapshot(
      doc(db, 'messes', messId, 'months', mk, 'summary', 'data'),
      snap => { if (snap.exists()) setSummary(snap.data()); }
    );

    const unsubPending = onSnapshot(
      query(collection(db, 'messes', messId, 'joinRequests'), where('status', '==', 'pending')),
      snap => setPending(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubMess(); unsubMembers(); unsubSummary(); unsubPending(); };
  }, [messId, user?.uid]);

  if (loading || loadingPage) return <SkeletonPage />;

  if (!myRole) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-4">🚫</div>
      <h2 className="text-xl font-black text-gray-900">Access Denied</h2>
      <p className="text-gray-500 mt-2 text-sm">You are not a member of this mess.</p>
      <button onClick={() => router.push('/dashboard')} className="mt-4 px-6 py-2.5 rounded-2xl font-bold text-white" style={{ background: '#E60023' }}>
        Go to Dashboard
      </button>
    </div>
  );

  const isManager = ['manager', 'comanager'].includes(myRole);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F5F5F5' }}>
      <div className="bg-white sticky top-0 z-30 px-4 py-3 flex items-center justify-between" style={{ boxShadow: '0 1px 0 #F0F0F0' }}>
        <button onClick={() => router.push('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <button onClick={() => setShowMessInfo(true)} className="flex items-center gap-1.5 font-black text-gray-900 text-base">
          {mess?.name}
          <ChevronDown size={16} className="text-gray-400" />
        </button>
        <span className="text-xs font-semibold text-gray-400">{format(new Date(), 'MMM yyyy')}</span>
      </div>

      <div className="px-4 pt-4 pb-2 grid grid-cols-3 gap-2">
        <StatCard label="Total Expense" value={`৳${(summary.totalExpense || 0).toFixed(0)}`} accent="#EA580C" bg="#FFF7ED" />
        <StatCard label="Total Meals"   value={(summary.totalMeals || 0)}                      accent="#0076D3" bg="#EFF6FF" />
        <StatCard label="Meal Rate"     value={`৳${(summary.mealRate || 0).toFixed(1)}`}       accent="#16A34A" bg="#F0FDF4" />
      </div>

      {isManager && pendingRequests.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Join Requests · {pendingRequests.length}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl p-3 flex-shrink-0 shadow-card flex items-center gap-3" style={{ minWidth: 200 }}>
                <Avatar name={req.name} size={36} />
                <p className="font-semibold text-sm text-gray-900 flex-1 truncate">{req.name}</p>
                <button onClick={() => approveJoinRequest(messId, req.id)} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200">
                  <Check size={14} />
                </button>
                <button onClick={() => rejectJoinRequest(messId, req.id)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Members · {members.length}</p>
        {members.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">👥</div>
            <p className="font-bold text-gray-600">No members yet</p>
            <p className="text-xs text-gray-400 mt-1">Tap + to invite members</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(m => {
              const b = memberBillings[m.id];
              const netDue = b?.netDue || 0;
              return (
                <button key={m.id} onClick={() => setSelected(m)}
                  className="card w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                  <Avatar name={m.name} photoURL={m.photoURL} avatarColor={m.avatarColor} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={ROLE_STYLES[m.role] || ROLE_STYLES.member}>
                        {ROLE_LABELS[m.role] || 'Member'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {b ? `${b.myMeals} meals · Bill ৳${b.totalBill.toFixed(0)}` : '…'}
                    </p>
                  </div>
                  {b && (
                    <span className={netDue > 0 ? 'badge-owed' : netDue < 0 ? 'badge-advance' : 'badge-clear'}>
                      {netDue > 0 ? `Due ৳${netDue.toFixed(0)}` : netDue < 0 ? `Adv ৳${Math.abs(netDue).toFixed(0)}` : 'Clear'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <FAB messId={messId} members={members} myRole={myRole} userId={user?.uid} inviteCode={mess?.inviteCode} messName={mess?.name} />
      <MemberSheet open={!!selectedMember} onClose={() => setSelected(null)} member={selectedMember} messId={messId} mess={mess} myRole={myRole} userId={user?.uid} />
      <MessInfoSheet open={showMessInfo} onClose={() => setShowMessInfo(false)} mess={mess} manager={manager} myRole={myRole} messId={messId} />
    </div>
  );
}

function StatCard({ label, value, accent, bg }) {
  return (
    <div className="rounded-2xl p-3 text-center shadow-card" style={{ background: bg || 'white' }}>
      <p className="text-lg font-black leading-tight" style={{ color: accent }}>{value}</p>
      <p className="text-[10px] text-gray-500 font-semibold mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
