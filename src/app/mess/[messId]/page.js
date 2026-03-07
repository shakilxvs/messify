'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { monthKey, getMemberBilling, getUser } from '@/lib/firestore';
import Avatar from '@/components/ui/Avatar';
import MemberSheet from '@/components/mess/MemberSheet';
import MembersSheet from '@/components/mess/MembersSheet';
import MessSettingsSheet from '@/components/mess/MessSettingsSheet';
import FAB from '@/components/mess/FAB';
import SkeletonPage from '@/components/ui/SkeletonLoader';
import { ChevronLeft, ChevronRight, ArrowLeft, Users, Settings, UtensilsCrossed, TrendingUp, Wallet } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';

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
  const [myMemberId, setMyMemberId]     = useState(null);
  const [manager, setManager]           = useState(null);
  const [loadingPage, setLoadingPage]   = useState(true);
  const [selectedMember, setSelected]   = useState(null);
  const [showMembers, setShowMembers]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  const mk = monthKey(currentMonth);
  const isManager = ['manager', 'comanager'].includes(myRole);

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
// If user is the mess creator, always treat as manager
const effectiveRole = mess?.managerId === user.uid ? 'manager' : me?.role || null;
setMyRole(effectiveRole);
setMyMemberId(me?.id || null);
setLoadingPage(false);
      }
    );

    const unsubPending = onSnapshot(
      query(collection(db, 'messes', messId, 'joinRequests'), where('status', '==', 'pending')),
      snap => setPending(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubMess(); unsubMembers(); unsubPending(); };
  }, [messId, user?.uid]);

  useEffect(() => {
    if (!messId || members.length === 0) return;
    setSummary({ totalExpense: 0, totalMeals: 0, mealRate: 0 });
    setBillings({});

    const unsubSummary = onSnapshot(
      doc(db, 'messes', messId, 'months', mk, 'summary', 'data'),
      snap => { if (snap.exists()) setSummary(snap.data()); }
    );

    members.forEach(async m => {
      const b = await getMemberBilling(messId, mk, m.id);
      setBillings(p => ({ ...p, [m.id]: b }));
    });

    return () => unsubSummary();
  }, [mk, members.length, messId]);

  if (loading || loadingPage) return <SkeletonPage />;

  if (!myRole) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ background: '#F5F5F5' }}>
      <div className="text-5xl mb-4">🚫</div>
      <h2 className="text-xl font-black text-gray-900">Access Denied</h2>
      <p className="text-gray-500 mt-2 text-sm">You are not a member of this mess.</p>
      <button onClick={() => router.push('/dashboard')} className="mt-4 px-6 py-2.5 rounded-2xl font-bold text-white" style={{ background: '#E60023' }}>
        Go to Dashboard
      </button>
    </div>
  );

  const prevMonth = () => setCurrentMonth(p => subMonths(p, 1));
  const nextMonth = () => {
    const next = addMonths(currentMonth, 1);
    if (next <= startOfMonth(new Date())) setCurrentMonth(next);
  };
  const isCurrentMonth = monthKey(currentMonth) === monthKey(new Date());

  const totalDue = Object.values(memberBillings).filter(b => b?.netDue > 0).reduce((s, b) => s + b.netDue, 0);
  const totalAdvance = Object.values(memberBillings).filter(b => b?.netDue < 0).reduce((s, b) => s + Math.abs(b.netDue), 0);

  return (
    <div className="min-h-screen pb-28" style={{ background: '#F5F5F5' }}>

      {/* HERO HEADER */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #E60023 0%, #AD081B 100%)', paddingBottom: 36 }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="absolute top-4 right-16 w-20 h-20 rounded-full opacity-10 bg-white" />

        <div className="relative px-4 pt-4 pb-2 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex items-center gap-2">
  {isManager && (
    <button onClick={() => setShowMembers(true)}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.2)' }}>
      <Users size={18} className="text-white" />
      {pendingRequests.length > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center bg-yellow-400 text-gray-900">
          {pendingRequests.length}
        </span>
      )}
    </button>
  )}
  {isManager && (
    <button onClick={() => setShowSettings(true)}
      className="w-9 h-9 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.2)' }}>
      <Settings size={18} className="text-white" />
    </button>
  )}
