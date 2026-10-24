import Link from 'next/link';
import { redirect } from 'next/navigation';
import Wordmark from '@/components/admin/Wordmark';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { formatDate, money } from '@/lib/utils';
import { accountSignOut } from './actions';

export const dynamic = 'force-dynamic';

type Item = { product_name: string; quantity: number; line_total: number };
type MyOrder = { id: string; order_number: string; total: number; status: string; created_at: string; order_items: Item[] };

export default async function AccountPage() {
  if (!hasSupabaseEnv) redirect('/account/login');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/account/login');

  const [{ data: profile }, { data: seller }, { data: admin }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('full_name,status').eq('id', user.id).maybeSingle(),
    supabase.from('seller_profiles').select('status,store_name').eq('user_id', user.id).maybeSingle(),
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('orders')
      .select('id,order_number,total,status,created_at,order_items(product_name,quantity,line_total)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  const myOrders = (orders ?? []) as unknown as MyOrder[];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="pagehead">
        <Link href="/" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Wordmark size={30} />
          <span className="muted">← Back to store</span>
        </Link>
        <form action={accountSignOut}>
          <button className="btn btn-ghost btn-sm">Logout</button>
        </form>
      </div>

      <section className="card">
        <h1>{profile?.full_name || 'My account'}</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {user.email}
          {profile && profile.status !== 'approved' && (
            <>
              {' '}
              <span className={`badge ${profile.status === 'pending' ? 'st-new' : 'st-cancelled'}`}>{profile.status}</span>
            </>
          )}
        </p>
        {profile?.status === 'pending' && (
          <div className="flash flash-err" style={{ marginTop: 12 }}>
            Your account is waiting for approval from the store. You can order again once it is accepted.
          </div>
        )}
        {profile?.status === 'rejected' && (
          <div className="flash flash-err" style={{ marginTop: 12 }}>
            Your account has been blocked by the store. Please contact us on WhatsApp.
          </div>
        )}
        <div className="rowactions" style={{ justifyContent: 'flex-start', marginTop: 14, flexWrap: 'wrap' }}>
          {admin && (
            <Link className="btn btn-primary btn-sm" href="/admin">
              ⚙️ Admin panel
            </Link>
          )}
          {seller ? (
            <Link className="btn btn-primary btn-sm" href="/seller">
              🏪 Seller dashboard ({seller.status})
            </Link>
          ) : (
            !admin && (
              <Link className="btn btn-ghost btn-sm" href="/seller/register">
                🏪 Become a seller
              </Link>
            )
          )}
        </div>
      </section>

      <section className="card">
        <h2>My orders</h2>
        {myOrders.length === 0 && <p className="muted">You have not placed any orders with this account yet.</p>}
        <ul className="list">
          {myOrders.map((o) => (
            <li key={o.id} style={{ alignItems: 'flex-start' }}>
              <span>
                <b>{o.order_number}</b> <small className="muted">• {formatDate(o.created_at)}</small>
                <br />
                <small>{o.order_items.map((i) => `${i.product_name} × ${i.quantity}`).join(', ')}</small>
              </span>
              <span style={{ textAlign: 'right' }}>
                <b>{money(o.total)}</b>
                <br />
                <span className={`badge st-${o.status}`}>{o.status}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
