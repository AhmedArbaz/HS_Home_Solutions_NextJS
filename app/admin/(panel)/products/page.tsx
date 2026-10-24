import Link from 'next/link';
import Flash from '@/components/admin/Flash';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { requireAdmin } from '@/lib/auth';
import { money } from '@/lib/utils';
import type { Category, Product } from '@/lib/types';
import { deleteProduct, toggleProduct } from '../../actions';

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const { supabase } = await requireAdmin();
  const q = one(searchParams.q).replace(/[%,()*]/g, ' ').trim();
  const cat = one(searchParams.cat);
  const vis = one(searchParams.vis);

  let query = supabase.from('products').select('*').order('sort_order').order('created_at', { ascending: false });
  if (q) query = query.ilike('name', `%${q}%`);
  if (cat === 'none') query = query.is('category_id', null);
  else if (cat) query = query.eq('category_id', cat);
  if (vis === 'active') query = query.eq('is_active', true);
  if (vis === 'hidden') query = query.eq('is_active', false);

  const [{ data }, catRes, sellerRes] = await Promise.all([
    query,
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('seller_profiles').select('user_id,store_name'),
  ]);
  const storeOf = new Map((sellerRes.data ?? []).map((s) => [s.user_id, s.store_name]));
  const products = (data ?? []) as Product[];
  const categories = (catRes.data ?? []) as Category[];
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <div className="pagehead">
        <h1>Products</h1>
        <Link className="btn btn-primary" href="/admin/products/new">
          + Add product
        </Link>
      </div>
      <Flash searchParams={searchParams} />

      <form className="filters card" method="get">
        <input name="q" defaultValue={q} placeholder="Search products…" />
        <select name="cat" defaultValue={cat}>
          <option value="">All categories</option>
          <option value="none">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="vis" defaultValue={vis}>
          <option value="">Visible + hidden</option>
          <option value="active">Visible only</option>
          <option value="hidden">Hidden only</option>
        </select>
        <button className="btn btn-primary">Filter</button>
        <Link className="btn btn-ghost" href="/admin/products">
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
                  No products found.
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
                  <Link href={`/admin/products/${p.id}`}>
                    <b>{p.name}</b>
                  </Link>
                  {p.is_featured && <span className="badge st-confirmed">featured</span>}
                  {p.seller_id && <span className="badge st-processing">seller: {storeOf.get(p.seller_id) ?? '—'}</span>}
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
                  <form action={toggleProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="field" value="is_active" />
                    <input type="hidden" name="value" value={String(!p.is_active)} />
                    <button className={`switch ${p.is_active ? 'on' : ''}`} title="Show / hide in store">
                      {p.is_active ? 'Visible' : 'Hidden'}
                    </button>
                  </form>
                </td>
                <td>
                  <div className="rowactions">
                  <Link className="btn btn-ghost btn-sm" href={`/admin/products/${p.id}`}>
                    Edit
                  </Link>
                  <form action={deleteProduct}>
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
