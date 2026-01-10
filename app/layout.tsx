import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wine App',
  description: 'A minimalist collection of enjoyed wine bottles.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
