'use client';

import { useEffect } from 'react';

export default function BottomSheet({ open, onClose, children, title = '' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 overlay"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="relative w-full max-w-lg bottom-sheet bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        {/* Title */}
        {title && (
          <div className="px-5 pb-3 flex-shrink-0 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>
        )}
        {/* Content */}
        <div className="overflow-y-auto flex-1 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}
