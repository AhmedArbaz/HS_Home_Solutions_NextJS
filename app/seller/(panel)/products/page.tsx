import Link from 'next/link';
import Flash from '@/components/admin/Flash';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { requireSeller } from '@/lib/auth';
import { money } from '@/lib/utils';
import type { Category, Product } from '@/lib/types';
import { deleteSellerProduct, toggleSellerProduct } from '../../actions';

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function SellerProducts({ searchParams }: { searchParams: SP }) {
  const { supabase, user } = await requireSeller();
  const q = one(searchParams.q).replace(/[%,()*]/g, ' ').trim();

  let query = supabase.from('products').select('*').eq('seller_id', user.id).order('created_at', { ascending: false });
  if (q) query = query.ilike('name', `%${q}%`);
  const [{ data }, catRes] = await Promise.all([query, supabase.from('categories').select('*')]);
  const products = (data ?? []) as Product[];
  const catName = new Map(((catRes.data ?? []) as Category[]).map((c) => [c.id, c.name]));

  return (
    <>
      <div className="pagehead">
        <h1>My products</h1>
        <Link className="btn btn-primary" href="/seller/products/new">
          + Add product
        </Link>
      </div>
      <Flash searchParams={searchParams} />

      <form className="filters card" method="get">
        <input name="q" defaultValue={q} placeholder="Search my products…" />
        <button className="btn btn-primary">Search</button>
        <Link className="btn btn-ghost" href="/seller/products">
          Reset
        </Link>
      </form>

      <div className="card tablewrap">
        <table className="tbl">
          <thead>
            <tr>
              <th></th>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Store</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="muted center">
                  You have no products yet. Click “Add product”.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className={p.is_active ? '' : 'dim'}>
                <td>
                  <div className="thumb">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt="" />
                    ) : (
                      p.emoji
                    )}
                  </div>
                </td>
                <td>
                  <Link href={`/seller/products/${p.id}`}>
                    <b>{p.name}</b>
                  </Link>
                </td>
                <td>{p.category_id ? catName.get(p.category_id) ?? '—' : '—'}</td>
                <td>
                  {money(p.price)}
                  {p.compare_at_price ? <small className="strike"> {money(p.compare_at_price)}</small> : null}
                </td>
                <td>
                  {p.stock === null ? (
                    <span className="muted">not tracked</span>
                  ) : (
                    <span className={`badge ${p.stock === 0 ? 'st-cancelled' : p.stock <= 5 ? 'st-new' : 'st-delivered'}`}>
                      {p.stock}
                    </span>
                  )}
                </td>
                <td>
                  <form action={toggleSellerProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="value" value={String(!p.is_active)} />
                    <button className={`switch ${p.is_active ? 'on' : ''}`} title="Show / hide in store">
                      {p.is_active ? 'Visible' : 'Hidden'}
                    </button>
                  </form>
                </td>
                <td>
                  <div className="rowactions">
                    <Link className="btn btn-ghost btn-sm" href={`/seller/products/${p.id}`}>
                      Edit
                    </Link>
                    <form action={deleteSellerProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton className="btn btn-danger btn-sm" message={`Delete "${p.name}"? This cannot be undone.`}>
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
