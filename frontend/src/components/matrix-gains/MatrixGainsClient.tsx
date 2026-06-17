'use client';

import { useState } from 'react';
import { calculateMatrixGains, type Strategy, type MatrixGainsResult } from '@/lib/matrix-gains';

type CellRow = { label: string; values: string[] };

const INITIAL_SCENARIOS = ['Scenario 1', 'Scenario 2'];
const INITIAL_ROWS: CellRow[] = [
  { label: 'Strategy A', values: ['', ''] },
  { label: 'Strategy B', values: ['', ''] },
];

export default function MatrixGainsClient() {
  const [scenarios, setScenarios] = useState<string[]>(INITIAL_SCENARIOS);
  const [rows, setRows] = useState<CellRow[]>(INITIAL_ROWS);
  const [result, setResult] = useState<MatrixGainsResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const addScenario = () => {
    const label = `Scenario ${scenarios.length + 1}`;
    setScenarios(s => [...s, label]);
    setRows(r => r.map(row => ({ ...row, values: [...row.values, ''] })));
    setResult(null);
  };

  const removeScenario = (idx: number) => {
    if (scenarios.length <= 1) return;
    setScenarios(s => s.filter((_, i) => i !== idx));
    setRows(r => r.map(row => ({ ...row, values: row.values.filter((_, i) => i !== idx) })));
    setResult(null);
  };

  const addRow = () => {
    const label = `Strategy ${String.fromCharCode(65 + rows.length % 26)}`;
    setRows(r => [...r, { label, values: scenarios.map(() => '') }]);
    setResult(null);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(r => r.filter((_, i) => i !== idx));
    setResult(null);
  };

  const updateScenarioLabel = (idx: number, value: string) =>
    setScenarios(s => s.map((sc, i) => (i === idx ? value : sc)));

  const updateRowLabel = (idx: number, value: string) =>
    setRows(r => r.map((row, i) => (i === idx ? { ...row, label: value } : row)));

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    setRows(r =>
      r.map((row, i) => {
        if (i !== rowIdx) return row;
        const values = [...row.values];
        values[colIdx] = value;
        return { ...row, values };
      })
    );
    setResult(null);
  };

  const calculate = () => {
    const errs: string[] = [];
    rows.forEach((row, ri) =>
      row.values.forEach((v, ci) => {
        if (v.trim() === '' || isNaN(Number(v))) {
          errs.push(`"${row.label}" × "${scenarios[ci]}": must be a number.`);
        }
      })
    );

    if (errs.length > 0) {
      setErrors(errs);
      setResult(null);
      return;
    }

    setErrors([]);
    const strategies: Strategy[] = rows.map(row => ({
      label: row.label,
      values: row.values.map(Number),
    }));
    setResult(calculateMatrixGains(strategies));
  };

  const clear = () => {
    setScenarios(INITIAL_SCENARIOS);
    setRows(INITIAL_ROWS.map(r => ({ ...r, values: [...r.values] })));
    setResult(null);
    setErrors([]);
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Matrix Gains
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-sm)' }}>
          Enter payoff values for each strategy × scenario, then calculate the optimistic (maxi-max)
          and pessimistic (maxi-min) criteria.
        </p>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="result-table" style={{ marginBottom: 'var(--space-4)' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', minWidth: '150px' }}>Strategy</th>
              {scenarios.map((sc, i) => (
                <th key={i} style={{ minWidth: '130px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={sc}
                      onChange={e => updateScenarioLabel(i, e.target.value)}
                      style={{ width: '100%', textAlign: 'center', fontWeight: 'var(--font-semibold)' }}
                      aria-label={`Scenario ${i + 1} label`}
                    />
                    {scenarios.length > 1 && (
                      <button
                        onClick={() => removeScenario(i)}
                        className="btn btn-secondary"
                        style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }}
                        aria-label={`Remove ${sc}`}
                      >
                        × Remove
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ width: '90px' }}>
                <button onClick={addScenario} className="btn btn-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  + Column
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const isMaxiMaxOptimal = result?.maxiMax.strategyIndices.includes(ri) ?? false;
              const isMaxiMinOptimal = result?.maxiMin.strategyIndices.includes(ri) ?? false;

              let rowBg: string | undefined;
              if (isMaxiMaxOptimal && isMaxiMinOptimal) rowBg = 'var(--color-primary-100)';
              else if (isMaxiMaxOptimal) rowBg = 'var(--color-primary-50)';
              else if (isMaxiMinOptimal) rowBg = 'var(--color-success-bg)';

              return (
                <tr key={ri} style={{ background: rowBg }}>
                  <td style={{ textAlign: 'left' }}>
                    <input
                      type="text"
                      value={row.label}
                      onChange={e => updateRowLabel(ri, e.target.value)}
                      style={{ width: '100%' }}
                      aria-label={`Strategy ${ri + 1} label`}
                    />
                  </td>
                  {row.values.map((v, ci) => (
                    <td key={ci}>
                      <input
                        type="number"
                        value={v}
                        onChange={e => updateCell(ri, ci, e.target.value)}
                        style={{ width: '100%', textAlign: 'right' }}
                        placeholder="0"
                        aria-label={`${row.label} × ${scenarios[ci]}`}
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(ri)}
                        className="btn btn-secondary"
                        style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }}
                        aria-label={`Remove ${row.label}`}
                      >
                        × Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {result && (
              <>
                <tr style={{ background: 'var(--color-primary-50)', fontWeight: 'var(--font-semibold)' }}>
                  <td style={{ textAlign: 'left', color: 'var(--color-primary-700)' }}>
                    Maxi-Max (Optimistic)
                  </td>
                  <td
                    colSpan={scenarios.length}
                    style={{ textAlign: 'center', color: 'var(--color-primary-700)' }}
                    className="optimal"
                  >
                    {result.maxiMax.value.toFixed(2)} &mdash;{' '}
                    {result.maxiMax.strategyIndices.map(i => rows[i].label).join(', ')}
                  </td>
                  <td />
                </tr>
                <tr style={{ background: 'var(--color-success-bg)', fontWeight: 'var(--font-semibold)' }}>
                  <td style={{ textAlign: 'left', color: 'var(--color-success)' }}>
                    Maxi-Min (Pessimistic)
                  </td>
                  <td
                    colSpan={scenarios.length}
                    style={{ textAlign: 'center', color: 'var(--color-success)' }}
                  >
                    {result.maxiMin.value.toFixed(2)} &mdash;{' '}
                    {result.maxiMin.strategyIndices.map(i => rows[i].label).join(', ')}
                  </td>
                  <td />
                </tr>
              </>
            )}
          </tbody>
        </table>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={addRow} className="btn btn-secondary">+ Add Strategy</button>
          <button onClick={calculate} className="btn btn-primary">Calculate</button>
          <button onClick={clear} className="btn btn-secondary">Clear</button>
        </div>

        {errors.length > 0 && (
          <div
            role="alert"
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-error)', marginBottom: 'var(--space-1)' }}>
              Please fix the following errors:
            </p>
            <ul style={{ paddingLeft: 'var(--space-4)' }}>
              {errors.map((err, i) => (
                <li key={i} className="field-error">{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {result && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Results
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-200)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', fontWeight: 'var(--font-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>
                Maxi-Max — Optimistic
              </p>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary-700)' }}>
                {result.maxiMax.value.toFixed(2)}
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-600)', marginTop: 'var(--space-1)' }}>
                {result.maxiMax.strategyIndices.map(i => rows[i].label).join(', ')}
              </p>
            </div>
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--color-success-bg)',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>
                Maxi-Min — Pessimistic
              </p>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>
                {result.maxiMin.value.toFixed(2)}
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success)', marginTop: 'var(--space-1)' }}>
                {result.maxiMin.strategyIndices.map(i => rows[i].label).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
