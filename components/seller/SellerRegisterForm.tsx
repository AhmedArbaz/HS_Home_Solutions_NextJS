'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SellerRegisterForm({ loggedInEmail }: { loggedInEmail?: string }) {
  const router = useRouter();
  const [f, setF] = useState({
    full_name: '',
    store_name: '',
    phone: '',
    city: '',
    address: '',
    description: '',
    email: '',
    password: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!loggedInEmail && f.password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    const supabase = createClient();

    if (loggedInEmail) {
      // Already registered customer: upgrade the same account, no new email needed.
      const { error } = await supabase.rpc('seller_apply', {
        p_store: f.store_name.trim(),
        p_owner: f.full_name.trim(),
        p_phone: f.phone.trim(),
        p_city: f.city.trim(),
        p_address: f.address.trim(),
        p_desc: f.description.trim(),
      });
      setBusy(false);
      if (error) return setError(error.message);
      router.replace('/seller');
      router.refresh();
      return;
    }

    await supabase.auth.signOut(); // leave any previous session first

    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        data: {
          apply_seller: true,
          full_name: f.full_name.trim(),
          store_name: f.store_name.trim(),
          phone: f.phone.trim(),
          city: f.city.trim(),
          address: f.address.trim(),
          description: f.description.trim(),
        },
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.user && data.user.identities?.length === 0) {
      return setError('This email is already registered. Please sign in instead.');
    }
    if (data.session) {
      router.replace('/seller');
      router.refresh();
      return;
    }
    setDone(true); // email confirmation is switched on in Supabase
  }

  if (done) {
    return (
      <div className="flash flash-ok">
        <b>Account created.</b> Please confirm your email address (check your inbox), then{' '}
        <Link href="/seller/login">sign in</Link>. Your application will be reviewed by the admin.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <div className="grid2">
        <label className="field">
          <span>Your name *</span>
          <input required value={f.full_name} onChange={set('full_name')} maxLength={100} />
        </label>
        <label className="field">
          <span>Store name *</span>
          <input required value={f.store_name} onChange={set('store_name')} maxLength={100} />
        </label>
        <label className="field">
          <span>Phone / WhatsApp *</span>
          <input required value={f.phone} onChange={set('phone')} maxLength={30} placeholder="03xx-xxxxxxx" />
        </label>
        <label className="field">
          <span>City *</span>
          <input required value={f.city} onChange={set('city')} maxLength={100} />
        </label>
      </div>
      <label className="field">
        <span>Address</span>
        <input value={f.address} onChange={set('address')} maxLength={300} />
      </label>
      <label className="field">
        <span>What will you sell?</span>
        <textarea rows={3} value={f.description} onChange={set('description')} maxLength={1000} />
      </label>
      {loggedInEmail ? (
        <p className="muted">
          You are signed in as <b>{loggedInEmail}</b>. This account will become a seller account once the admin accepts it.
        </p>
      ) : (
        <div className="grid2">
          <label className="field">
            <span>Email *</span>
            <input type="email" required autoComplete="email" value={f.email} onChange={set('email')} />
          </label>
          <label className="field">
            <span>Password * (min 8)</span>
            <input type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set('password')} />
          </label>
        </div>
      )}
      {error && <div className="flash flash-err">{error}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Please wait…' : loggedInEmail ? 'Send seller application' : 'Register as a seller'}
      </button>
    </form>
  );
}
