import Link from 'next/link';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm';
import Wordmark from '@/components/admin/Wordmark';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { sellerSignOut } from '../actions';

export const dynamic = 'force-dynamic';

export default async function SellerLoginPage({ searchParams }: { searchParams: { notseller?: string } }) {
  let state: 'setup' | 'form' | 'not_seller' = 'form';
  let who = '';

  if (!hasSupabaseEnv) {
    state = 'setup';
  } else {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: row } = await supabase.from('seller_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
      if (row) redirect('/seller');
      state = 'not_seller';
      who = user.email ?? 'This account';
    }
  }

  return (
    <div className="loginwrap">
      <div className="logincard">
        <div className="loginbrand">
          <Wordmark size={44} />
          <h1>Seller Panel</h1>
          <p>H &amp; S Home Solutions</p>
        </div>

        {state === 'setup' && <div className="flash flash-err">Supabase is not configured yet.</div>}

        {state === 'not_seller' && (
          <>
            <div className="flash flash-err">
              <b>{who}</b> is not a seller account yet. You can apply with this account, or sign out to use another one.
            </div>
            <form action={sellerSignOut}>
              <button className="btn btn-ghost btn-block">Sign out</button>
            </form>
            <Link className="btn btn-primary btn-block" href="/seller/register">
              Become a seller
            </Link>
          </>
        )}

        {state === 'form' && (
          <>
            {searchParams.notseller && <div className="flash flash-err">That account is not a seller account.</div>}
            <LoginForm redirectTo="/seller" />
            <p className="muted center small">
              New here? <Link href="/seller/register">Become a seller</Link> • <Link href="/">Back to store</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
