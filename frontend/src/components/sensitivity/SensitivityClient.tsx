'use client';

import { useState } from 'react';
import { SessionHistory, type SessionRow } from '@/components/shared/SessionHistory';

type ModelType = 'EOQ' | 'BREAKEVEN';

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

interface ParameterSensitivity {
  paramKey: string;
  lowValue: number;
  highValue: number;
  lowOutput: number | null;
  highOutput: number | null;
  impact: number;
}

interface SensitivityResult {
  baseOutput: number;
  parameters: ParameterSensitivity[];
}

export default function SensitivityClient() {
  const [model, setModel] = useState<ModelType>('EOQ');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [swing, setSwing] = useState('20');
  const [result, setResult] = useState<SensitivityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [historyKey, setHistoryKey] = useState(0);

  const fields = model === 'EOQ' ? EOQ_FIELDS : BE_FIELDS;

  const updateInput = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
    setResult(null);
    setError(null);
  };

  const buildBaseInputs = (): Record<string, number> | null => {
    const out: Record<string, number> = {};
    for (const f of fields) {
      const v = Number(inputs[f]);
      if (!inputs[f] || isNaN(v) || v <= 0) return null;
      out[f] = v;
    }
    return out;
  };

  const calculate = async () => {
    setError(null);
    const baseInputs = buildBaseInputs();
    const swingNum = Number(swing);
    if (!baseInputs) { setError('All inputs must be positive numbers.'); return; }
    if (!swing || isNaN(swingNum) || swingNum <= 0) { setError('Swing % must be a positive number.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/sensitivity/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, baseInputs, swingPercent: swingNum }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(`Calculation failed: ${msg}`);
        return;
      }
      setResult(await res.json());
    } catch {
      setError('Could not reach the backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setInputs({}); setResult(null); setError(null); setSaveStatus('idle'); };

  const saveSession = async () => {
    if (!result) return;
    const baseInputs = buildBaseInputs();
    if (!baseInputs) return;
    const name = sessionName.trim() || new Date().toLocaleString();
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/sensitivity/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model, baseInputs, swingPercent: Number(swing) }),
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

  const loadSession = async (row: SessionRow) => {
    try {
      const res = await fetch(`/api/sensitivity/sessions/${row.id}`);
      if (!res.ok) return;
      const full = await res.json();
      setModel(full.model as ModelType);
      const strInputs: Record<string, string> = {};
      for (const [k, v] of Object.entries(full.baseInputs as Record<string, number>)) {
        strInputs[k] = String(v);
      }
      setInputs(strInputs);
      setSwing(String(full.swingPercent));
      setResult(full.results);
      setError(null);
    } catch { /* silent */ }
  };

  const HISTORY_COLUMNS = [
    { key: 'model', label: 'Model' },
    { key: 'swingPercent', label: 'Swing %' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Sensitivity Analysis
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-sm)' }}>
          Vary each input ±swing% to see which parameter has the greatest impact on the output.
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
            <select
              value={model}
              onChange={e => { setModel(e.target.value as ModelType); setInputs({}); setResult(null); }}
              style={{ width: '100%' }}
            >
              <option value="EOQ">Economic Order Quantity (EOQ)</option>
              <option value="BREAKEVEN">Break-even Analysis</option>
            </select>
          </div>

          {/* Parameter inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {fields.map(field => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
                  {FIELD_LABELS[field]}
                </label>
                <input
                  type="number"
                  value={inputs[field] ?? ''}
                  onChange={e => updateInput(field, e.target.value)}
                  min="0" step="any" placeholder="0"
                />
              </div>
            ))}

            {/* Swing % */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)' }}>
                Swing Percentage (±%)
              </label>
              <input
                type="number"
                value={swing}
                onChange={e => { setSwing(e.target.value); setResult(null); }}
                min="0.01" step="1" placeholder="20"
              />
            </div>
          </div>

          {error && <p className="field-error" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button onClick={calculate} className="btn btn-primary" disabled={loading}>
              {loading ? 'Calculating…' : 'Calculate'}
            </button>
            <button onClick={clear} className="btn btn-secondary">Clear</button>
          </div>
        </div>

        {/* Results card */}
        <div className="card" style={{ opacity: result ? 1 : 0.4, transition: 'opacity var(--transition-base)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Results
          </h2>
          {result ? (
            <>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)', marginBottom: 'var(--space-3)' }}>
                Base output: <strong>{result.baseOutput.toFixed(2)}</strong>
              </p>
              <table className="result-table" style={{ marginBottom: 'var(--space-4)' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Parameter</th>
                    <th>Low output</th>
                    <th>High output</th>
                    <th>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {result.parameters.map(p => (
                    <tr key={p.paramKey}>
                      <td style={{ textAlign: 'left' }}>{p.paramKey}</td>
                      <td>{p.lowOutput != null ? p.lowOutput.toFixed(2) : 'N/A'}</td>
                      <td>{p.highOutput != null ? p.highOutput.toFixed(2) : 'N/A'}</td>
                      <td style={{ fontWeight: 'var(--font-semibold)' }}>{p.impact.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-400)' }}>
              Fill in all inputs and click Calculate.
            </p>
          )}
        </div>
      </div>

      {/* Tornado chart */}
      {result && result.parameters.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Tornado Chart
          </h2>
          <TornadoChart baseOutput={result.baseOutput} parameters={result.parameters} />
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
            <button onClick={saveSession} className="btn btn-primary"
              disabled={saveStatus === 'saving'} style={{ whiteSpace: 'nowrap' }}>
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
          </div>
          {saveStatus === 'error' && (
            <p className="field-error" style={{ marginTop: 'var(--space-2)' }}>
              Could not reach the backend.
            </p>
          )}
        </div>
      )}

      <SessionHistory
        apiPath="/api/sensitivity/sessions"
        refreshKey={historyKey}
        columns={HISTORY_COLUMNS}
        onLoad={loadSession}
      />
    </div>
  );
}

function TornadoChart({ baseOutput, parameters }: {
  baseOutput: number;
  parameters: ParameterSensitivity[];
}) {
  const SVG_W = 520, ROW_H = 44, LABEL_W = 140, PAD = 16;
  const chartW = SVG_W - LABEL_W - PAD;
  const H = parameters.length * ROW_H + 60;

  const validParams = parameters.filter(p => p.lowOutput != null && p.highOutput != null);
  if (validParams.length === 0) return null;

  const allOut = validParams.flatMap(p => [p.lowOutput!, p.highOutput!, baseOutput]);
  const minOut = Math.min(...allOut);
  const maxOut = Math.max(...allOut);
  const span = maxOut - minOut || 1;
  const toX = (v: number) => LABEL_W + ((v - minOut) / span) * chartW;
  const baseX = toX(baseOutput);

  return (
    <svg viewBox={`0 0 ${SVG_W} ${H}`} style={{ width: '100%', maxWidth: SVG_W, overflow: 'visible' }}>
      {/* Base line */}
      <line x1={baseX} y1={24} x2={baseX} y2={H - 24}
        stroke="#94a3b8" strokeDasharray="4,2" strokeWidth={1.5} />
      <text x={baseX} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
        base: {baseOutput.toFixed(2)}
      </text>

      {parameters.map((p, i) => {
        if (p.lowOutput == null || p.highOutput == null) return null;
        const y = 28 + i * ROW_H;
        const x1 = Math.min(toX(p.lowOutput), toX(p.highOutput));
        const x2 = Math.max(toX(p.lowOutput), toX(p.highOutput));
        const barW = Math.max(x2 - x1, 2);
        return (
          <g key={p.paramKey}>
            <text x={LABEL_W - 6} y={y + ROW_H / 2 + 4} textAnchor="end"
              fontSize="11" fill="#374151">{p.paramKey}</text>
            {/* Base bar (grey background) */}
            <rect x={x1} y={y + 8} width={barW} height={ROW_H - 16} rx={2}
              fill="#6366f1" opacity={0.2} />
            {/* Below-base portion (red) */}
            {toX(p.lowOutput) < baseX && (
              <rect x={toX(p.lowOutput)} y={y + 8}
                width={Math.min(baseX, toX(p.highOutput)) - toX(p.lowOutput)}
                height={ROW_H - 16} rx={2} fill="#ef4444" opacity={0.75} />
            )}
            {/* Above-base portion (indigo) */}
            {toX(p.highOutput) > baseX && (
              <rect x={Math.max(baseX, toX(p.lowOutput))} y={y + 8}
                width={toX(p.highOutput) - Math.max(baseX, toX(p.lowOutput))}
                height={ROW_H - 16} rx={2} fill="#6366f1" opacity={0.75} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
