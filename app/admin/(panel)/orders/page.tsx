import Link from 'next/link';
import Flash from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/auth';
import { ORDER_STATUSES, formatDate, money } from '@/lib/utils';
import type { Order } from '@/lib/types';

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const PAGE = 25;

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const { supabase } = await requireAdmin();
  const status = one(searchParams.status);
  const q = one(searchParams.q).replace(/[%,()*]/g, ' ').trim();
  const page = Math.max(1, Number(one(searchParams.page)) || 1);

  let query = supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * PAGE, page * PAGE - 1);
  const orders = (data ?? []) as Order[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  const link = (p: number) => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (q) sp.set('q', q);
    if (p > 1) sp.set('page', String(p));
    const s = sp.toString();
    return `/admin/orders${s ? `?${s}` : ''}`;
  };

  return (
    <>
      <div className="pagehead">
        <h1>Orders</h1>
      </div>
      <Flash searchParams={searchParams} />

      <div className="tabs">
        <Link href="/admin/orders" className={!status ? 'active' : ''}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s.value} href={`/admin/orders?status=${s.value}`} className={status === s.value ? 'active' : ''}>
            {s.label}
          </Link>
        ))}
      </div>

      <form className="filters card" method="get">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Search order no., name or phone…" />
        <button className="btn btn-primary">Search</button>
        {(q || status) && (
          <Link className="btn btn-ghost" href="/admin/orders">
            Reset
          </Link>
        )}
      </form>

      <div className="card tablewrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="muted center">
                  No orders found.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`}>
                    <b>{o.order_number}</b>
                  </Link>
                </td>
                <td>
                  {o.customer_name}
                  {o.city && <small className="muted"> · {o.city}</small>}
                </td>
                <td>{o.phone}</td>
                <td>{money(o.total)}</td>
                <td>
                  <span className={`badge ${o.payment_status === 'paid' ? 'st-delivered' : 'st-new'}`}>{o.payment_status}</span>
                </td>
                <td>
                  <span className={`badge st-${o.status}`}>{o.status}</span>
                </td>
                <td>{formatDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="pager">
          {page > 1 && <Link href={link(page - 1)}>← Previous</Link>}
          <span>
            Page {page} of {pages} ({count} orders)
          </span>
          {page < pages && <Link href={link(page + 1)}>Next →</Link>}
        </div>
      )}
    </>
  );
}
