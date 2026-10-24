import Link from 'next/link';
import SellerRegisterForm from '@/components/seller/SellerRegisterForm';
import Wordmark from '@/components/admin/Wordmark';
import { redirect } from 'next/navigation';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SellerRegisterPage() {
  let email: string | undefined;
  if (hasSupabaseEnv) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: seller } = await supabase.from('seller_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
      if (seller) redirect('/seller');
      email = user.email ?? undefined;
    }
  }
  return (
    <div className="loginwrap">
      <div className="logincard" style={{ width: 'min(620px,100%)' }}>
        <div className="loginbrand">
          <Wordmark size={44} />
          <h1>Become a seller</h1>
          <p>Sell your products on H &amp; S Home Solutions. The admin reviews every application.</p>
        </div>
        {hasSupabaseEnv ? (
          <SellerRegisterForm loggedInEmail={email} />
        ) : (
          <div className="flash flash-err">Supabase is not configured yet.</div>
        )}
        <p className="muted center small">
          Already a seller? <Link href="/account/login">Login</Link> • <Link href="/">Back to store</Link>
        </p>
      </div>
    </div>
  );
}
