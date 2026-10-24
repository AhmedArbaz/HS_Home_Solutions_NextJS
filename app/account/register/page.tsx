import Link from 'next/link';
import { redirect } from 'next/navigation';
import AccountRegisterForm from '@/components/account/AccountRegisterForm';
import Wordmark from '@/components/admin/Wordmark';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
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
          <h1>Create your account</h1>
          <p>Register to shop and track your orders.</p>
        </div>
        {hasSupabaseEnv ? <AccountRegisterForm /> : <div className="flash flash-err">Supabase is not configured yet.</div>}
        <p className="muted center small">
          Already registered? <Link href="/account/login">Login</Link> • Selling? <Link href="/seller/register">Become a seller</Link> •{' '}
          <Link href="/">Back to store</Link>
        </p>
      </div>
    </div>
  );
}
