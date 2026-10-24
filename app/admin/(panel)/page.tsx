import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatDate, money } from '@/lib/utils';

const karachiDay = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [products, orders30, recent, newCount, totalOrders, pendingSellers, approvedSellers, usersAll, guestsAll] = await Promise.all([
    supabase.from('products').select('id,name,emoji,image_url,stock,is_active'),
    supabase.from('orders').select('total,status,created_at').gte('created_at', since).limit(1000),
    supabase.from('orders').select('id,order_number,customer_name,total,status,created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('seller_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('seller_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_guest', true),
  ]);

  const prodList = products.data ?? [];
  const live = (orders30.data ?? []).filter((o) => o.status !== 'cancelled');
  const today = karachiDay(new Date());

  const sum = (rows: typeof live) => rows.reduce((s, o) => s + Number(o.total), 0);
  const todayRows = live.filter((o) => karachiDay(o.created_at) === today);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const key = karachiDay(d);
    const rows = live.filter((o) => karachiDay(o.created_at) === key);
    return {
      key,
      label: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Asia/Karachi' }),
      count: rows.length,
      revenue: sum(rows),
    };
  });
  const maxRev = Math.max(1, ...week.map((w) => w.revenue));

  const low = prodList
    .filter((p) => p.is_active && p.stock !== null && p.stock <= 5)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 8);

  const statusCounts = (orders30.data ?? []).reduce<Record<string, number>>((m, o) => {
    m[o.status] = (m[o.status] ?? 0) + 1;
    return m;
  }, {});

  return (
    <>
      <div className="pagehead">
        <h1>Dashboard</h1>
        <Link className="btn btn-primary" href="/admin/products/new">
          + Add product
        </Link>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Today</span>
          <b>{money(sum(todayRows))}</b>
          <small>{todayRows.length} orders</small>
        </div>
        <div className="stat">
          <span>Last 7 days</span>
          <b>{money(week.reduce((s, w) => s + w.revenue, 0))}</b>
          <small>{week.reduce((s, w) => s + w.count, 0)} orders</small>
        </div>
        <div className="stat">
          <span>Last 30 days</span>
          <b>{money(sum(live))}</b>
          <small>{live.length} orders (excl. cancelled)</small>
        </div>
        <div className="stat hot">
          <span>New orders waiting</span>
          <b>{newCount.count ?? 0}</b>
          <small>
            <Link href="/admin/orders?status=new">Review now →</Link>
          </small>
        </div>
        <div className="stat">
          <span>Products</span>
          <b>{prodList.length}</b>
          <small>{prodList.filter((p) => p.is_active).length} visible in store</small>
        </div>
        <div className="stat">
          <span>All orders</span>
          <b>{totalOrders.count ?? 0}</b>
          <small>since launch</small>
        </div>
        <div className={`stat ${(pendingSellers.count ?? 0) > 0 ? 'hot' : ''}`}>
          <span>Seller applications</span>
          <b>{pendingSellers.count ?? 0}</b>
          <small>
            <Link href="/admin/sellers?tab=pending">Review sellers →</Link>
          </small>
        </div>
        <div className="stat">
          <span>Approved sellers</span>
          <b>{approvedSellers.count ?? 0}</b>
          <small>
            <Link href="/admin/sellers?tab=approved">Manage →</Link>
          </small>
        </div>
        <div className="stat">
          <span>Users</span>
          <b>{usersAll.count ?? 0}</b>
          <small>
            {guestsAll.count ?? 0} guest users • <Link href="/admin/users">Manage →</Link>
          </small>
        </div>
      </div>

      <div className="cols">
        <section className="card">
          <h2>Revenue — last 7 days</h2>
          <div className="bars">
            {week.map((w) => (
              <div key={w.key} className="bar" title={`${money(w.revenue)} • ${w.count} orders`}>
                <i style={{ height: `${Math.max(4, (w.revenue / maxRev) * 100)}%` }} />
                <small>{w.label}</small>
              </div>
            ))}
          </div>
          <div className="chips">
            {Object.entries(statusCounts).map(([s, n]) => (
              <span key={s} className={`badge st-${s}`}>
                {s}: {n}
              </span>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Low stock</h2>
          {low.length === 0 ? (
            <p className="muted">Nothing running low. (Only products with stock tracking are listed.)</p>
          ) : (
            <ul className="list">
              {low.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`}>
                    {p.emoji} {p.name}
                  </Link>
                  <span className={`badge ${p.stock === 0 ? 'st-cancelled' : 'st-new'}`}>{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="cardhead">
          <h2>Recent orders</h2>
          <Link href="/admin/orders">View all →</Link>
        </div>
        <div className="tablewrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {(recent.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="muted center">
                    No orders yet.
                  </td>
                </tr>
              )}
              {(recent.data ?? []).map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`}>
                      <b>{o.order_number}</b>
                    </Link>
                  </td>
                  <td>{o.customer_name}</td>
                  <td>{money(o.total)}</td>
                  <td>
                    <span className={`badge st-${o.status}`}>{o.status}</span>
                  </td>
                  <td>{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
