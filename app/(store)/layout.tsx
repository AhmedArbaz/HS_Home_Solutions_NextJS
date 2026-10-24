import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'H & S Home Solutions | Better Home, Happier Life',
  description: 'Shop useful home and kitchen essentials from H & S Home Solutions Pakistan.',
  openGraph: {
    title: 'H & S Home Solutions',
    description: 'Useful home and kitchen essentials — order easily on WhatsApp.',
    type: 'website',
    locale: 'en_PK',
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#075b43' };

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
