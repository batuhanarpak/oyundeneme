import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'NEON BREACH — Multiverse',
  description:
    'Üç modlu siber savaş platformu: kooperatif sızma, bilgi düellosu ve klavye savaşı.',
};

export const viewport: Viewport = {
  themeColor: '#04060c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
