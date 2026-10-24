'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** One login for everybody: admins go to /admin, sellers to /seller, customers back to the store. */
export default function AccountLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setError(error?.message ?? 'Could not sign in.');
      setBusy(false);
      return;
    }
    const uid = data.user.id;
    const [{ data: admin }, { data: seller }] = await Promise.all([
      supabase.from('admins').select('user_id').eq('user_id', uid).maybeSingle(),
      supabase.from('seller_profiles').select('user_id').eq('user_id', uid).maybeSingle(),
    ]);
    router.replace(admin ? '/admin' : seller ? '/seller' : '/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <label className="field">
        <span>Email</span>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <div className="flash flash-err">{error}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Signing in…' : 'Login'}
      </button>
    </form>
  );
}
