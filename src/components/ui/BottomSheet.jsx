'use client';

import { useEffect, useRef, useState } from 'react';

export default function BottomSheet({ open, onClose, children, title = '' }) {
  const sheetRef   = useRef(null);
  const startYRef  = useRef(0);
  const currentYRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) setTranslateY(0); // reset on open
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ── Touch handlers ──────────────────────────────────────
  const onTouchStart = (e) => {
    startYRef.current  = e.touches[0].clientY;
    currentYRef.current = 0;
    setDragging(true);
  };

  const onTouchMove = (e) => {
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy < 0) return; // don't allow dragging up
    currentYRef.current = dy;
    setTranslateY(dy);
  };

  const onTouchEnd = () => {
    setDragging(false);
    if (currentYRef.current > 120) {
      onClose();
      setTranslateY(0);
    } else {
      setTranslateY(0); // snap back
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 overlay" onClick={onClose} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-lg bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Drag handle — touch target */}
        <div
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
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
