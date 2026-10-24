'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { slugify, waNumber } from '@/lib/utils';

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

function refreshStore() {
  revalidatePath('/');
}

// ---------------------------------------------------------------- auth
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

// ------------------------------------------------------------- products
export async function saveProduct(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id');
  const here = id ? `/admin/products/${id}` : '/admin/products/new';

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
    is_featured: flag(fd, 'is_featured'),
    sort_order: Math.floor(num(fd, 'sort_order') ?? 0),
  };

  const run = () =>
    id ? supabase.from('products').update(row).eq('id', id) : supabase.from('products').insert(row);

  let { error } = await run();
  if (error?.code === '23505') {
    row.slug = `${row.slug}-${Math.random().toString(36).slice(2, 6)}`;
    ({ error } = await run());
  }
  if (error) back(here, 'err', error.message);

  refreshStore();
  back('/admin/products', 'msg', 'Product saved.');
}

export async function deleteProduct(fd: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('products').delete().eq('id', str(fd, 'id'));
  if (error) back('/admin/products', 'err', error.message);
  refreshStore();
  back('/admin/products', 'msg', 'Product deleted.');
}

export async function toggleProduct(fd: FormData) {
  const { supabase } = await requireAdmin();
  const field = str(fd, 'field');
  if (field !== 'is_active' && field !== 'is_featured') back('/admin/products', 'err', 'Invalid field.');
  const { error } = await supabase
    .from('products')
    .update({ [field]: str(fd, 'value') === 'true' })
    .eq('id', str(fd, 'id'));
  if (error) back('/admin/products', 'err', error.message);
  refreshStore();
  revalidatePath('/admin/products');
}

// ----------------------------------------------------------- categories
export async function saveCategory(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id');
  const name = str(fd, 'name');
  if (!name) back('/admin/categories', 'err', 'Category name is required.');

  const row = {
    name,
    emoji: str(fd, 'emoji') || '🏠',
    sort_order: Math.floor(num(fd, 'sort_order') ?? 0),
    is_active: flag(fd, 'is_active'),
  };

  let error;
  if (id) {
    ({ error } = await supabase.from('categories').update(row).eq('id', id));
  } else {
    const slug = slugify(name) || 'category';
    ({ error } = await supabase.from('categories').insert({ ...row, slug }));
    if (error?.code === '23505') {
      ({ error } = await supabase
        .from('categories')
        .insert({ ...row, slug: `${slug}-${Math.random().toString(36).slice(2, 6)}` }));
    }
  }
  if (error) back('/admin/categories', 'err', error.message);
  refreshStore();
  back('/admin/categories', 'msg', 'Category saved.');
}

export async function deleteCategory(fd: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('categories').delete().eq('id', str(fd, 'id'));
  if (error) back('/admin/categories', 'err', error.message);
  refreshStore();
  back('/admin/categories', 'msg', 'Category deleted. Its products are now uncategorised.');
}

// --------------------------------------------------------------- orders
const STATUSES = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export async function updateOrder(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id');
  const status = str(fd, 'status');
  const payment_status = str(fd, 'payment_status');
  if (!STATUSES.includes(status) || !['paid', 'unpaid'].includes(payment_status))
    back(`/admin/orders/${id}`, 'err', 'Invalid status.');

  const { error } = await supabase
    .from('orders')
    .update({ status, payment_status, admin_notes: str(fd, 'admin_notes') })
    .eq('id', id);
  if (error) back(`/admin/orders/${id}`, 'err', error.message);
  refreshStore(); // stock can change when an order is cancelled
  back(`/admin/orders/${id}`, 'msg', 'Order updated.');
}

export async function deleteOrder(fd: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('orders').delete().eq('id', str(fd, 'id'));
  if (error) back('/admin/orders', 'err', error.message);
  back('/admin/orders', 'msg', 'Order deleted.');
}

// ------------------------------------------------------------- settings
const TEXT_FIELDS = [
  'store_name', 'slogan', 'contact_phone', 'contact_email', 'contact_address',
  'topbar_left', 'topbar_center', 'topbar_right',
  'hero_eyebrow', 'hero_title', 'hero_text', 'hero_button',
  'banner_title', 'banner_text', 'products_notice', 'footer_text',
] as const;

export async function saveSettings(fd: FormData) {
  const { supabase } = await requireAdmin();
  const row: Record<string, string | number | boolean> = {};
  for (const k of TEXT_FIELDS) row[k] = str(fd, k);

  const wa = waNumber(str(fd, 'whatsapp_number'));
  if (wa.length < 10) back('/admin/settings', 'err', 'Enter a valid WhatsApp number with country code, e.g. 923001234567.');
  row.whatsapp_number = wa;
  row.delivery_fee = Math.max(0, num(fd, 'delivery_fee') ?? 0);
  if (!row.store_name) back('/admin/settings', 'err', 'Store name is required.');

  row.require_user_approval = flag(fd, 'require_user_approval');

  const { error } = await supabase.from('site_settings').update(row).eq('id', 1);
  if (error) back('/admin/settings', 'err', error.message);
  refreshStore();
  back('/admin/settings', 'msg', 'Settings saved. The store is updated.');
}

// ------------------------------------------------- sellers & users (approval)
const APPROVAL = ['pending', 'approved', 'rejected'];

export async function setSellerStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id');
  const status = str(fd, 'status');
  const note = str(fd, 'note').slice(0, 300);
  const here = `/admin/sellers?tab=${encodeURIComponent(str(fd, 'tab') || 'pending')}`;
  if (!id || !APPROVAL.includes(status)) back(here, 'err', 'Invalid request.');

  const { error } = await supabase
    .from('seller_profiles')
    .update({ status, admin_note: status === 'approved' ? '' : note, reviewed_at: new Date().toISOString() })
    .eq('user_id', id);
  if (error) back(here, 'err', error.message);

  // An accepted seller must also be an accepted user.
  if (status === 'approved') await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);

  refreshStore(); // seller products appear / disappear from the store
  revalidatePath('/admin/sellers');
  back(here, 'msg', status === 'approved' ? 'Seller accepted. Their products are now live.' : status === 'rejected' ? 'Seller rejected. Their products are hidden from the store.' : 'Seller moved back to pending.');
}

export async function setUserStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id');
  const status = str(fd, 'status');
  const here = `/admin/users?tab=${encodeURIComponent(str(fd, 'tab') || 'all')}`;
  if (!id || !APPROVAL.includes(status)) back(here, 'err', 'Invalid request.');

  const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
  if (error) back(here, 'err', error.message);

  refreshStore();
  revalidatePath('/admin/users');
  back(here, 'msg', status === 'approved' ? 'User accepted.' : status === 'rejected' ? 'User rejected (blocked from ordering).' : 'User moved to pending.');
}
