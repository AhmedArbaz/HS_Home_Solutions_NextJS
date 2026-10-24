import Link from 'next/link';
import Flash from '@/components/admin/Flash';
import { requireSeller } from '@/lib/auth';
import { ORDER_STATUSES, formatDate, money, waNumber } from '@/lib/utils';
import { updateSellerItem } from '../../actions';

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function SellerOrders({ searchParams }: { searchParams: SP }) {
  const { supabase, user } = await requireSeller();
  const status = ORDER_STATUSES.some((s) => s.value === one(searchParams.status)) ? one(searchParams.status) : '';

  let query = supabase
    .from('order_items')
    .select(
      'id,product_name,unit_price,quantity,line_total,fulfil_status,orders(order_number,customer_name,phone,address,city,payment_method,customer_notes,created_at)',
    )
    .eq('seller_id', user.id)
    .limit(300);
  if (status) query = query.eq('fulfil_status', status);
  const { data } = await query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data ?? []) as any[]).sort((a, b) => String(b.orders?.created_at).localeCompare(String(a.orders?.created_at)));

  return (
    <>
      <div className="pagehead">
        <h1>Orders for my products</h1>
      </div>
      <Flash searchParams={searchParams} />

      <div className="tabs">
        <Link href="/seller/orders" className={status === '' ? 'active' : ''}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s.value} href={`/seller/orders?status=${s.value}`} className={status === s.value ? 'active' : ''}>
            {s.label}
          </Link>
        ))}
      </div>

      <div className="card tablewrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Item</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted center">
                  No orders here yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="nowrap">
                  <b>{r.orders?.order_number}</b>
                  <br />
                  <small className="muted">{r.orders?.created_at ? formatDate(r.orders.created_at) : ''}</small>
                </td>
                <td>
                  <b>{r.orders?.customer_name}</b>
                  <br />
                  <a href={`https://wa.me/${waNumber(r.orders?.phone ?? '')}`} target="_blank" rel="noreferrer">
                    {r.orders?.phone}
                  </a>
                  <br />
                  <small className="muted">
                    {r.orders?.address}
                    {r.orders?.city ? `, ${r.orders.city}` : ''}
                  </small>
                  {r.orders?.customer_notes && (
                    <>
                      <br />
                      <small>📝 {r.orders.customer_notes}</small>
                    </>
                  )}
                </td>
                <td>
                  {r.product_name} × {r.quantity}
                  <br />
                  <small className="muted">{r.orders?.payment_method}</small>
                </td>
                <td className="nowrap">{money(r.line_total)}</td>
                <td>
                  <form action={updateSellerItem} style={{ display: 'flex', gap: 6 }}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="filter" value={status} />
                    <select name="status" defaultValue={r.fulfil_status}>
                      {ORDER_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-ghost btn-sm">Update</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
