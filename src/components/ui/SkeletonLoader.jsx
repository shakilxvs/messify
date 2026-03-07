'use client';

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card">
      <div className="flex flex-col items-center gap-3">
        <div className="skeleton w-16 h-16 rounded-full" />
        <div className="skeleton w-24 h-4" />
        <div className="skeleton w-16 h-3" />
        <div className="skeleton w-20 h-5 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card flex-1">
      <div className="skeleton w-12 h-6 mb-2" />
      <div className="skeleton w-20 h-3" />
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl p-3 shadow-card flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton w-32 h-4" />
            <div className="skeleton w-20 h-3" />
          </div>
          <div className="skeleton w-16 h-5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function SkeletonPage() {
  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
