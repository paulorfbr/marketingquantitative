'use client';

import { useState } from 'react';
import { SessionHistory, type SessionRow } from '@/components/shared/SessionHistory';

type ModelType = 'EOQ' | 'BREAKEVEN';
type DistType = 'NORMAL' | 'UNIFORM' | 'TRIANGULAR';

const EOQ_FIELDS = ['demand', 'orderingCost', 'unitCost', 'holdingRate'] as const;
const BE_FIELDS  = ['fixedCosts', 'variableCostPerUnit', 'pricePerUnit'] as const;

const FIELD_LABELS: Record<string, string> = {
  demand: 'Annual Demand (D)',
  orderingCost: 'Ordering Cost (S)',
  unitCost: 'Unit Cost (C)',
  holdingRate: 'Holding Rate (I)',
  fixedCosts: 'Fixed Costs (CF)',
  variableCostPerUnit: 'Variable Cost/Unit (CVu)',
  pricePerUnit: 'Price/Unit (P)',
};

interface DistParams { type: DistType; mean: string; stdDev: string; min: string; max: string; mode: string; }
const emptyDist = (): DistParams => ({ type: 'NORMAL', mean: '', stdDev: '', min: '', max: '', mode: '' });

interface MCResult {
  cdfValues: number[];
  mean: number; stdDev: number;
  p5: number; p25: number; p50: number; p75: number; p95: number;
}

