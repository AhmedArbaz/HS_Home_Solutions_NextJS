import Flash from '@/components/admin/Flash';
import ChangePasswordForm from '@/components/admin/ChangePasswordForm';
import { requireSeller } from '@/lib/auth';
import { saveSellerProfile } from '../../actions';

export default async function SellerProfilePage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const { seller, user } = await requireSeller();
  return (
    <>
      <div className="pagehead">
        <h1>Store &amp; password</h1>
      </div>
      <Flash searchParams={searchParams} />

      <form action={saveSellerProfile} className="card form">
        <h2>Store details</h2>
        <div className="grid2">
          <label className="field">
            <span>Store name *</span>
            <input name="store_name" required defaultValue={seller.store_name} maxLength={100} />
          </label>
          <label className="field">
            <span>Owner name</span>
            <input name="owner_name" defaultValue={seller.owner_name} maxLength={100} />
          </label>
          <label className="field">
            <span>Phone / WhatsApp</span>
            <input name="phone" defaultValue={seller.phone} maxLength={30} />
          </label>
          <label className="field">
            <span>City</span>
            <input name="city" defaultValue={seller.city} maxLength={100} />
          </label>
        </div>
        <label className="field">
          <span>Address</span>
          <input name="address" defaultValue={seller.address} maxLength={300} />
        </label>
        <label className="field">
          <span>About your store</span>
          <textarea name="description" rows={3} defaultValue={seller.description} maxLength={1000} />
        </label>
        <div className="actions">
          <button className="btn btn-primary">Save store details</button>
        </div>
      </form>

      <h2 style={{ marginTop: 8 }}>Change password</h2>
      <p className="muted">Signed in as {user.email}.</p>
      <ChangePasswordForm />
    </>
  );
}
