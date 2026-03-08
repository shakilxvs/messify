'use client';

import { useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';

const ICONS = {
  danger:  { Icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  warning: { Icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  info:    { Icon: Info,          color: '#0076D3', bg: '#EFF6FF', border: '#BFDBFE' },
  success: { Icon: CheckCircle,   color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  type         = 'warning',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const { Icon, color, bg, border } = ICONS[type] || ICONS.warning;

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else       document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-dialog-in">
        {/* Icon strip */}
        <div className="flex items-center justify-center pt-7 pb-4"
          style={{ background: bg }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: border }}>
            <Icon size={28} style={{ color }} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 pt-4 text-center">
          <p className="text-lg font-black text-gray-900 mb-1.5">{title}</p>
          {message && <p className="text-sm text-gray-500 leading-relaxed">{message}</p>}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 p-5">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-gray-600 disabled:opacity-50"
            style={{ background: '#F0F0F0' }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-60"
            style={{ background: color }}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dialog-in {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-dialog-in { animation: dialog-in 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>
    </div>
  );
}
