import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Shell } from '@/components/Shell';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Streaks — show up every day',
  description: 'A calm, minimalist habit tracker. Hold to log. Keep the streak alive.',
  appleWebApp: { capable: true, title: 'Streaks', statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-dvh bg-black">
        <Providers><Shell>{children}</Shell></Providers>
      </body>
    </html>
  );
}
