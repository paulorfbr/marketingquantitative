type Variant = 'error' | 'warning' | 'info';

const STYLES: Record<Variant, { bg: string; border: string; color: string }> = {
  error:   { bg: 'var(--color-error-bg)',   border: 'var(--color-error)',   color: 'var(--color-error)'   },
  warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning)', color: 'var(--color-warning)' },
  info:    { bg: 'var(--color-primary-50)', border: 'var(--color-primary-200)', color: 'var(--color-primary-600)' },
};

export function AlertBanner({
  message,
  variant = 'error',
}: {
  message?: string | null;
  variant?: Variant;
}) {
  if (!message) return null;
  const s = STYLES[variant];
  return (
    <div
      role="alert"
      style={{
        padding: 'var(--space-2) var(--space-3)',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-sm)',
        color: s.color,
        fontWeight: 'var(--font-medium)',
      }}
    >
      {message}
    </div>
  );
}
