import ChangePasswordForm from '@/components/admin/ChangePasswordForm';
import { requireAdmin } from '@/lib/auth';

export default async function AccountPage() {
  const { user } = await requireAdmin();
  return (
    <>
      <div className="pagehead">
        <h1>My account</h1>
      </div>
      <p className="muted">
        Signed in as <b>{user.email}</b>. Choose a new password (minimum 10 characters).
      </p>
      <ChangePasswordForm />
    </>
  );
}
