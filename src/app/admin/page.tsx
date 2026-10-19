import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { getContent, listMessages, storageMode } from '@/lib/store';
import { AdminApp } from './AdminApp';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [content, messages] = await Promise.all([getContent(), listMessages()]);
  return (
    <AdminApp
      initialContent={content}
      initialMessages={messages}
      email={session.email}
      storage={storageMode()}
      uploads={process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : process.env.VERCEL ? 'none' : 'local'}
      emailAlerts={Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL)}
    />
  );
}
