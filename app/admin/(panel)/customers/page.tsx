import { requireAdmin } from '@/lib/auth';
import { formatDate, money, waNumber } from '@/lib/utils';

export default async function CustomersPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('orders')
    .select('customer_name,phone,city,total,status,created_at')
    .order('created_at', { ascending: false })
    .limit(2000);

  type C = { name: string; phone: string; city: string; orders: number; spent: number; last: string };
  const map = new Map<string, C>();
  for (const o of data ?? []) {
    const key = waNumber(o.phone);
    const c = map.get(key) ?? { name: o.customer_name, phone: o.phone, city: o.city, orders: 0, spent: 0, last: o.created_at };
    c.orders += 1;
    if (o.status !== 'cancelled') c.spent += Number(o.total);
    map.set(key, c);
  }
  const customers = [...map.entries()].sort((a, b) => b[1].spent - a[1].spent);

  return (
    <>
      <div className="pagehead">
        <h1>Customers</h1>
      </div>
      <p className="muted">Built automatically from orders (grouped by phone number, latest 2000 orders).</p>
      <div className="card tablewrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>City</th>
              <th>Orders</th>
              <th>Total spent</th>
              <th>Last order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="muted center">
                  No customers yet.
                </td>
              </tr>
            )}
            {customers.map(([key, c]) => (
              <tr key={key}>
                <td>
                  <b>{c.name}</b>
                </td>
                <td>{c.phone}</td>
                <td>{c.city || '—'}</td>
                <td>{c.orders}</td>
                <td>{money(c.spent)}</td>
                <td>{formatDate(c.last)}</td>
                <td>
                  <a className="btn btn-wa btn-sm" href={`https://wa.me/${key}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
