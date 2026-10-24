import Link from 'next/link';
import Flash from '@/components/admin/Flash';
import { requireSeller } from '@/lib/auth';
import { formatDate, money } from '@/lib/utils';

type SP = { [key: string]: string | string[] | undefined };

export default async function SellerDashboard({ searchParams }: { searchParams: SP }) {
  const { supabase, user, seller } = await requireSeller();

  const [products, items] = await Promise.all([
    supabase.from('products').select('id,name,stock,is_active').eq('seller_id', user.id),
    supabase
      .from('order_items')
      .select('id,product_name,quantity,line_total,fulfil_status,orders(order_number,customer_name,created_at)')
      .eq('seller_id', user.id)
      .limit(2000),
  ]);

  const prods = products.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (items.data ?? []) as any[];
  const live = rows.filter((r) => r.fulfil_status !== 'cancelled');
  const revenue = live.reduce((s, r) => s + Number(r.line_total), 0);
  const low = prods.filter((p) => p.is_active && p.stock !== null && p.stock <= 5);
  const recent = [...rows]
    .sort((a, b) => String(b.orders?.created_at).localeCompare(String(a.orders?.created_at)))
    .slice(0, 8);

  return (
    <>
      <div className="pagehead">
        <h1>Welcome, {seller.store_name}</h1>
        <Link className="btn btn-primary" href="/seller/products/new">
          + Add product
        </Link>
      </div>
      <Flash searchParams={searchParams} />

      <div className="stats">
        <div className="stat">
          <span>My products</span>
          <b>{prods.length}</b>
          <small>{prods.filter((p) => p.is_active).length} visible in store</small>
        </div>
        <div className={`stat ${rows.some((r) => r.fulfil_status === 'new') ? 'hot' : ''}`}>
          <span>New order items</span>
          <b>{rows.filter((r) => r.fulfil_status === 'new').length}</b>
          <small>
            <Link href="/seller/orders?status=new">Review now →</Link>
          </small>
        </div>
        <div className="stat">
          <span>Sales (excl. cancelled)</span>
          <b>{money(revenue)}</b>
          <small>{live.length} order items</small>
        </div>
      </div>

      <div className="cols">
        <section className="card">
          <h2>Recent orders</h2>
          {recent.length === 0 && <p className="muted">No orders yet.</p>}
          <ul className="list">
            {recent.map((r) => (
              <li key={r.id}>
                <span>
                  <b>{r.orders?.order_number}</b> • {r.product_name} × {r.quantity}
                  <br />
                  <small className="muted">
                    {r.orders?.customer_name} • {r.orders?.created_at ? formatDate(r.orders.created_at) : ''}
                  </small>
                </span>
                <span className={`badge st-${r.fulfil_status}`}>{r.fulfil_status}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Low stock</h2>
          {low.length === 0 && <p className="muted">Nothing running low.</p>}
          <ul className="list">
            {low.map((p) => (
              <li key={p.id}>
                <Link href={`/seller/products/${p.id}`}>{p.name}</Link>
                <span className={`badge ${p.stock === 0 ? 'st-cancelled' : 'st-new'}`}>{p.stock} left</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
