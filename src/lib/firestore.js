import {
  collection, doc, addDoc, setDoc, updateDoc,
  getDoc, getDocs, query, where, serverTimestamp, writeBatch, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';

export function monthKey(date = new Date()) { return format(date, 'yyyy-MM'); }

export function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const AVATAR_COLORS = ['#E60023','#0076D3','#00A84F','#FF6B35','#9B59B6','#1ABC9C','#F39C12','#E74C3C','#3498DB','#2ECC71'];
export function randomAvatarColor() { return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]; }

export async function createOrUpdateUser(userId, data) {
  await setDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
export async function getUser(userId) {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createMess(managerId, data) {
  const inviteCode = generateInviteCode();
  const messRef = await addDoc(collection(db, 'messes'), {
    ...data, managerId, inviteCode, currency: 'BDT',
    messRent: 0, messServiceCharge: 0, messOtherCharge: 0, messOtherChargeLabel: '',
    useMessLevelCharges: false,
    createdAt: serverTimestamp(),
  });
  const managerUser = await getUser(managerId);
  await setDoc(doc(db, 'messes', messRef.id, 'members', managerId), {
    userId: managerId,
    name: managerUser?.name || 'Manager',
    role: 'manager',
    photoURL: managerUser?.photoURL || null,
    avatarColor: managerUser?.avatarColor || randomAvatarColor(),
    phone: null, joinedAt: serverTimestamp(), status: 'active', isManual: false,
    rent: 0, serviceCharge: 0, otherCharge: 0, otherChargeLabel: '',
  });
  // Store mess in user's mess list for fast lookup
  await updateDoc(doc(db, 'users', managerId), {
    messIds: [...((await getUser(managerId))?.messIds || []), messRef.id],
  });
  return messRef.id;
}

export async function getMessByInviteCode(code) {
  const q = query(collection(db, 'messes'), where('inviteCode', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const manager = await getUser(d.data().managerId);
  return { id: d.id, ...d.data(), managerName: manager?.name || 'Unknown' };
}

// Optimized: use messIds stored on user doc, fallback to scan
export async function getUserMesses(userId) {
  const userSnap = await getDoc(doc(db, 'users', userId));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const messIds = userData.messIds || [];

  // Fast path: user has stored mess IDs
  if (messIds.length > 0) {
    const result = [];
    for (const messId of messIds) {
      const [messSnap, memberSnap] = await Promise.all([
        getDoc(doc(db, 'messes', messId)),
        getDoc(doc(db, 'messes', messId, 'members', userId)),
      ]);
      if (messSnap.exists() && !messSnap.data().deleted &&
          memberSnap.exists() && memberSnap.data().status === 'active') {
        result.push({ id: messId, ...messSnap.data(), myRole: memberSnap.data().role });
      }
    }
    return result;
  }

  // Fallback: scan all messes (old behavior)
  const allMesses = await getDocs(collection(db, 'messes'));
  const result = [];
  for (const d of allMesses.docs) {
    if (d.data().deleted) continue;
    const m = await getDoc(doc(db, 'messes', d.id, 'members', userId));
    if (m.exists() && m.data().status === 'active')
      result.push({ id: d.id, ...d.data(), myRole: m.data().role });
  }
  return result;
}

export async function submitJoinRequest(messId, userId, userName) {
  await setDoc(doc(db, 'messes', messId, 'joinRequests', userId), {
    name: userName, userId, requestedAt: serverTimestamp(), status: 'pending',
  });
}

export async function approveJoinRequest(messId, userId) {
  const userDoc = await getUser(userId);
  const batch = writeBatch(db);
  batch.set(doc(db, 'messes', messId, 'members', userId), {
    userId, name: userDoc?.name || 'Member', role: 'member',
    photoURL: userDoc?.photoURL || null, avatarColor: userDoc?.avatarColor || randomAvatarColor(),
    phone: null, joinedAt: serverTimestamp(), status: 'active', isManual: false,
    rent: 0, serviceCharge: 0, otherCharge: 0, otherChargeLabel: '',
  });
  batch.update(doc(db, 'messes', messId, 'joinRequests', userId), { status: 'approved' });
  await batch.commit();
  // Add mess to user's list
  const existing = (await getUser(userId))?.messIds || [];
  if (!existing.includes(messId)) {
    await updateDoc(doc(db, 'users', userId), { messIds: [...existing, messId] });
  }
}

export async function rejectJoinRequest(messId, userId) {
  await updateDoc(doc(db, 'messes', messId, 'joinRequests', userId), { status: 'rejected' });
}

// ── Leave Requests ─────────────────────────────────────
export async function requestLeave(messId, memberId) {
  await updateDoc(doc(db, 'messes', messId, 'members', memberId), {
    leaveRequested: true, leaveRequestedAt: serverTimestamp(),
  });
}

export async function approveLeaveRequest(messId, memberId) {
  await updateDoc(doc(db, 'messes', messId, 'members', memberId), {
    status: 'left', leaveRequested: false, leftAt: serverTimestamp(),
  });
}

export async function rejectLeaveRequest(messId, memberId) {
  await updateDoc(doc(db, 'messes', messId, 'members', memberId), {
    leaveRequested: false,
  });
}

// ── Manual members ──────────────────────────────────────
export async function addManualMember(messId, { name, phone }) {
  const memberId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await setDoc(doc(db, 'messes', messId, 'members', memberId), {
    userId: null, name: name.trim(), role: 'member', photoURL: null,
    avatarColor: randomAvatarColor(), phone: phone?.trim() || null,
    joinedAt: serverTimestamp(), status: 'active', isManual: true,
    rent: 0, serviceCharge: 0, otherCharge: 0, otherChargeLabel: '',
    leaveRequested: false,
  });
  return memberId;
}

export async function updateMessInfo(messId, data) { await updateDoc(doc(db, 'messes', messId), data); }

// Mess-level shared charges (divided equally among active members)
export async function updateMessCharges(messId, charges) {
  await updateDoc(doc(db, 'messes', messId), charges);
}

export async function regenerateInviteCode(messId) {
  const code = generateInviteCode();
  await updateDoc(doc(db, 'messes', messId), { inviteCode: code });
  return code;
}

export async function updateMemberRole(messId, memberId, role) {
  await updateDoc(doc(db, 'messes', messId, 'members', memberId), { role });
}
export async function updateMemberCharges(messId, memberId, charges) {
  await updateDoc(doc(db, 'messes', messId, 'members', memberId), charges);
}

// Remove member AND soft-delete all their data, then recalc summary
export async function removeMember(messId, memberId) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'messes', messId, 'members', memberId), {
    status: 'removed', removedAt: serverTimestamp(),
  });
  await batch.commit();

  // Soft-delete all meals and expenses for this member across all months
  const monthsSnap = await getDocs(collection(db, 'messes', messId, 'months'));
  for (const monthDoc of monthsSnap.docs) {
    const mk = monthDoc.id;
    const [mealsSnap, expensesSnap] = await Promise.all([
      getDocs(query(collection(db, 'messes', messId, 'months', mk, 'meals'), where('memberId', '==', memberId))),
      getDocs(query(collection(db, 'messes', messId, 'months', mk, 'expenses'), where('memberId', '==', memberId))),
    ]);
    const b = writeBatch(db);
    mealsSnap.docs.forEach(d => { if (!d.data().deleted) b.update(d.ref, { deleted: true }); });
    expensesSnap.docs.forEach(d => { if (!d.data().deleted) b.update(d.ref, { deleted: true }); });
    if (mealsSnap.docs.length + expensesSnap.docs.length > 0) await b.commit();
    await recalcSummary(messId, mk);
  }
}

export async function transferManager(messId, oldManagerId, newManagerId) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'messes', messId, 'members', oldManagerId), { role: 'member' });
  batch.update(doc(db, 'messes', messId, 'members', newManagerId), { role: 'manager' });
  batch.update(doc(db, 'messes', messId), { managerId: newManagerId });
  await batch.commit();
}
export async function deleteMess(messId) {
  await updateDoc(doc(db, 'messes', messId), { deleted: true, deletedAt: serverTimestamp() });
}

