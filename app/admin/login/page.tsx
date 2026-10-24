import { redirect } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm';
import Wordmark from '@/components/admin/Wordmark';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../actions';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  let state: 'setup' | 'form' | 'not_admin' = 'form';
  let email = '';

  if (!hasSupabaseEnv) {
    state = 'setup';
  } else {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: row } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
      if (row) redirect('/admin');
      state = 'not_admin';
      email = user.email ?? '';
    }
  }

  return (
    <div className="loginwrap">
      <div className="logincard">
        <div className="loginbrand">
          <Wordmark size={44} />
          <h1>Admin Panel</h1>
          <p>H &amp; S Home Solutions</p>
        </div>

        {state === 'setup' && (
          <div className="flash flash-err">
            <b>Supabase is not configured yet.</b>
            <br />
            Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase URL and anon key, run{' '}
            <code>supabase/schema.sql</code> in the SQL editor, then restart the server.
          </div>
        )}

        {state === 'not_admin' && (
          <>
            <div className="flash flash-err">
              <b>{email}</b> is signed in but is not an admin. Run <code>supabase/make_admin.sql</code> with this email,
              or sign in with another account.
            </div>
            <form action={signOut}>
              <button className="btn btn-ghost btn-block">Sign out</button>
            </form>
          </>
        )}

        {state === 'form' && <LoginForm />}
      </div>
    </div>
  );
}
