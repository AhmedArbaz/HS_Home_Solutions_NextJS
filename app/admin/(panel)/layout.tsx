import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import Wordmark from '@/components/admin/Wordmark';
import { requireAdmin } from '@/lib/auth';
import { signOut } from '../actions';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireAdmin();
  const [{ count }, { count: pendingSellers }] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('seller_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  return (
    <div className="shell">
      <aside className="side">
        <div className="sidebrand">
          <span className="logotile">
            <Wordmark size={20} />
          </span>
          <div>
            <strong>Home Solutions</strong>
            <small>Admin panel</small>
          </div>
        </div>
        <AdminNav newOrders={count ?? 0} pendingSellers={pendingSellers ?? 0} />
        <div className="sidefoot">
          <Link href="/" target="_blank">
            ↗ View store
          </Link>
          <small>{user.email}</small>
          <form action={signOut}>
            <button className="linkbtn">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
