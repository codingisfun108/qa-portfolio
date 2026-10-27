import { ResetForm } from './ResetForm';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return (
    <main className="adm-login">
      <div className="adm-login-card">
        <p className="adm-eyebrow">Portfolio admin</p>
        <h1>Reset password</h1>
        <ResetForm />
        <p className="adm-muted adm-small">
          <a href="/admin/login">Back to sign in</a>
        </p>
      </div>
    </main>
  );
}
