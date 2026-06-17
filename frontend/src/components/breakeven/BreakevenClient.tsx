'use client';

import { useState } from 'react';
import {
  calculateBreakeven,
  validateBreakeven,
  type BreakevenInputs,
  type BreakevenResult,
} from '@/lib/breakeven';

type Field = 'fixedCosts' | 'variableCostPerUnit' | 'pricePerUnit';
type FormState = Record<Field, string>;
type FieldErrors = Partial<Record<Field, string>>;

const EMPTY: FormState = { fixedCosts: '', variableCostPerUnit: '', pricePerUnit: '' };

export default function BreakevenClient() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [result, setResult] = useState<BreakevenResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [crossError, setCrossError] = useState<string | null>(null);

  const update = (field: Field, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setFieldErrors(e => ({ ...e, [field]: undefined }));
    setCrossError(null);
    setResult(null);
  };

  const calculate = () => {
    const errs: FieldErrors = {};

    const cf  = parseField(form.fixedCosts);
    const cvu = parseField(form.variableCostPerUnit);
    const p   = parseField(form.pricePerUnit);

    if (cf  === null) errs.fixedCosts          = 'Required — enter a number ≥ 0.';
    if (cvu === null) errs.variableCostPerUnit  = 'Required — enter a number ≥ 0.';
    if (p   === null) errs.pricePerUnit         = 'Required — enter a number > 0.';

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setCrossError(null);
      setResult(null);
      return;
    }

    const inputs: BreakevenInputs = {
      fixedCosts: cf!,
      variableCostPerUnit: cvu!,
      pricePerUnit: p!,
    };

    const validationError = validateBreakeven(inputs);
    if (validationError === 'negative_fixed_costs') {
      setFieldErrors({ fixedCosts: 'Fixed costs must be zero or greater.' });
      setCrossError(null);
      setResult(null);
      return;
    }
    if (validationError === 'price_not_greater_than_variable_cost') {
      setCrossError('Price per unit must be strictly greater than variable cost per unit.');
      setFieldErrors({});
      setResult(null);
      return;
    }

    setCrossError(null);
    setFieldErrors({});
    setResult(calculateBreakeven(inputs));
  };

  const clear = () => {
    setForm(EMPTY);
    setResult(null);
    setFieldErrors({});
    setCrossError(null);
  };

  const inputs = toInputs(form);

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Break-even Analysis
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-sm)' }}>
          Find the quantity and revenue at which total costs equal total revenue.
          Formula: Q<sub>BE</sub> = CF ÷ (P − CVu)
        </p>
      </div>

      {/* Input form */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Inputs
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          <InputField
            label="Fixed Costs (CF)"
            unit="$"
            hint="Total fixed costs regardless of volume"
            value={form.fixedCosts}
            error={fieldErrors.fixedCosts}
            onChange={v => update('fixedCosts', v)}
            min={0}
          />
          <InputField
            label="Variable Cost per Unit (CVu)"
            unit="$ / unit"
            hint="Cost that varies directly with each unit"
            value={form.variableCostPerUnit}
            error={fieldErrors.variableCostPerUnit}
            onChange={v => update('variableCostPerUnit', v)}
            min={0}
          />
          <InputField
            label="Selling Price per Unit (P)"
            unit="$ / unit"
            hint="Must be greater than CVu"
            value={form.pricePerUnit}
            error={fieldErrors.pricePerUnit}
            onChange={v => update('pricePerUnit', v)}
            min={0}
          />
        </div>

        {crossError && (
          <div
            role="alert"
            style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-error)',
            }}
          >
            {crossError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button onClick={calculate} className="btn btn-primary">Calculate</button>
          <button onClick={clear} className="btn btn-secondary">Clear</button>
        </div>
      </div>

      {/* Results */}
      {result && inputs && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <MetricCard
              label="Break-even Quantity"
              value={result.breakEvenQty.toFixed(2)}
              unit="units"
              accent="primary"
            />
            <MetricCard
              label="Break-even Revenue"
              value={`$${result.breakEvenRevenue.toFixed(2)}`}
              unit="total"
              accent="primary"
            />
            <MetricCard
              label="Contribution Margin"
              value={`$${result.contributionMargin.toFixed(2)}`}
              unit="per unit"
              accent="success"
            />
            <MetricCard
              label="Margin Ratio"
              value={`${(result.marginRatio * 100).toFixed(1)}%`}
              unit="of price"
              accent="success"
            />
          </div>

          <div className="card">
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Cost vs Revenue Chart
            </h2>
            <BreakevenChart inputs={inputs} result={result} />
          </div>
        </>
      )}
    </div>
  );
}

