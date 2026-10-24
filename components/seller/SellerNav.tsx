'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/seller', label: 'Dashboard', icon: '📊' },
  { href: '/seller/products', label: 'My products', icon: '📦' },
  { href: '/seller/orders', label: 'Orders', icon: '🧾' },
  { href: '/seller/profile', label: 'Store & password', icon: '⚙️' },
];

export default function SellerNav({ newItems }: { newItems: number }) {
  const path = usePathname();
  return (
    <nav className="sidenav">
      {LINKS.map((l) => {
        const active = l.href === '/seller' ? path === '/seller' : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? 'active' : ''}>
            <span>{l.icon}</span>
            {l.label}
            {l.href === '/seller/orders' && newItems > 0 && <b className="pill">{newItems}</b>}
          </Link>
        );
      })}
    </nav>
  );
}
