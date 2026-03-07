'use client';

import { Home, Search, Bell, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function BottomNav({ messId }) {
  const pathname = usePathname();

  const tabs = [
    { label: 'Home', icon: Home, href: `/mess/${messId}` },
    { label: 'Search', icon: Search, href: `/mess/${messId}?tab=search` },
    { label: 'Profile', icon: User, href: `/mess/${messId}?tab=profile` },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 flex items-center justify-around px-4 py-2 safe-area-pb"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${
              active ? 'text-brand-red' : 'text-gray-400'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
