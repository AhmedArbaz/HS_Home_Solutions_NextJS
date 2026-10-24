import Flash from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/auth';
import { FALLBACK_SETTINGS } from '@/lib/fallback';
import type { Settings } from '@/lib/types';
import { saveSettings } from '../../actions';

export default async function SettingsPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  const s = { ...FALLBACK_SETTINGS, ...((data as Partial<Settings> | null) ?? {}) };

  const F = ({ name, label, rows, hint, type }: { name: keyof Settings; label: string; rows?: number; hint?: string; type?: string }) => (
    <label className="field">
      <span>{label}</span>
      {rows ? (
        <textarea name={name} rows={rows} defaultValue={String(s[name] ?? '')} />
      ) : (
        <input name={name} type={type ?? 'text'} defaultValue={String(s[name] ?? '')} />
      )}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );

  return (
    <>
      <div className="pagehead">
        <h1>Store settings</h1>
      </div>
      <Flash searchParams={searchParams} />

      <form action={saveSettings} className="form">
        <section className="card">
          <h2>Brand & orders</h2>
          <div className="grid2">
            <F name="store_name" label="Store name" />
            <F name="slogan" label="Slogan" />
            <F name="whatsapp_number" label="WhatsApp number for orders" hint="Country code, no + or spaces — e.g. 923162669126. 03xx numbers are converted automatically." />
            <F name="delivery_fee" label="Flat delivery fee (Rs.)" type="number" hint="0 = delivery charges confirmed on WhatsApp (nothing added to the total)." />
          </div>
        </section>

        <section className="card">
          <h2>Accounts</h2>
          <label className="check">
            <input type="checkbox" name="require_user_approval" defaultChecked={Boolean(s.require_user_approval)} />
            <span>New guest users (customers who register) must be accepted by admin before they can order</span>
          </label>
          <small className="muted">
            Sellers always need approval (Admin → Sellers). Rejected users are blocked from
            ordering in every case.
          </small>
        </section>

        <section className="card">
          <h2>Top bar</h2>
          <div className="grid3">
            <F name="topbar_left" label="Left text" />
            <F name="topbar_center" label="Middle text" />
            <F name="topbar_right" label="Right text" />
          </div>
        </section>

        <section className="card">
          <h2>Homepage</h2>
          <div className="grid2">
            <F name="hero_eyebrow" label="Hero small heading" />
            <F name="hero_button" label="Hero button text" />
          </div>
          <F name="hero_title" label="Hero title" />
          <F name="hero_text" label="Hero text" rows={3} />
          <div className="grid2">
            <F name="banner_title" label="Help banner title" />
            <F name="banner_text" label="Help banner text" />
          </div>
          <F name="products_notice" label="Notice above products (leave empty to hide)" rows={2} />
        </section>

        <section className="card">
          <h2>Footer & contact</h2>
          <F name="footer_text" label="Footer description" rows={2} />
          <div className="grid3">
            <F name="contact_phone" label="Phone (shown in footer)" />
            <F name="contact_email" label="Email (shown in footer)" />
            <F name="contact_address" label="Address (shown in footer)" />
          </div>
        </section>

        <div className="actions">
          <button className="btn btn-primary">Save settings</button>
        </div>
      </form>
    </>
  );
}
