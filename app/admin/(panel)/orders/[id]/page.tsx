import Link from 'next/link';
import { notFound } from 'next/navigation';
import Flash from '@/components/admin/Flash';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { requireAdmin } from '@/lib/auth';
import { ORDER_STATUSES, formatDate, money, waNumber } from '@/lib/utils';
import type { Order, OrderItem } from '@/lib/types';
import { deleteOrder, updateOrder } from '../../../actions';

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const { supabase } = await requireAdmin();
  const [{ data: o }, { data: items }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('order_items').select('*').eq('order_id', params.id),
  ]);
  if (!o) notFound();
  const order = o as Order;
  const lines = (items ?? []) as OrderItem[];

  const wa = `https://wa.me/${waNumber(order.phone)}?text=${encodeURIComponent(
    `Assalam-o-Alaikum ${order.customer_name}, this is H & S Home Solutions regarding your order ${order.order_number} (total ${money(order.total)}).`,
  )}`;

  return (
    <>
      <div className="pagehead">
        <div>
          <Link href="/admin/orders" className="back">
            ← Orders
          </Link>
          <h1>
            {order.order_number} <span className={`badge st-${order.status}`}>{order.status}</span>
          </h1>
          <small className="muted">Placed {formatDate(order.created_at)}</small>
        </div>
        <a className="btn btn-wa" href={wa} target="_blank" rel="noopener noreferrer">
          💬 WhatsApp customer
        </a>
      </div>
      <Flash searchParams={searchParams} />

      <div className="cols">
        <section className="card">
          <h2>Customer</h2>
          <dl className="dl">
            <dt>Name</dt>
            <dd>{order.customer_name}</dd>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${order.phone}`}>{order.phone}</a>
            </dd>
            <dt>City</dt>
            <dd>{order.city || '—'}</dd>
            <dt>Address</dt>
            <dd>{order.address}</dd>
            <dt>Payment</dt>
            <dd>{order.payment_method}</dd>
            <dt>Customer note</dt>
            <dd>{order.customer_notes || '—'}</dd>
          </dl>
        </section>

        <section className="card">
          <h2>Manage order</h2>
          <form action={updateOrder} className="form">
            <input type="hidden" name="id" value={order.id} />
            <label className="field">
              <span>Order status</span>
              <select name="status" defaultValue={order.status}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Payment status</span>
              <select name="payment_status" defaultValue={order.payment_status}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label className="field">
              <span>Internal notes (customer can’t see)</span>
              <textarea name="admin_notes" rows={3} defaultValue={order.admin_notes} />
            </label>
            <p className="muted small">Cancelling an order puts tracked stock back automatically.</p>
            <button className="btn btn-primary">Save</button>
          </form>
        </section>
      </div>

      <section className="card">
        <h2>Items</h2>
        <div className="tablewrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Qty</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.product_name}</td>
                  <td>{money(l.unit_price)}</td>
                  <td>{l.quantity}</td>
                  <td className="right">{money(l.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="right">
                  Subtotal
                </td>
                <td className="right">{money(order.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="right">
                  Delivery
                </td>
                <td className="right">{money(order.delivery_fee)}</td>
              </tr>
              <tr className="grand">
                <td colSpan={3} className="right">
                  Total
                </td>
                <td className="right">{money(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <form action={deleteOrder}>
        <input type="hidden" name="id" value={order.id} />
        <ConfirmButton className="btn btn-danger" message={`Delete order ${order.order_number} permanently?`}>
          Delete order
        </ConfirmButton>
      </form>
    </>
  );
}