export default function MonteCarloClient() {
  const [model, setModel]       = useState<ModelType>('EOQ');
  const [dists, setDists]       = useState<Record<string, DistParams>>({});
  const [iterations, setIter]   = useState('10000');
  const [result, setResult]     = useState<MCResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [sessionName, setName]  = useState('');
  const [saveStatus, setSave]   = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [histKey, setHistKey]   = useState(0);

  const fields = model === 'EOQ' ? EOQ_FIELDS : BE_FIELDS;

  const getDist = (f: string): DistParams => dists[f] ?? emptyDist();
  const updateDist = (f: string, patch: Partial<DistParams>) =>
    setDists(prev => ({ ...prev, [f]: { ...getDist(f), ...patch } }));

  const buildInputs = () => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const d = getDist(f);
      const num = (s: string) => s === '' ? null : Number(s);
      const base = { distribution: d.type, mean: null, stdDev: null, min: null, max: null, mode: null };
      if (d.type === 'NORMAL') {
        out[f] = { ...base, mean: num(d.mean), stdDev: num(d.stdDev) };
      } else if (d.type === 'UNIFORM') {
        out[f] = { ...base, min: num(d.min), max: num(d.max) };
      } else {
        out[f] = { ...base, min: num(d.min), max: num(d.max), mode: num(d.mode) };
      }
    }
    return out;
  };

  const simulate = async () => {
    setError(null);
    const iter = Number(iterations);
    if (!iterations || isNaN(iter) || iter < 1 || iter > 100000) {
      setError('Iterations must be between 1 and 100,000.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/montecarlo/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, inputs: buildInputs(), iterations: iter }),
      });
      if (!res.ok) { setError(`Simulation failed: ${await res.text()}`); return; }
      setResult(await res.json());
    } catch {
      setError('Could not reach the backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setDists({}); setResult(null); setError(null); setSave('idle'); };

  const saveSession = async () => {
    if (!result) return;
    const name = sessionName.trim() || new Date().toLocaleString();
    setSave('saving');
    try {
      const res = await fetch('/api/montecarlo/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model, inputs: buildInputs(), iterations: Number(iterations) }),
      });
      if (!res.ok) throw new Error();
      setSave('saved'); setHistKey(k => k + 1);
      setTimeout(() => setSave('idle'), 2000);
    } catch { setSave('error'); setTimeout(() => setSave('idle'), 3000); }
  };

  const loadSession = async (row: SessionRow) => {
    try {
      const res = await fetch(`/api/montecarlo/sessions/${row.id}`);
      if (!res.ok) return;
      const full = await res.json();
      setModel(full.model as ModelType);
      setIter(String(full.iterations));
      const newDists: Record<string, DistParams> = {};
      for (const [k, v] of Object.entries(full.inputs as Record<string, Record<string, unknown>>)) {
        newDists[k] = {
          type: v.distribution as DistType,
          mean: v.mean != null ? String(v.mean) : '',
          stdDev: v.stdDev != null ? String(v.stdDev) : '',
          min: v.min != null ? String(v.min) : '',
          max: v.max != null ? String(v.max) : '',
          mode: v.mode != null ? String(v.mode) : '',
        };
      }
      setDists(newDists);
      setResult(full.results);
      setError(null);
    } catch {
      setError('Could not load session. Is the backend running?');
    }
  };

  const HISTORY_COLUMNS = [
    { key: 'model', label: 'Model' },
    { key: 'iterations', label: 'Iterations', format: (v: unknown) => String(v) },
  ];

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Monte Carlo Simulation
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-sm)' }}>
          Assign a probability distribution to each input and run N simulations to estimate the output distribution.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

        {/* Inputs card */}
        <div className="card">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Inputs
          </h2>

          {/* Model selector */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
              Model
            </label>
            <select value={model}
              onChange={e => { setModel(e.target.value as ModelType); setDists({}); setResult(null); }}
              style={{ width: '100%' }}>
              <option value="EOQ">Economic Order Quantity (EOQ)</option>
              <option value="BREAKEVEN">Break-even Analysis</option>
            </select>
          </div>

          {/* Per-field distribution inputs */}
          {fields.map(field => {
            const d = getDist(field);
            return (
              <div key={field} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)' }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
                  {FIELD_LABELS[field]}
                </p>
                <select value={d.type}
                  onChange={e => updateDist(field, { type: e.target.value as DistType })}
                  style={{ width: '100%', marginBottom: 'var(--space-2)' }}>
                  <option value="NORMAL">Normal (mean, std dev)</option>
                  <option value="UNIFORM">Uniform (min, max)</option>
                  <option value="TRIANGULAR">Triangular (min, max, mode)</option>
                </select>
                {d.type === 'NORMAL' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                    <input type="number" placeholder="Mean" value={d.mean}
                      onChange={e => updateDist(field, { mean: e.target.value })} step="any" />
                    <input type="number" placeholder="Std Dev" value={d.stdDev}
                      onChange={e => updateDist(field, { stdDev: e.target.value })} step="any" />
                  </div>
                )}
                {d.type === 'UNIFORM' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                    <input type="number" placeholder="Min" value={d.min}
                      onChange={e => updateDist(field, { min: e.target.value })} step="any" />
                    <input type="number" placeholder="Max" value={d.max}
                      onChange={e => updateDist(field, { max: e.target.value })} step="any" />
                  </div>
                )}
                {d.type === 'TRIANGULAR' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                    <input type="number" placeholder="Min" value={d.min}
                      onChange={e => updateDist(field, { min: e.target.value })} step="any" />
                    <input type="number" placeholder="Max" value={d.max}
                      onChange={e => updateDist(field, { max: e.target.value })} step="any" />
                    <input type="number" placeholder="Mode" value={d.mode}
                      onChange={e => updateDist(field, { mode: e.target.value })} step="any" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Iterations */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
              Iterations (1 – 100,000)
            </label>
            <input type="number" value={iterations}
              onChange={e => { setIter(e.target.value); setResult(null); }}
              min="1" max="100000" step="1000" />
          </div>

          {error && <p className="field-error" style={{ marginTop: 'var(--space-2)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button onClick={simulate} className="btn btn-primary" disabled={loading}>
              {loading ? 'Simulating…' : 'Simulate'}
            </button>
            <button onClick={clear} className="btn btn-secondary">Clear</button>
          </div>
        </div>

        {/* Results card */}
        <div className="card" style={{ opacity: result ? 1 : 0.4, transition: 'opacity var(--transition-base)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Summary Statistics
          </h2>
          {result ? (
            <table className="result-table">
              <tbody>
                <tr><td style={{ textAlign: 'left' }}>Mean</td><td>{result.mean.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>Std Dev</td><td>{result.stdDev.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>P5</td><td>{result.p5.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>P25</td><td>{result.p25.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left', fontWeight: 'var(--font-semibold)' }}>P50 (Median)</td>
                  <td style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary-700)' }}>{result.p50.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>P75</td><td>{result.p75.toFixed(2)}</td></tr>
                <tr><td style={{ textAlign: 'left' }}>P95</td><td>{result.p95.toFixed(2)}</td></tr>
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-400)' }}>
              Fill in distributions and click Simulate.
            </p>
          )}
        </div>
      </div>

      {/* CDF chart */}
      {result && result.cdfValues.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Cumulative Distribution Function (CDF)
          </h2>
          <CdfChart result={result} />
        </div>
      )}

      {/* Save session */}
      {result && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
            Save Session
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <input type="text" value={sessionName} onChange={e => setName(e.target.value)}
              placeholder="Session name (optional)" style={{ flex: 1 }} />
            <button onClick={saveSession} className="btn btn-primary"
              disabled={saveStatus === 'saving'} style={{ whiteSpace: 'nowrap' }}>
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
          </div>
          {saveStatus === 'error' && (
            <p className="field-error" style={{ marginTop: 'var(--space-2)' }}>Could not reach the backend.</p>
          )}
        </div>
      )}

      <SessionHistory
        apiPath="/api/montecarlo/sessions"
        refreshKey={histKey}
        columns={HISTORY_COLUMNS}
        onLoad={loadSession}
      />
    </div>
  );
}

function CdfChart({ result }: { result: MCResult }) {
  const W = 520, H = 280, PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const cdf = result.cdfValues;
  const minX = cdf[0], maxX = cdf[cdf.length - 1];
  const spanX = maxX - minX || 1;

  const toSvgX = (v: number) => PAD.left + ((v - minX) / spanX) * chartW;
  const toSvgY = (p: number) => PAD.top + (1 - p) * chartH; // p=0 → bottom, p=1 → top

  const points = cdf.map((v, i) => `${toSvgX(v)},${toSvgY(i / (cdf.length - 1))}`).join(' ');

  const p5x  = toSvgX(result.p5);
  const p95x = toSvgX(result.p95);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W }}>
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + chartH} stroke="#cbd5e1" />
      <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH} stroke="#cbd5e1" />

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <g key={p}>
          <line x1={PAD.left - 4} y1={toSvgY(p)} x2={PAD.left} y2={toSvgY(p)} stroke="#cbd5e1" />
          <text x={PAD.left - 6} y={toSvgY(p) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
            {(p * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      <text x={PAD.left} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
        {minX.toFixed(1)}
      </text>
      <text x={PAD.left + chartW} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
        {maxX.toFixed(1)}
      </text>

      {/* CDF curve */}
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth={2} />

      {/* P5 reference line */}
      <line x1={p5x} y1={PAD.top} x2={p5x} y2={PAD.top + chartH}
        stroke="#ef4444" strokeDasharray="4,2" strokeWidth={1.5} />
      <text x={p5x} y={PAD.top - 4} textAnchor="middle" fontSize="10" fill="#ef4444">P5</text>

      {/* P95 reference line */}
      <line x1={p95x} y1={PAD.top} x2={p95x} y2={PAD.top + chartH}
        stroke="#f97316" strokeDasharray="4,2" strokeWidth={1.5} />
      <text x={p95x} y={PAD.top - 4} textAnchor="middle" fontSize="10" fill="#f97316">P95</text>
    </svg>
  );
}
