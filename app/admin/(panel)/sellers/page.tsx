import Link from 'next/link';
import Flash from '@/components/admin/Flash';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import type { Profile, SellerProfile } from '@/lib/types';
import { setSellerStatus } from '../../actions';

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const BADGE = { pending: 'st-new', approved: 'st-delivered', rejected: 'st-cancelled' } as const;

export default async function SellersPage({ searchParams }: { searchParams: SP }) {
  const { supabase } = await requireAdmin();
  const tab = ['pending', 'approved', 'rejected', 'all'].includes(one(searchParams.tab)) ? one(searchParams.tab) : 'pending';

  const { data } = await supabase.from('seller_profiles').select('*').order('created_at', { ascending: false }).limit(500);
  const all = (data ?? []) as SellerProfile[];
  const count = (s: string) => all.filter((x) => x.status === s).length;
  const sellers = tab === 'all' ? all : all.filter((x) => x.status === tab);

  const ids = all.map((s) => s.user_id);
  const [profRes, prodRes] = await Promise.all([
    ids.length ? supabase.from('profiles').select('id,email').in('id', ids) : Promise.resolve({ data: [] as Pick<Profile, 'id' | 'email'>[] }),
    ids.length ? supabase.from('products').select('seller_id').in('seller_id', ids) : Promise.resolve({ data: [] as { seller_id: string }[] }),
  ]);
  const emailOf = new Map((profRes.data ?? []).map((p) => [p.id, p.email]));
  const prodCount = new Map<string, number>();
  for (const p of prodRes.data ?? []) prodCount.set(p.seller_id, (prodCount.get(p.seller_id) ?? 0) + 1);

  return (
    <>
      <div className="pagehead">
        <h1>Sellers</h1>
      </div>
      <Flash searchParams={searchParams} />

      <div className="tabs">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((t) => (
          <Link key={t} href={`/admin/sellers?tab=${t}`} className={tab === t ? 'active' : ''}>
            {t[0].toUpperCase() + t.slice(1)} ({t === 'all' ? all.length : count(t)})
          </Link>
        ))}
      </div>

      {sellers.length === 0 && <div className="card muted center">No sellers in this list.</div>}

      {sellers.map((s) => (
        <section key={s.user_id} className="card">
          <div className="pagehead">
            <div>
              <h2 style={{ marginBottom: 4 }}>
                {s.store_name} <span className={`badge ${BADGE[s.status]}`}>{s.status}</span>
              </h2>
              <small className="muted">
                Applied {formatDate(s.created_at)} • {prodCount.get(s.user_id) ?? 0} products
              </small>
            </div>
          </div>

          <div className="grid2" style={{ margin: '12px 0' }}>
            <div>
              <div><b>Owner:</b> {s.owner_name || '—'}</div>
              <div><b>Email:</b> {emailOf.get(s.user_id) ?? '—'}</div>
              <div><b>Phone:</b> {s.phone || '—'}</div>
            </div>
            <div>
              <div><b>City:</b> {s.city || '—'}</div>
              <div><b>Address:</b> {s.address || '—'}</div>
              <div><b>About:</b> {s.description || '—'}</div>
            </div>
          </div>
          {s.status === 'rejected' && s.admin_note && (
            <p className="muted">
              <b>Rejection note:</b> {s.admin_note}
            </p>
          )}

          <div className="rowactions" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            {s.status !== 'approved' && (
              <form action={setSellerStatus}>
                <input type="hidden" name="id" value={s.user_id} />
                <input type="hidden" name="status" value="approved" />
                <input type="hidden" name="tab" value={tab} />
                <button className="btn btn-primary btn-sm">✓ Accept</button>
              </form>
            )}
            {s.status !== 'rejected' && (
              <form action={setSellerStatus} className="inline" style={{ display: 'flex', gap: 6 }}>
                <input type="hidden" name="id" value={s.user_id} />
                <input type="hidden" name="status" value="rejected" />
                <input type="hidden" name="tab" value={tab} />
                <input name="note" placeholder="Reason (shown to seller)" maxLength={300} style={{ minWidth: 220 }} />
                <ConfirmButton
                  className="btn btn-danger btn-sm"
                  message={`Reject "${s.store_name}"? Their products will be hidden from the store.`}
                >
                  ✕ Reject
                </ConfirmButton>
              </form>
            )}
          </div>
        </section>
      ))}
    </>
  );
}
