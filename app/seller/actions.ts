'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSeller } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string): number | null => {
  const v = str(fd, k);
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const flag = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';

function back(path: string, kind: 'msg' | 'err', text: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(text)}`);
}
const refreshStore = () => revalidatePath('/');

// ---------------------------------------------------------------- auth
export async function sellerSignOut() {
  await createClient().auth.signOut();
  redirect('/seller/login');
}

export async function reapplySeller() {
  const { supabase } = await requireSeller();
  const { error } = await supabase.rpc('seller_reapply');
  if (error) back('/seller', 'err', error.message);
  back('/seller', 'msg', 'Application sent again. The admin will review it.');
}

// ------------------------------------------------------------ products
export async function saveSellerProduct(fd: FormData) {
  const { supabase, user } = await requireSeller({ approved: true });
  const id = str(fd, 'id');
  const here = id ? `/seller/products/${id}` : '/seller/products/new';

  const name = str(fd, 'name');
  const price = num(fd, 'price');
  if (!name) back(here, 'err', 'Product name is required.');
  if (price === null || price < 0) back(here, 'err', 'Please enter a valid price.');

  const stockRaw = num(fd, 'stock');
  const compare = num(fd, 'compare_at_price');
  const row = {
    name,
    slug: slugify(str(fd, 'slug') || name) || 'product',
    description: str(fd, 'description'),
    price,
    compare_at_price: compare && compare > 0 ? compare : null,
    category_id: str(fd, 'category_id') || null,
    emoji: str(fd, 'emoji') || '🛍️',
    image_url: str(fd, 'image_url') || null,
    stock: stockRaw === null ? null : Math.max(0, Math.floor(stockRaw)),
    is_active: flag(fd, 'is_active'),
  };

  const run = () =>
    id
      ? supabase.from('products').update(row).eq('id', id).eq('seller_id', user.id)
      : supabase.from('products').insert({ ...row, seller_id: user.id, is_featured: false });

  let { error } = await run();
  if (error?.code === '23505') {
    row.slug = `${row.slug}-${Math.random().toString(36).slice(2, 6)}`;
    ({ error } = await run());
  }
  if (error) back(here, 'err', error.message);

  refreshStore();
  back('/seller/products', 'msg', 'Product saved.');
}

export async function deleteSellerProduct(fd: FormData) {
  const { supabase, user } = await requireSeller({ approved: true });
  const { error } = await supabase.from('products').delete().eq('id', str(fd, 'id')).eq('seller_id', user.id);
  if (error) back('/seller/products', 'err', error.message);
  refreshStore();
  back('/seller/products', 'msg', 'Product deleted.');
}

export async function toggleSellerProduct(fd: FormData) {
  const { supabase, user } = await requireSeller({ approved: true });
  const { error } = await supabase
    .from('products')
    .update({ is_active: str(fd, 'value') === 'true' })
    .eq('id', str(fd, 'id'))
    .eq('seller_id', user.id);
  if (error) back('/seller/products', 'err', error.message);
  refreshStore();
  revalidatePath('/seller/products');
}

// -------------------------------------------------------------- orders
const STATUSES = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export async function updateSellerItem(fd: FormData) {
  const { supabase } = await requireSeller({ approved: true });
  const status = str(fd, 'status');
  const here = `/seller/orders?status=${encodeURIComponent(str(fd, 'filter'))}`;
  if (!STATUSES.includes(status)) back(here, 'err', 'Invalid status.');

  const { error } = await supabase.rpc('seller_update_item', { p_item: str(fd, 'id'), p_status: status });
  if (error) back(here, 'err', error.message);
  refreshStore(); // cancelling gives stock back
  back(here, 'msg', 'Order item updated.');
}

// ------------------------------------------------------ store profile
export async function saveSellerProfile(fd: FormData) {
  const { supabase, user } = await requireSeller();
  const store_name = str(fd, 'store_name');
  if (store_name.length < 2) back('/seller/profile', 'err', 'Store name is required.');

  const { error } = await supabase
    .from('seller_profiles')
    .update({
      store_name: store_name.slice(0, 100),
      owner_name: str(fd, 'owner_name').slice(0, 100),
      phone: str(fd, 'phone').slice(0, 30),
      city: str(fd, 'city').slice(0, 100),
      address: str(fd, 'address').slice(0, 300),
      description: str(fd, 'description').slice(0, 1000),
    })
    .eq('user_id', user.id);
  if (error) back('/seller/profile', 'err', error.message);
  back('/seller/profile', 'msg', 'Store profile saved.');
}
