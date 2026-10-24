import Link from 'next/link';
import Flash from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { setUserStatus } from '../../actions';

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const BADGE = { pending: 'st-new', approved: 'st-delivered', rejected: 'st-cancelled' } as const;
const TABS = ['all', 'guests', 'sellers', 'pending', 'rejected'] as const;

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  const { supabase, user: me } = await requireAdmin();
  const tab = (TABS as readonly string[]).includes(one(searchParams.tab)) ? one(searchParams.tab) : 'all';

  const [{ data }, sellerRes, adminRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('seller_profiles').select('user_id,store_name'),
    supabase.from('admins').select('user_id'),
  ]);
  const all = (data ?? []) as Profile[];
  const storeOf = new Map((sellerRes.data ?? []).map((s) => [s.user_id, s.store_name]));
  const adminIds = new Set((adminRes.data ?? []).map((a) => a.user_id));

  const filters: Record<string, (p: Profile) => boolean> = {
    all: () => true,
    guests: (p) => p.is_guest && !storeOf.has(p.id) && !adminIds.has(p.id),
    sellers: (p) => storeOf.has(p.id),
    pending: (p) => p.status === 'pending',
    rejected: (p) => p.status === 'rejected',
  };
  const users = all.filter(filters[tab]);

  return (
    <>
      <div className="pagehead">
        <h1>Users</h1>
      </div>
      <Flash searchParams={searchParams} />
      <p className="muted">
        <b>Guest users</b> are customers who registered with the store&rsquo;s <b>Register</b> button. Sellers appear here
        too. <b>Rejected</b> users cannot place orders. Turn on &ldquo;new users must be accepted&rdquo; in Settings to
        review every new guest user first.
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/users?tab=${t}`} className={tab === t ? 'active' : ''}>
            {t === 'guests' ? 'Guest users' : t[0].toUpperCase() + t.slice(1)} ({all.filter(filters[t]).length})
          </Link>
        ))}
      </div>

      <div className="card tablewrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="muted center">
                  No users in this list.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const isAdmin = adminIds.has(u.id) || u.id === me.id;
              return (
                <tr key={u.id}>
                  <td>
                    <b>{u.full_name || u.email || '—'}</b>
                    <br />
                    <small className="muted">{u.email}</small>
                  </td>
                  <td>
                    {isAdmin ? 'Admin' : storeOf.has(u.id) ? `Seller — ${storeOf.get(u.id)}` : 'Guest user'}
                  </td>
                  <td>
                    <span className={`badge ${BADGE[u.status]}`}>{u.status}</span>
                  </td>
                  <td className="nowrap">{formatDate(u.created_at)}</td>
                  <td>
                    {!isAdmin && (
                      <div className="rowactions">
                        {u.status !== 'approved' && (
                          <form action={setUserStatus}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="status" value="approved" />
                            <input type="hidden" name="tab" value={tab} />
                            <button className="btn btn-primary btn-sm">✓ Accept</button>
                          </form>
                        )}
                        {u.status !== 'rejected' && (
                          <form action={setUserStatus}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <input type="hidden" name="tab" value={tab} />
                            <button className="btn btn-danger btn-sm">✕ Reject</button>
                          </form>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
