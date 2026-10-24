'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/orders', label: 'Orders', icon: '🧾' },
  { href: '/admin/products', label: 'Products', icon: '📦' },
  { href: '/admin/categories', label: 'Categories', icon: '🗂️' },
  { href: '/admin/sellers', label: 'Sellers', icon: '🏪' },
  { href: '/admin/users', label: 'Users', icon: '🙋' },
  { href: '/admin/customers', label: 'Customers', icon: '👥' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  { href: '/admin/account', label: 'Password', icon: '🔑' },
];

export default function AdminNav({ newOrders, pendingSellers = 0 }: { newOrders: number; pendingSellers?: number }) {
  const path = usePathname();
  return (
    <nav className="sidenav">
      {LINKS.map((l) => {
        const active = l.href === '/admin' ? path === '/admin' : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? 'active' : ''}>
            <span>{l.icon}</span>
            {l.label}
            {l.href === '/admin/orders' && newOrders > 0 && <b className="pill">{newOrders}</b>}
            {l.href === '/admin/sellers' && pendingSellers > 0 && <b className="pill">{pendingSellers}</b>}
          </Link>
        );
      })}
    </nav>
  );
}
