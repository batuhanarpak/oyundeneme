import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  style: 'normal',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

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
    <html lang="tr" className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
