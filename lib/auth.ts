import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { hasSupabaseEnv } from './supabase/env';

/** Call at the top of every admin page and every admin Server Action. */
export async function requireAdmin() {
  if (!hasSupabaseEnv) redirect('/admin/login');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: row } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!row) redirect('/admin/login');

  return { supabase, user };
}

/**
 * Call at the top of every seller page / Server Action.
 * Returns the seller profile (any status). Pass `{ approved: true }` for actions that change data.
 */
export async function requireSeller(opts: { approved?: boolean } = {}) {
  if (!hasSupabaseEnv) redirect('/seller/login');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/seller/login');

  const { data: seller } = await supabase
    .from('seller_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!seller) redirect('/seller/login?notseller=1');
  if (opts.approved && seller.status !== 'approved') redirect('/seller');

  return { supabase, user, seller: seller as import('./types').SellerProfile };
}