export async function leaveMess(messId, memberId) {
  await updateDoc(doc(db, 'messes', messId, 'members', memberId), {
    status: 'left', leftAt: serverTimestamp(),
  });
}

// ── Meals ───────────────────────────────────────────────
export async function addMeal(messId, mk, mealData, addedBy) {
  const total = (mealData.breakfast || 0) + (mealData.lunch || 0) + (mealData.dinner || 0);
  await addDoc(collection(db, 'messes', messId, 'months', mk, 'meals'), {
    ...mealData, total, addedBy, createdAt: serverTimestamp(), editLog: [], deleted: false,
  });
  await recalcSummary(messId, mk);
}
export async function deleteMeal(messId, mk, mealId, deletedBy) {
  await updateDoc(doc(db, 'messes', messId, 'months', mk, 'meals', mealId), {
    deleted: true, editLog: [{ action: 'delete', by: deletedBy, at: new Date().toISOString() }],
  });
  await recalcSummary(messId, mk);
}

// ── Expenses ─────────────────────────────────────────────
export async function addExpense(messId, mk, expenseData, addedBy) {
  await addDoc(collection(db, 'messes', messId, 'months', mk, 'expenses'), {
    ...expenseData, addedBy, createdAt: serverTimestamp(), editLog: [], deleted: false,
  });
  await recalcSummary(messId, mk);
}
export async function deleteExpense(messId, mk, expId, deletedBy) {
  await updateDoc(doc(db, 'messes', messId, 'months', mk, 'expenses', expId), {
    deleted: true, editLog: [{ action: 'delete', by: deletedBy, at: new Date().toISOString() }],
  });
  await recalcSummary(messId, mk);
}

