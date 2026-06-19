'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tools = [
  { href: '/',               label: 'Home' },
  { href: '/matrix-gains',   label: 'Matrix Gains' },
  { href: '/eoq',            label: 'Economic Order Qty' },
  { href: '/breakeven',      label: 'Break-even' },
  { href: '/queue',          label: 'Attention Queue' },
  { href: '/decision-tree',  label: 'Decision Tree' },
  { href: '/sensitivity',    label: 'Sensitivity' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid var(--color-neutral-200)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', height: '3.5rem' }}>
        <span style={{
          fontWeight: 'var(--font-bold)',
          color: 'var(--color-primary-700)',
          fontSize: 'var(--text-sm)',
          marginRight: 'var(--space-4)',
          whiteSpace: 'nowrap',
        }}>
          MQ Tools
        </span>
        {tools.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: active ? 'var(--font-semibold)' : 'var(--font-normal)',
                color: active ? 'var(--color-primary-600)' : 'var(--color-neutral-600)',
                background: active ? 'var(--color-primary-50)' : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'background var(--transition-fast), color var(--transition-fast)',
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
