'use client';

import { useState } from 'react';
import {
  calculateQueue,
  validateQueue,
  type QueueInputs,
  type QueueResult,
} from '@/lib/queue';
import { SessionHistory, type SessionRow } from '@/components/shared/SessionHistory';

const HISTORY_COLUMNS = [
  { key: 'utilization', label: 'Utilisation', format: (v: unknown) => `${((v as number) * 100).toFixed(1)}%` },
  { key: 'l',  label: 'L (system)' },
  { key: 'lq', label: 'Lq (queue)' },
];

type FormState = { arrivalRate: string; serviceRate: string; servers: string };
type FieldErrors = Partial<Record<keyof FormState, string>>;
const EMPTY: FormState = { arrivalRate: '', serviceRate: '', servers: '' };

export default function QueueClient() {
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [result, setResult]       = useState<QueueResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [crossError, setCrossError]   = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [saveStatus, setSaveStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [historyKey, setHistoryKey]   = useState(0);

  const update = (field: keyof FormState, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setFieldErrors(e => ({ ...e, [field]: undefined }));
    setCrossError(null);
    setResult(null);
  };

  const calculate = () => {
    const errs: FieldErrors = {};
    const lambda = parsePositive(form.arrivalRate);
    const mu     = parsePositive(form.serviceRate);
    const s      = parseInteger(form.servers);

    if (lambda === null) errs.arrivalRate = 'Required — enter a positive number.';
    if (mu     === null) errs.serviceRate = 'Required — enter a positive number.';
    if (s      === null) errs.servers     = 'Required — enter a whole number ≥ 1.';

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setCrossError(null);
      setResult(null);
      return;
    }

    const inputs: QueueInputs = { arrivalRate: lambda!, serviceRate: mu!, servers: s! };
    const err = validateQueue(inputs);

    if (err === 'unstable') {
      setCrossError(
        `Unstable queue: total service capacity (s × μ = ${(s! * mu!).toFixed(2)}) must exceed arrival rate (λ = ${lambda!.toFixed(2)}).`
      );
      setFieldErrors({});
      setResult(null);
      return;
    }

    setCrossError(null);
    setFieldErrors({});
    setResult(calculateQueue(inputs));
  };

  const clear = () => {
    setForm(EMPTY);
    setResult(null);
    setFieldErrors({});
    setCrossError(null);
    setSaveStatus('idle');
  };

  const saveSession = async () => {
    if (!result) return;
    const name = sessionName.trim() || new Date().toLocaleString();
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/queue/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          arrivalRate: Number(form.arrivalRate),
          serviceRate: Number(form.serviceRate),
          servers:     Number(form.servers),
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
      arrivalRate: String(session.arrivalRate ?? ''),
      serviceRate: String(session.serviceRate ?? ''),
      servers:     String(session.servers ?? ''),
    });
    setResult(null);
    setFieldErrors({});
    setCrossError(null);
    setSaveStatus('idle');
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Attention Queue (M/M/s)
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-sm)' }}>
          Steady-state metrics for a multi-server queue: utilisation, average wait time,
          and average queue length. Stability requires s × μ &gt; λ.
        </p>
      </div>

      {/* Inputs */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Parameters
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          <InputField
            label="Arrival Rate (λ)"
            unit="arrivals / time unit"
            hint="Average number of customers arriving per unit time"
            value={form.arrivalRate}
            error={fieldErrors.arrivalRate}
            onChange={v => update('arrivalRate', v)}
            inputMode="decimal"
          />
          <InputField
            label="Service Rate (μ)"
            unit="customers / server / time unit"
            hint="Rate at which each server completes service"
            value={form.serviceRate}
            error={fieldErrors.serviceRate}
            onChange={v => update('serviceRate', v)}
            inputMode="decimal"
          />
          <InputField
            label="Number of Servers (s)"
            unit="servers"
            hint="Number of parallel servers (integer ≥ 1)"
            value={form.servers}
            error={fieldErrors.servers}
            onChange={v => update('servers', v)}
            inputMode="numeric"
            step={1}
          />
        </div>

        {crossError && (
          <div
            role="alert"
            style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3)',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-warning)',
              fontWeight: 'var(--font-medium)',
            }}
          >
            ⚠ {crossError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button onClick={calculate} className="btn btn-primary">Calculate</button>
          <button onClick={clear} className="btn btn-secondary">Clear</button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Utilisation bar */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                Server Utilisation (ρ)
              </span>
              <span style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-bold)',
                color: utilizationColor(result.utilization),
              }}>
                {(result.utilization * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{ height: '10px', background: 'var(--color-neutral-200)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(result.utilization * 100, 100)}%`,
                background: utilizationColor(result.utilization),
                borderRadius: 'var(--radius-xl)',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', marginTop: 'var(--space-1)' }}>
              Servers are busy {(result.utilization * 100).toFixed(1)}% of the time.
              Probability system is idle: {(result.p0 * 100).toFixed(1)}%
            </p>
          </div>

          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <MetricPair
              left={{ symbol: 'Lq', name: 'Avg. Customers in Queue',   value: result.lq.toFixed(2), unit: 'customers' }}
              right={{ symbol: 'L',  name: 'Avg. Customers in System',  value: result.l.toFixed(2),  unit: 'customers' }}
            />
            <MetricPair
              left={{ symbol: 'Wq', name: 'Avg. Wait Time in Queue',   value: result.wq.toFixed(2), unit: 'time units' }}
              right={{ symbol: 'W',  name: 'Avg. Time in System',        value: result.w.toFixed(2),  unit: 'time units' }}
            />
          </div>

          {/* Summary table */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Full Results
            </h2>
            <table className="result-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Metric</th>
                  <th style={{ textAlign: 'left' }}>Symbol</th>
                  <th>Value</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Server Utilisation',          symbol: 'ρ',  value: (result.utilization * 100).toFixed(2), unit: '%' },
                  { name: 'Prob. System Empty',          symbol: 'P₀', value: (result.p0 * 100).toFixed(2),          unit: '%' },
                  { name: 'Avg. Customers in Queue',     symbol: 'Lq', value: result.lq.toFixed(2),                  unit: 'customers' },
                  { name: 'Avg. Customers in System',    symbol: 'L',  value: result.l.toFixed(2),                   unit: 'customers' },
                  { name: 'Avg. Wait Time in Queue',     symbol: 'Wq', value: result.wq.toFixed(2),                  unit: 'time units' },
                  { name: 'Avg. Time in System',         symbol: 'W',  value: result.w.toFixed(2),                   unit: 'time units' },
                ].map(row => (
                  <tr key={row.symbol}>
                    <td style={{ textAlign: 'left' }}>{row.name}</td>
                    <td style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', color: 'var(--color-primary-600)' }}>
                      {row.symbol}
                    </td>
                    <td style={{ fontWeight: 'var(--font-semibold)' }}>{row.value}</td>
                    <td style={{ color: 'var(--color-neutral-400)', fontSize: 'var(--text-xs)' }}>{row.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
              Time units match the unit used for λ and μ (e.g. if λ is customers/hour, W is in hours).
            </p>
          </div>
        </>
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
        apiPath="/api/queue/sessions"
        refreshKey={historyKey}
        columns={HISTORY_COLUMNS}
        onLoad={loadSession}
      />
    </div>
  );
}

/* ── helpers ── */

function parsePositive(raw: string): number | null {
  const n = Number(raw.trim());
  return raw.trim() !== '' && !isNaN(n) && n > 0 ? n : null;
}

function parseInteger(raw: string): number | null {
  const n = Number(raw.trim());
  return raw.trim() !== '' && Number.isInteger(n) && n >= 1 ? n : null;
}

function utilizationColor(rho: number): string {
  if (rho < 0.7)  return 'var(--color-success)';
  if (rho < 0.85) return 'var(--color-warning)';
  return 'var(--color-error)';
}

/* ── sub-components ── */

function InputField({
  label, unit, hint, value, error, onChange, inputMode, step,
}: {
  label: string; unit: string; hint: string;
  value: string; error?: string;
  onChange: (v: string) => void;
  inputMode?: 'decimal' | 'numeric';
  step?: number;
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
          min={step === 1 ? 1 : 0}
          step={step ?? 'any'}
          onChange={e => onChange(e.target.value)}
          aria-invalid={!!error}
          placeholder={step === 1 ? '1' : '0'}
          style={{ flex: 1, borderColor: error ? 'var(--color-error)' : undefined }}
        />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', whiteSpace: 'nowrap', minWidth: '60px' }}>
          {unit}
        </span>
      </div>
      {error
        ? <p className="field-error">{error}</p>
        : <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', marginTop: 'var(--space-1)' }}>{hint}</p>
      }
    </div>
  );
}

function MetricPair({
  left, right,
}: {
  left:  { symbol: string; name: string; value: string; unit: string };
  right: { symbol: string; name: string; value: string; unit: string };
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
      {[left, right].map(m => (
        <div
          key={m.symbol}
          style={{
            padding: 'var(--space-4)',
            background: 'var(--color-primary-50)',
            border: '1px solid var(--color-primary-200)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', marginBottom: 'var(--space-1)' }}>
            {m.name}
          </p>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary-700)', lineHeight: 1 }}>
            {m.value}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-500)', marginTop: 'var(--space-1)', fontFamily: 'var(--font-mono)' }}>
            {m.symbol} · {m.unit}
          </p>
        </div>
      ))}
    </div>
  );
}
