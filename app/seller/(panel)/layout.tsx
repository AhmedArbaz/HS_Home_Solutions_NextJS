import Link from 'next/link';
import SellerNav from '@/components/seller/SellerNav';
import Wordmark from '@/components/admin/Wordmark';
import { requireSeller } from '@/lib/auth';
import { reapplySeller, sellerSignOut } from '../actions';

export const dynamic = 'force-dynamic';

export default async function SellerPanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, seller } = await requireSeller();
  const approved = seller.status === 'approved';

  let newItems = 0;
  if (approved) {
    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('fulfil_status', 'new');
    newItems = count ?? 0;
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="sidebrand">
          <span className="logotile">
            <Wordmark size={20} />
          </span>
          <div>
            <strong>{seller.store_name}</strong>
            <small>Seller panel</small>
          </div>
        </div>
        {approved && <SellerNav newItems={newItems} />}
        <div className="sidefoot">
          <Link href="/" target="_blank">
            ↗ View store
          </Link>
          <small>{user.email}</small>
          <form action={sellerSignOut}>
            <button className="linkbtn">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="main">
        {approved ? (
          children
        ) : seller.status === 'pending' ? (
          <section className="card" style={{ maxWidth: 560 }}>
            <h1>⏳ Application under review</h1>
            <p>
              Thanks for applying, <b>{seller.store_name}</b>! The store admin is reviewing your seller account. Once it is
              accepted you can add products and receive orders here.
            </p>
            <p className="muted">Check back later — this page updates automatically when you refresh.</p>
          </section>
        ) : (
          <section className="card" style={{ maxWidth: 560 }}>
            <h1>Application not accepted</h1>
            <p>The admin did not accept this seller account.</p>
            {seller.admin_note && (
              <div className="flash flash-err">
                <b>Reason:</b> {seller.admin_note}
              </div>
            )}
            <form action={reapplySeller} style={{ marginTop: 14 }}>
              <button className="btn btn-primary">Apply again</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
