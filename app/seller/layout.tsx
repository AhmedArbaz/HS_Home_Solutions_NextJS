import type { Metadata } from 'next';
import '../admin/admin.css';

export const metadata: Metadata = {
  title: 'Seller Panel | H & S Home Solutions',
  robots: { index: false, follow: false },
};

export default function SellerRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
