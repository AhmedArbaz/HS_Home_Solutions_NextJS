'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseEnv } from '@/lib/supabase/env';

type Role = 'none' | 'user' | 'seller' | 'admin';

export default function AuthBar() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>('none');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    const supabase = createClient();

    async function resolve(user: User | null) {
      if (!user) {
        setRole('none');
        setLabel('');
        return setReady(true);
      }
      const [{ data: admin }, { data: seller }, { data: profile }] = await Promise.all([
        supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('seller_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      ]);
      setLabel((profile?.full_name || user.email || 'Account').split(' ')[0]);
      setRole(admin ? 'admin' : seller ? 'seller' : 'user');
      setReady(true);
    }

    supabase.auth.getUser().then(({ data }) => resolve(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // defer: never call supabase inside the auth callback directly
      setTimeout(() => resolve(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!hasSupabaseEnv || !ready) return <div className="authbar" aria-hidden />;

  async function logout() {
    await createClient().auth.signOut();
  }

  return (
    <div className="authbar">
      {role === 'none' && (
        <>
          <div className="register-tooltip-wrapper">
            <Link className="btn secondary register-btn" href="/account/register">
              <span>📝 Register</span>
              <span className="discount-tag">Offer</span>
            </Link>
            <div className="register-discount-tooltip" role="tooltip">
              <span className="tooltip-arrow"></span>
              <span className="tooltip-icon">🎁</span>
              <span>Register now to get discount</span>
            </div>
          </div>
          <Link className="btn secondary" href="/account/login">
            🔑 Login
          </Link>
          <Link className="btn" href="/seller/register">
            🏪 Become a seller
          </Link>
        </>
      )}
      {role === 'user' && (
        <>
          <Link className="btn secondary" href="/account">
            👤 {label}
          </Link>
          <Link className="btn" href="/seller/register">
            🏪 Become a seller
          </Link>
          <button className="authlink" onClick={logout}>
            Logout
          </button>
        </>
      )}
      {role === 'seller' && (
        <>
          <Link className="btn secondary" href="/account">
            👤 {label}
          </Link>
          <Link className="btn" href="/seller">
            🏪 Seller dashboard
          </Link>
          <button className="authlink" onClick={logout}>
            Logout
          </button>
        </>
      )}
      {role === 'admin' && (
        <>
          <Link className="btn" href="/admin">
            ⚙️ Admin panel
          </Link>
          <button className="authlink" onClick={logout}>
            Logout
          </button>
        </>
      )}
    </div>
  );
}