// ── Payments ─────────────────────────────────────────────
export async function addPayment(messId, mk, paymentData, addedBy) {
  await addDoc(collection(db, 'messes', messId, 'months', mk, 'payments'), {
    ...paymentData, addedBy, createdAt: serverTimestamp(), editLog: [], deleted: false,
  });
}
export async function deletePayment(messId, mk, payId, deletedBy) {
  await updateDoc(doc(db, 'messes', messId, 'months', mk, 'payments', payId), {
    deleted: true, editLog: [{ action: 'delete', by: deletedBy, at: new Date().toISOString() }],
  });
}

export async function recalcSummary(messId, mk) {
  const [mealsSnap, expensesSnap] = await Promise.all([
    getDocs(collection(db, 'messes', messId, 'months', mk, 'meals')),
    getDocs(collection(db, 'messes', messId, 'months', mk, 'expenses')),
  ]);
  let totalMeals = 0, totalExpense = 0;
  mealsSnap.docs.forEach(d => { if (!d.data().deleted) totalMeals += d.data().total || 0; });
  expensesSnap.docs.forEach(d => { if (!d.data().deleted) totalExpense += d.data().amount || 0; });
  const mealRate = totalMeals > 0 ? totalExpense / totalMeals : 0;
  await setDoc(doc(db, 'messes', messId, 'months', mk, 'summary', 'data'), {
    totalMeals, totalExpense, mealRate, updatedAt: serverTimestamp(),
  });
}

export async function getMemberBilling(messId, mk, memberId, messData, activeMemberCount) {
  const [mealsSnap, paymentsSnap, summarySnap, memberSnap, expensesSnap] = await Promise.all([
    getDocs(collection(db, 'messes', messId, 'months', mk, 'meals')),
    getDocs(collection(db, 'messes', messId, 'months', mk, 'payments')),
    getDoc(doc(db, 'messes', messId, 'months', mk, 'summary', 'data')),
    getDoc(doc(db, 'messes', messId, 'members', memberId)),
    getDocs(collection(db, 'messes', messId, 'months', mk, 'expenses')),
  ]);

  const mealRate = summarySnap.exists() ? summarySnap.data().mealRate : 0;
  const m = memberSnap.exists() ? memberSnap.data() : {};

  // Determine fixed charges
  let rent, serviceCharge, otherCharge, otherChargeLabel;
  const useShared = messData?.useMessLevelCharges;
  const count = activeMemberCount || 1;

  if (useShared && messData) {
    rent             = (messData.messRent || 0) / count;
    serviceCharge    = (messData.messServiceCharge || 0) / count;
    otherCharge      = (messData.messOtherCharge || 0) / count;
    otherChargeLabel = messData.messOtherChargeLabel || 'Other';
  } else {
    rent             = m.rent || 0;
    serviceCharge    = m.serviceCharge || 0;
    otherCharge      = m.otherCharge || 0;
    otherChargeLabel = m.otherChargeLabel || 'Other';
  }

  // Meals eaten by this member
  const myMeals = mealsSnap.docs
    .filter(d => !d.data().deleted && d.data().memberId === memberId)
    .reduce((s, d) => s + (d.data().total || 0), 0);

  const mealBill          = myMeals * mealRate;
  const totalFixedCharges = rent + serviceCharge + otherCharge;
  const totalBill         = mealBill + totalFixedCharges;

  // Money this member spent on mess expenses (bazaar etc.) — counts as their contribution
  const memberExpenses = expensesSnap.docs
    .filter(d => !d.data().deleted && d.data().memberId === memberId)
    .reduce((s, d) => s + (d.data().amount || 0), 0);

  // Direct payments made by this member
  const myPay      = paymentsSnap.docs.filter(d => !d.data().deleted && d.data().memberId === memberId);
  const paidMeal    = myPay.filter(d => d.data().reason === 'Meal').reduce((s, d) => s + d.data().amount, 0);
  const paidRent    = myPay.filter(d => d.data().reason === 'Rent').reduce((s, d) => s + d.data().amount, 0);
  const paidService = myPay.filter(d => d.data().reason === 'Service Charge').reduce((s, d) => s + d.data().amount, 0);
  const paidOthers  = myPay.filter(d => d.data().reason === 'Others').reduce((s, d) => s + d.data().amount, 0);
  const totalPaid   = paidMeal + paidRent + paidService + paidOthers;

  // Net Due = Bill - what they spent on mess - what they directly paid
  const netDue = totalBill - memberExpenses - totalPaid;

  return {
    myMeals, mealRate, mealBill,
    rent, serviceCharge, otherCharge, otherChargeLabel,
    totalFixedCharges, totalBill,
    memberExpenses,
    paidMeal, paidRent, paidService, paidOthers, totalPaid,
    netDue,
  };
}
