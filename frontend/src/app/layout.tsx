import type { Metadata } from 'next';
import Navigation from '@/components/Navigation';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketing Quantitative',
  description: 'Quantitative marketing analysis tools',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main className="page-container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
