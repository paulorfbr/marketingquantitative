'use client';

import { useState } from 'react';
import { calculateEoq, type EoqResult } from '@/lib/eoq';
import { SessionHistory, type SessionRow } from '@/components/shared/SessionHistory';

type Field = 'demand' | 'orderingCost' | 'unitCost' | 'holdingRate';

const FIELD_META: Record<Field, { label: string; unit: string; hint: string }> = {
  demand:       { label: 'Annual Demand (D)',        unit: 'units / year', hint: 'Total units demanded per year' },
  orderingCost: { label: 'Ordering Cost (S)',         unit: '$ / order',    hint: 'Fixed cost per purchase order placed' },
  unitCost:     { label: 'Unit Cost (C)',             unit: '$ / unit',     hint: 'Purchase price per unit' },
  holdingRate:  { label: 'Holding Cost Rate (I)',     unit: '% / year',     hint: 'Annual holding cost as % of unit cost (e.g. 20)' },
};

const FIELDS: Field[] = ['demand', 'orderingCost', 'unitCost', 'holdingRate'];

type FormState = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const EMPTY: FormState = { demand: '', orderingCost: '', unitCost: '', holdingRate: '' };

const HISTORY_COLUMNS = [
  { key: 'eoq',           label: 'EOQ (units)' },
  { key: 'ordersPerYear', label: 'Orders/yr' },
  { key: 'totalAnnualCost', label: 'Total Cost', format: (v: unknown) => `$${(v as number).toFixed(2)}` },
];

export default function EoqClient() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [result, setResult] = useState<EoqResult | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sessionName, setSessionName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [historyKey, setHistoryKey] = useState(0);

  const update = (field: Field, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
    setResult(null);
  };

  const validate = (): Errors => {
    const errs: Errors = {};
    FIELDS.forEach(f => {
      const raw = form[f].trim();
      if (raw === '') { errs[f] = 'Required.'; return; }
      const n = Number(raw);
      if (isNaN(n) || n <= 0) errs[f] = 'Must be a positive number.';
    });
    return errs;
  };

  const calculate = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setResult(
      calculateEoq({
        demand:       Number(form.demand),
        orderingCost: Number(form.orderingCost),
        unitCost:     Number(form.unitCost),
        holdingRate:  Number(form.holdingRate) / 100,
      })
    );
  };

  const clear = () => { setForm(EMPTY); setResult(null); setErrors({}); setSaveStatus('idle'); };

  const saveSession = async () => {
    if (!result) return;
    const name = sessionName.trim() || new Date().toLocaleString();
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/eoq/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          demand:       Number(form.demand),
          orderingCost: Number(form.orderingCost),
          unitCost:     Number(form.unitCost),
          holdingRate:  Number(form.holdingRate) / 100,
        }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus('saved');
      setHistoryKey(k => k + 1);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const loadSession = (session: SessionRow) => {
    setForm({
      demand:       String(session.demand ?? ''),
      orderingCost: String(session.orderingCost ?? ''),
      unitCost:     String(session.unitCost ?? ''),
      holdingRate:  String(((session.holdingRate as number) * 100).toFixed(4)),
    });
    setResult(null);
    setErrors({});
    setSaveStatus('idle');
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Economic Order Quantity
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-sm)' }}>
          Find the order quantity that minimises total annual ordering and holding costs.
          Formula: EOQ = √(2DS / IC)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

        {/* Input card */}
        <div className="card">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Inputs
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {FIELDS.map(field => {
              const { label, unit, hint } = FIELD_META[field];
              const err = errors[field];
              return (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
                    {label}
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={form[field]}
                      onChange={e => update(field, e.target.value)}
                      min="0"
                      step="any"
                      placeholder="0"
                      aria-label={label}
                      aria-invalid={!!err}
                      style={{
                        flex: 1,
                        borderColor: err ? 'var(--color-error)' : undefined,
                      }}
                    />
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-400)', whiteSpace: 'nowrap', minWidth: '80px' }}>
                      {unit}
                    </span>
                  </div>
                  {err
                    ? <p className="field-error">{err}</p>
                    : <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', marginTop: 'var(--space-1)' }}>{hint}</p>
                  }
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <button onClick={calculate} className="btn btn-primary">Calculate</button>
            <button onClick={clear} className="btn btn-secondary">Clear</button>
          </div>
        </div>

        {/* Results card */}
        <div className="card" style={{ opacity: result ? 1 : 0.4, transition: 'opacity var(--transition-base)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Results
          </h2>

          {result ? (
            <table className="result-table">
              <tbody>
                <ResultRow label="Economic Order Quantity (EOQ)" value={result.eoq.toFixed(2)} unit="units" highlight />
                <ResultRow label="Orders per Year"   value={result.ordersPerYear.toFixed(2)} unit="orders / year" />
                <ResultRow label="Cycle Time"        value={result.cycleDays.toFixed(2)}     unit="days" />
                <ResultRow label="Total Annual Cost" value={`$${result.totalAnnualCost.toFixed(2)}`} unit="/ year" />
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-400)' }}>
              Fill in all inputs and click Calculate.
            </p>
          )}
        </div>
      </div>

      {result && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
            Cost Breakdown
          </h2>
          <CostBreakdown result={result} holdingRate={Number(form.holdingRate) / 100} unitCost={Number(form.unitCost)} />
        </div>
      )}

      {/* Save session */}
      {result && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
            Save Session
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <input
              type="text"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="Session name (optional)"
              style={{ flex: 1 }}
            />
            <button
              onClick={saveSession}
              className="btn btn-primary"
              disabled={saveStatus === 'saving'}
              style={{ whiteSpace: 'nowrap' }}
            >
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
          </div>
          {saveStatus === 'error' && (
            <p className="field-error" style={{ marginTop: 'var(--space-2)' }}>
              Could not reach the backend. Is the server running?
            </p>
          )}
        </div>
      )}

      <SessionHistory
        apiPath="/api/eoq/sessions"
        refreshKey={historyKey}
        columns={HISTORY_COLUMNS}
        onLoad={loadSession}
      />
    </div>
  );
}

function ResultRow({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <tr style={highlight ? { background: 'var(--color-primary-50)' } : undefined}>
      <td style={{ textAlign: 'left', fontWeight: highlight ? 'var(--font-semibold)' : undefined, color: highlight ? 'var(--color-primary-700)' : undefined }}>
        {label}
      </td>
      <td style={{ fontWeight: highlight ? 'var(--font-bold)' : undefined, color: highlight ? 'var(--color-primary-700)' : undefined }}>
        {value}
      </td>
      <td style={{ color: 'var(--color-neutral-400)', fontSize: 'var(--text-xs)' }}>{unit}</td>
    </tr>
  );
}

function CostBreakdown({ result, holdingRate, unitCost }: { result: EoqResult; holdingRate: number; unitCost: number }) {
  const halfCost = result.totalAnnualCost / 2;
  const pct = (v: number) => ((v / result.totalAnnualCost) * 100).toFixed(1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
      <div style={{ padding: 'var(--space-3)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-200)' }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)' }}>
          Annual Ordering Cost
        </p>
        <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary-700)' }}>
          ${halfCost.toFixed(2)}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-500)' }}>{pct(halfCost)}% of total</p>
      </div>
      <div style={{ padding: 'var(--space-3)', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)' }}>
          Annual Holding Cost
        </p>
        <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>
          ${halfCost.toFixed(2)}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>{pct(halfCost)}% of total</p>
      </div>
    </div>
  );
}