/* ── helpers ── */

function parseField(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return isNaN(n) ? null : n;
}

function toInputs(form: FormState): BreakevenInputs | null {
  const cf  = parseField(form.fixedCosts);
  const cvu = parseField(form.variableCostPerUnit);
  const p   = parseField(form.pricePerUnit);
  if (cf === null || cvu === null || p === null) return null;
  return { fixedCosts: cf, variableCostPerUnit: cvu, pricePerUnit: p };
}

/* ── sub-components ── */

function InputField({
  label, unit, hint, value, error, onChange, min,
}: {
  label: string; unit: string; hint: string;
  value: string; error?: string;
  onChange: (v: string) => void; min?: number;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <input
          type="number"
          value={value}
          min={min}
          step="any"
          placeholder="0"
          onChange={e => onChange(e.target.value)}
          aria-invalid={!!error}
          style={{ flex: 1, borderColor: error ? 'var(--color-error)' : undefined }}
        />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>{unit}</span>
      </div>
      {error
        ? <p className="field-error">{error}</p>
        : <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', marginTop: 'var(--space-1)' }}>{hint}</p>
      }
    </div>
  );
}

function MetricCard({ label, value, unit, accent }: {
  label: string; value: string; unit: string; accent: 'primary' | 'success';
}) {
  const bg     = accent === 'primary' ? 'var(--color-primary-50)'   : 'var(--color-success-bg)';
  const border = accent === 'primary' ? 'var(--color-primary-200)'  : '#bbf7d0';
  const color  = accent === 'primary' ? 'var(--color-primary-700)'  : 'var(--color-success)';

  return (
    <div style={{ padding: 'var(--space-4)', background: bg, border: `1px solid ${border}`, borderRadius: 'var(--radius-lg)' }}>
      <p style={{ fontSize: 'var(--text-xs)', color, fontWeight: 'var(--font-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>
        {label}
      </p>
      <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color }}>{value}</p>
      <p style={{ fontSize: 'var(--text-xs)', color, marginTop: 'var(--space-1)' }}>{unit}</p>
    </div>
  );
}

/* ── SVG chart ── */

const PAD  = { t: 24, r: 140, b: 52, l: 80 };
const VW   = 620;
const VH   = 320;
const PW   = VW - PAD.l - PAD.r;
const PH   = VH - PAD.t - PAD.b;
const TICKS = 5;

function fmt(v: number): string {
  if (v === 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000)    return `${(v / 1_000).toFixed(0)}k`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
  return v % 1 === 0  ? v.toString() : v.toFixed(1);
}

