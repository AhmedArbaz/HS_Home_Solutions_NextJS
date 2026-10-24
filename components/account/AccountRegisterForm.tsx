'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AccountRegisterForm() {
  const router = useRouter();
  const [f, setF] = useState({ full_name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (f.password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut(); // leave any previous session first

    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: { data: { full_name: f.full_name.trim() } },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.user && data.user.identities?.length === 0) {
      return setError('This email is already registered. Please login instead.');
    }
    if (data.session) {
      router.replace('/');
      router.refresh();
      return;
    }
    setDone(true); // email confirmation is switched on in Supabase
  }

  if (done) {
    return (
      <div className="flash flash-ok">
        <b>Account created.</b> Please confirm your email address (check your inbox), then{' '}
        <Link href="/account/login">login</Link>.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <label className="field">
        <span>Your name *</span>
        <input required value={f.full_name} onChange={set('full_name')} maxLength={100} autoComplete="name" />
      </label>
      <label className="field">
        <span>Email *</span>
        <input type="email" required autoComplete="email" value={f.email} onChange={set('email')} />
      </label>
      <label className="field">
        <span>Password * (min 8 characters)</span>
        <input type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set('password')} />
      </label>
      {error && <div className="flash flash-err">{error}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Creating account…' : 'Register'}
      </button>
    </form>
  );
}
