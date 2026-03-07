'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getUserMesses, createMess, getMessByInviteCode, submitJoinRequest } from '@/lib/firestore';
import Avatar from '@/components/ui/Avatar';
import {
  Plus, LogOut, ChevronRight, Users,
  Copy, Check, Home, Search, Utensils,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [messes, setMesses] = useState([]);
  const [loadingMesses, setLoadingMesses] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const [messName, setMessName] = useState('');
  const [messAddress, setMessAddress] = useState('');
  const [messDesc, setMessDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [inviteCode, setInviteCode] = useState('');
  const [messPreview, setMessPreview] = useState(null);
  const [joining, setJoining] = useState(false);
  const [looking, setLooking] = useState(false);
  const [joinDone, setJoinDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    getUserMesses(user.uid).then(m => {
      setMesses(m);
      setLoadingMesses(false);
    });
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!messName.trim()) return;
    setCreating(true);
    try {
      const id = await createMess(user.uid, {
        name: messName.trim(),
        address: messAddress.trim(),
        description: messDesc.trim(),
      });
      router.push(`/mess/${id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  const handleLookup = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 9) return;
    setLooking(true);
    try {
      const mess = await getMessByInviteCode(code);
      setMessPreview(mess === null ? undefined : mess);
    } catch (e) {
      console.error(e);
      setMessPreview(undefined);
    } finally {
      setLooking(false);
    }
  };

  const handleJoin = async () => {
    if (!messPreview) return;
    setJoining(true);
    await submitJoinRequest(messPreview.id, user.uid, user.name);
    setJoining(false);
    setJoinDone(true);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}>
        <div className="w-10 h-10 rounded-full border-4 border-red-100 border-t-red-500 animate-spin"
          style={{ borderTopColor: '#E60023' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F5' }}>

      {/* Header */}
      <div className="bg-white sticky top-0 z-30 px-5 py-4 flex items-center justify-between"
        style={{ boxShadow: '0 1px 0 #F0F0F0' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#E60023' }}>
            <Utensils size={18} className="text-white" />
          </div>
          <span className="text-xl font-black text-gray-900">Messify</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={user.name} photoURL={user.photoURL} size={36} />
          <button onClick={logout} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <LogOut size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-5 max-w-lg mx-auto">

        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-gray-900">
            Hey, {user.name?.split(' ')[0]}
          </h2>
          <p className="text-gray-400 font-medium mt-1">Manage your messes below</p>
        </div>

        {/* Action Cards */}
        {!showCreate && !showJoin && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-3xl p-6 text-left transition-all active:scale-95 shadow-card hover:shadow-card-hover"
              style={{ background: 'linear-gradient(135deg, #E60023, #AD081B)' }}
            >
              <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Plus className="text-white" size={22} />
              </div>
              <p className="text-white font-black text-base">Create a Mess</p>
              <p className="text-white/60 text-xs mt-1 font-medium">Start fresh</p>
            </button>

            <button
              onClick={() => setShowJoin(true)}
              className="card rounded-3xl p-6 text-left border-2 active:scale-95"
              style={{ borderColor: '#E60023' }}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: '#FFF0F1' }}>
                <Users size={22} style={{ color: '#E60023' }} />
              </div>
              <p className="text-gray-900 font-black text-base">Join a Mess</p>
              <p className="text-gray-400 text-xs mt-1 font-medium">Use invite code</p>
            </button>
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <div className="bg-white rounded-3xl p-6 shadow-card mb-6 fade-in">
            <h3 className="text-lg font-black text-gray-900 mb-5">Create a Mess</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Mess Name *</label>
                <input className="inp" placeholder="e.g. Dhaka House Mess" value={messName} onChange={e => setMessName(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Address</label>
                <input className="inp" placeholder="House 12, Road 5, Dhanmondi" value={messAddress} onChange={e => setMessAddress(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Description</label>
                <textarea className="inp resize-none" rows={2} placeholder="Optional note about the mess" value={messDesc} onChange={e => setMessDesc(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-3 rounded-2xl font-bold text-white text-sm"
                  style={{ background: '#E60023' }}>
                  {creating ? 'Creating…' : 'Create Mess'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Form */}
        {showJoin && (
          <div className="bg-white rounded-3xl p-6 shadow-card mb-6 fade-in">
            <h3 className="text-lg font-black text-gray-900 mb-5">Join a Mess</h3>
            {!joinDone ? (
              <>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Invite Code
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    className="inp flex-1 font-mono tracking-widest"
                    placeholder="ABCD-EF1234"
                    value={inviteCode}
                    onChange={e => { setInviteCode(e.target.value.toUpperCase()); setMessPreview(null); }}
                    maxLength={11}
                  />
                  <button onClick={handleLookup} disabled={looking || inviteCode.length < 9}
                    className="px-5 py-2 rounded-xl font-bold text-white text-sm disabled:opacity-40"
                    style={{ background: '#E60023' }}>
                    {looking ? '…' : 'Find'}
                  </button>
                </div>

                {messPreview && (
                  <div className="p-4 rounded-2xl border-2 mb-3" style={{ borderColor: '#E60023', background: '#FFF8F8' }}>
                    <p className="font-black text-gray-900">{messPreview.name}</p>
                    {messPreview.address && <p className="text-sm text-gray-500 mt-0.5">{messPreview.address}</p>}
                    <p className="text-sm text-gray-500 mt-0.5">Manager: <strong>{messPreview.managerName}</strong></p>
                    <button onClick={handleJoin} disabled={joining}
                      className="mt-3 w-full py-3 rounded-xl font-bold text-white text-sm"
                      style={{ background: '#E60023' }}>
                      {joining ? 'Sending request…' : 'Request to Join'}
                    </button>
                  </div>
                )}

                {messPreview === undefined && (
                  <p className="text-sm text-red-500 font-semibold mb-3">No mess found with this code.</p>
                )}

                <button onClick={() => { setShowJoin(false); setInviteCode(''); setMessPreview(null); }}
                  className="w-full py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-600 text-sm">
                  Cancel
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#DCFCE7' }}>
                  <Check size={30} className="text-green-600" />
                </div>
                <p className="text-lg font-black text-gray-900">Request Sent!</p>
                <p className="text-sm text-gray-500 mt-1">Wait for the manager to approve you.</p>
                <button
                  onClick={() => { setShowJoin(false); setJoinDone(false); setInviteCode(''); setMessPreview(null); }}
                  className="mt-5 px-8 py-3 rounded-2xl font-bold text-white text-sm"
                  style={{ background: '#E60023' }}>
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        {/* My Messes */}
        {messes.length > 0 && (
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">My Messes</p>
            <div className="space-y-3">
              {messes.map(m => (
                <button
                  key={m.id}
                  onClick={() => router.push(`/mess/${m.id}`)}
                  className="card w-full text-left rounded-2xl px-5 py-4 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg flex-shrink-0"
                    style={{ background: '#E60023' }}>
                    {m.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 truncate">{m.name}</p>
                    {m.address && <p className="text-sm text-gray-400 truncate mt-0.5">{m.address}</p>}
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full inline-block mt-1"
                      style={
                        m.myRole === 'manager'   ? { background: '#FFE0E4', color: '#E60023' } :
                        m.myRole === 'comanager' ? { background: '#EDE9FE', color: '#7C3AED' } :
                                                   { background: '#F0F0F0', color: '#666' }
                      }>
                      {m.myRole === 'manager' ? 'Manager' : m.myRole === 'comanager' ? 'Co-Manager' : 'Member'}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {!loadingMesses && messes.length === 0 && !showCreate && !showJoin && (
          <div className="bg-white rounded-3xl p-12 text-center shadow-card">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Home size={28} className="text-gray-300" />
            </div>
            <p className="font-black text-gray-700 text-lg">No messes yet</p>
            <p className="text-sm text-gray-400 mt-1">Create or join one to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
