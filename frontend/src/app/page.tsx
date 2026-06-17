import Link from 'next/link';

const tools = [
  {
    href: '/matrix-gains',
    title: 'Matrix Gains',
    description: 'Payoff matrix analysis — optimistic (maxi-max) and pessimistic (maxi-min) decision criteria.',
  },
  {
    href: '/eoq',
    title: 'Economic Order Quantity',
    description: 'Calculate the optimal order quantity to minimise total ordering and holding costs.',
  },
  {
    href: '/breakeven',
    title: 'Break-even Analysis',
    description: 'Find the quantity and revenue at which total costs equal total revenue.',
  },
  {
    href: '/queue',
    title: 'Attention Queue (M/M/s)',
    description: 'Queueing theory metrics: utilisation, average wait time, and queue length.',
  },
  {
    href: '/decision-tree',
    title: 'Decision Tree',
    description: 'Build decision trees and compute Expected Monetary Value via backwards induction.',
  },
];

export default function HomePage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-neutral-900)', marginBottom: 'var(--space-2)' }}>
          Marketing Quantitative Tools
        </h1>
        <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-neutral-600)' }}>
          Analytical decision-support tools for marketing managers and analysts.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
        {tools.map(({ href, title, description }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ height: '100%', cursor: 'pointer', transition: 'box-shadow var(--transition-base)' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
            >
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--color-primary-700)', marginBottom: 'var(--space-2)' }}>
                {title}
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)', lineHeight: 'var(--leading-normal)' }}>
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