</div>
              className="relative w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Users size={18} className="text-white" />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center bg-yellow-400 text-gray-900">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Settings size={18} className="text-white" />
            </button>
          </div>
        </div>

        <div className="relative px-5 pt-1 pb-4">
          <h1 className="text-2xl font-black text-white leading-tight">{mess?.name}</h1>
          {mess?.address && <p className="text-white/70 text-xs mt-0.5">{mess.address}</p>}
          <div className="flex items-center gap-2 mt-2">
            <Avatar name={manager?.name || ''} photoURL={manager?.photoURL} size={20} />
            <span className="text-white/80 text-xs font-medium">{manager?.name} · Manager</span>
          </div>
        </div>

        {/* Month Selector */}
        <div className="relative mx-5">
          <div className="flex items-center justify-between rounded-2xl px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <button onClick={prevMonth} className="p-1 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <ChevronLeft size={18} className="text-white" />
            </button>
            <div className="text-center">
              <p className="text-white font-black text-base">{format(currentMonth, 'MMMM yyyy')}</p>
              {!isCurrentMonth && <p className="text-white/60 text-[10px]">Viewing past month</p>}
            </div>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="p-1 rounded-lg transition-colors disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <ChevronRight size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="px-4 -mt-4 grid grid-cols-3 gap-2 mb-4">
        <StatCard icon={<TrendingUp size={13} />} label="Expense" value={`৳${(summary.totalExpense||0).toFixed(0)}`} accent="#EA580C" />
        <StatCard icon={<UtensilsCrossed size={13} />} label="Meals" value={summary.totalMeals||0} accent="#0076D3" />
        <StatCard icon={<Wallet size={13} />} label="Rate" value={`৳${(summary.mealRate||0).toFixed(1)}`} accent="#16A34A" />
      </div>

      {/* SUMMARY PILLS */}
      {(totalDue > 0 || totalAdvance > 0) && (
        <div className="px-4 mb-4 flex gap-2">
          {totalDue > 0 && (
            <div className="flex-1 rounded-2xl px-4 py-2.5 flex items-center gap-2" style={{ background: '#FFE0E4' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#E60023' }} />
              <div>
                <p className="text-[10px] font-bold text-red-400">Total Owed</p>
                <p className="text-sm font-black" style={{ color: '#E60023' }}>৳{totalDue.toFixed(0)}</p>
              </div>
            </div>
          )}
          {totalAdvance > 0 && (
            <div className="flex-1 rounded-2xl px-4 py-2.5 flex items-center gap-2" style={{ background: '#DCFCE7' }}>
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div>
                <p className="text-[10px] font-bold text-green-500">Total Advance</p>
                <p className="text-sm font-black text-green-700">৳{totalAdvance.toFixed(0)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MEMBERS */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Members · {members.length}</p>
          {isManager && (
            <button onClick={() => setShowMembers(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl"
              style={{ background: '#FFF0F1', color: '#E60023' }}>
              <Users size={12} /> Manage
              {pendingRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white ml-1" style={{ background: '#E60023' }}>
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-card">
            <div className="text-5xl mb-3">👥</div>
            <p className="font-black text-gray-700">No members yet</p>
            <p className="text-sm text-gray-400 mt-1">Tap the people icon above to add members</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(m => {
              const b = memberBillings[m.id];
              const netDue = b?.netDue || 0;
              const isMe = m.userId === user?.uid;
const displayRole = (m.userId === mess?.managerId) ? 'manager' : m.role;
              return (
                <button key={m.id} onClick={() => setSelected(m)} className="w-full text-left">
                  <div className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-card">
                    <div className="relative">
                      <Avatar name={m.name} photoURL={m.photoURL} avatarColor={m.avatarColor} size={46} />
                      {isMe && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center" style={{ background: '#E60023' }}>
                          <span className="text-white text-[7px] font-black">ME</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-black text-gray-900 text-sm truncate">{m.name}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={ROLE_STYLES[displayRole] || ROLE_STYLES.member}>
                          {ROLE_LABELS[displayRole] || 'Member'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {b ? `${b.myMeals} meals · Bill ৳${b.totalBill.toFixed(0)}` : '…'}
                      </p>
                    </div>
                    {b ? (
                      <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${netDue > 0 ? 'badge-owed' : netDue < 0 ? 'badge-advance' : 'badge-clear'}`}>
                        {netDue > 0 ? `Due ৳${netDue.toFixed(0)}` : netDue < 0 ? `Adv ৳${Math.abs(netDue).toFixed(0)}` : 'Clear ✓'}
                      </span>
                    ) : <div className="skeleton w-16 h-6 rounded-xl" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <FAB messId={messId} members={members} myRole={myRole} userId={user?.uid}
        inviteCode={mess?.inviteCode} messName={mess?.name} currentMonth={currentMonth} />

      <MemberSheet open={!!selectedMember} onClose={() => setSelected(null)} member={selectedMember}
        messId={messId} mess={mess} myRole={myRole} userId={user?.uid} currentMonth={currentMonth} />

      <MembersSheet open={showMembers} onClose={() => setShowMembers(false)}
        messId={messId} pendingRequests={pendingRequests} isManager={isManager} />

      <MessSettingsSheet open={showSettings} onClose={() => setShowSettings(false)}
        mess={mess} members={members} myRole={myRole} myMemberId={myMemberId} messId={messId} />
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-card">
      <div className="flex items-center gap-1 mb-1" style={{ color: accent }}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-black leading-tight" style={{ color: accent }}>{value}</p>
    </div>
  );
}
