import Link from 'next/link';
import { redirect } from 'next/navigation';
import AccountLoginForm from '@/components/account/AccountLoginForm';
import Wordmark from '@/components/admin/Wordmark';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (hasSupabaseEnv) {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (user) redirect('/account');
  }
  return (
    <div className="loginwrap">
      <div className="logincard">
        <div className="loginbrand">
          <Wordmark size={44} />
          <h1>Login</h1>
          <p>H &amp; S Home Solutions</p>
        </div>
        {hasSupabaseEnv ? <AccountLoginForm /> : <div className="flash flash-err">Supabase is not configured yet.</div>}
        <p className="muted center small">
          New here? <Link href="/account/register">Register</Link> • Selling? <Link href="/seller/register">Become a seller</Link> •{' '}
          <Link href="/">Back to store</Link>
        </p>
      </div>
    </div>
  );
}
