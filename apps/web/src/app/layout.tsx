import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'High-performance multilingual blog',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="antialiased min-h-screen bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
