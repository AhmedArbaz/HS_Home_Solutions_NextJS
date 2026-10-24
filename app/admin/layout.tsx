import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'Admin | H & S Home Solutions',
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
