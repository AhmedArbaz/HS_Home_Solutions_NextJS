import type { Metadata } from 'next';
import '../admin/admin.css';

export const metadata: Metadata = {
  title: 'My account | H & S Home Solutions',
  robots: { index: false, follow: false },
};

export default function AccountRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