function BreakevenChart({
  inputs, result,
}: {
  inputs: BreakevenInputs;
  result: BreakevenResult;
}) {
  const { fixedCosts, variableCostPerUnit, pricePerUnit } = inputs;
  const { breakEvenQty, breakEvenRevenue } = result;

  const maxX = breakEvenQty > 0
    ? Math.ceil(breakEvenQty * 2.2)
    : Math.max(100, pricePerUnit * 10);

  const revenueAtMax  = pricePerUnit * maxX;
  const costAtMax     = fixedCosts + variableCostPerUnit * maxX;
  const maxY          = Math.max(revenueAtMax, costAtMax, fixedCosts) * 1.1 || 100;

  const sx = (x: number) => PAD.l + (x / maxX) * PW;
  const sy = (y: number) => PAD.t + PH - (y / maxY) * PH;

  const xTicks = Array.from({ length: TICKS + 1 }, (_, i) => (maxX / TICKS) * i);
  const yTicks = Array.from({ length: TICKS + 1 }, (_, i) => (maxY / TICKS) * i);

  const bex = sx(breakEvenQty);
  const bey = sy(breakEvenRevenue);
  const showBE = breakEvenQty > 0;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      aria-label="Break-even chart showing revenue and total cost curves"
      style={{ display: 'block' }}
    >
      {/* Horizontal grid lines */}
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.l} y1={sy(t)} x2={PAD.l + PW} y2={sy(t)}
          stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth="1" />
      ))}

      {/* Fixed cost reference */}
      {fixedCosts > 0 && (
        <line x1={PAD.l} y1={sy(fixedCosts)} x2={PAD.l + PW} y2={sy(fixedCosts)}
          stroke="#d97706" strokeDasharray="6 3" strokeWidth="1.5" />
      )}

      {/* Break-even guide lines */}
      {showBE && (
        <>
          <line x1={bex} y1={bey} x2={bex} y2={PAD.t + PH}
            stroke="#9ca3af" strokeDasharray="4 3" strokeWidth="1" />
          <line x1={PAD.l} y1={bey} x2={bex} y2={bey}
            stroke="#9ca3af" strokeDasharray="4 3" strokeWidth="1" />
        </>
      )}

      {/* Total cost line */}
      <line
        x1={sx(0)} y1={sy(fixedCosts)}
        x2={sx(maxX)} y2={sy(costAtMax)}
        stroke="#dc2626" strokeWidth="2.5"
      />

      {/* Revenue line */}
      <line
        x1={sx(0)} y1={sy(0)}
        x2={sx(maxX)} y2={sy(revenueAtMax)}
        stroke="#4f46e5" strokeWidth="2.5"
      />

      {/* Break-even point */}
      <circle cx={bex} cy={bey} r={showBE ? 6 : 4}
        fill="white" stroke="#4338ca" strokeWidth="2.5" />

      {/* Break-even label */}
      {showBE && (
        <text x={bex + 10} y={bey - 8} fontSize="11" fill="#4338ca" fontWeight="600">
          {`(${fmt(breakEvenQty)} units, $${fmt(breakEvenRevenue)})`}
        </text>
      )}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + PH} stroke="#9ca3af" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t + PH} x2={PAD.l + PW} y2={PAD.t + PH} stroke="#9ca3af" strokeWidth="1" />

      {/* X-axis ticks and labels */}
      {xTicks.map((t, i) => (
        <g key={i}>
          <line x1={sx(t)} y1={PAD.t + PH} x2={sx(t)} y2={PAD.t + PH + 4} stroke="#9ca3af" strokeWidth="1" />
          <text x={sx(t)} y={PAD.t + PH + 16} textAnchor="middle" fontSize="11" fill="#6b7280">{fmt(t)}</text>
        </g>
      ))}

      {/* Y-axis ticks and labels */}
      {yTicks.slice(1).map((t, i) => (
        <g key={i}>
          <line x1={PAD.l - 4} y1={sy(t)} x2={PAD.l} y2={sy(t)} stroke="#9ca3af" strokeWidth="1" />
          <text x={PAD.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#6b7280">${fmt(t)}</text>
        </g>
      ))}

      {/* Axis titles */}
      <text x={PAD.l + PW / 2} y={VH - 4} textAnchor="middle" fontSize="12" fill="#6b7280">
        Quantity (units)
      </text>
      <text
        x={14} y={PAD.t + PH / 2}
        textAnchor="middle" fontSize="12" fill="#6b7280"
        transform={`rotate(-90, 14, ${PAD.t + PH / 2})`}
      >
        Value ($)
      </text>

      {/* Legend */}
      <g transform={`translate(${PAD.l + PW + 16}, ${PAD.t + 8})`}>
        <line x1={0} y1={8} x2={22} y2={8} stroke="#4f46e5" strokeWidth="2.5" />
        <text x={28} y={12} fontSize="12" fill="#374151">Revenue</text>

        <line x1={0} y1={30} x2={22} y2={30} stroke="#dc2626" strokeWidth="2.5" />
        <text x={28} y={34} fontSize="12" fill="#374151">Total Cost</text>

        {fixedCosts > 0 && (
          <>
            <line x1={0} y1={52} x2={22} y2={52} stroke="#d97706" strokeDasharray="6 3" strokeWidth="1.5" />
            <text x={28} y={56} fontSize="12" fill="#374151">Fixed Cost</text>
          </>
        )}

        <circle cx={11} cy={fixedCosts > 0 ? 74 : 52} r={5}
          fill="white" stroke="#4338ca" strokeWidth="2" />
        <text x={28} y={(fixedCosts > 0 ? 74 : 52) + 4} fontSize="12" fill="#374151">
          Break-even
        </text>
      </g>
    </svg>
  );
}
