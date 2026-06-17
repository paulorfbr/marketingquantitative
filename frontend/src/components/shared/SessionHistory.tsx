'use client';

import { useEffect, useState } from 'react';

export interface SessionRow {
  id: number;
  name: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface SessionColumn {
  key: string;
  label: string;
  format?: (v: unknown) => string;
}

interface Props {
  apiPath: string;
  refreshKey: number;
  columns: SessionColumn[];
  onLoad: (session: SessionRow) => void;
}

export function SessionHistory({ apiPath, refreshKey, columns, onLoad }: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    fetch(apiPath)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: SessionRow[]) => setSessions(data))
      .catch(() => setSessions([])); // silent — backend may not be running (NFR-02)
  }, [apiPath, refreshKey]);

  if (sessions.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 'var(--space-6)' }}>
      <h2 style={{
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-semibold)',
        marginBottom: 'var(--space-3)',
      }}>
        Recent Sessions
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="result-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Name</th>
              {columns.map(c => <th key={c.key}>{c.label}</th>)}
              <th style={{ textAlign: 'left' }}>Saved</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map(session => (
              <tr key={session.id}>
                <td style={{ textAlign: 'left' }}>{session.name}</td>
                {columns.map(c => {
                  const v = session[c.key];
                  const display = c.format
                    ? c.format(v)
                    : typeof v === 'number'
                      ? v.toFixed(2)
                      : String(v ?? '');
                  return <td key={c.key}>{display}</td>;
                })}
                <td style={{
                  textAlign: 'left',
                  color: 'var(--color-neutral-400)',
                  fontSize: 'var(--text-xs)',
                  whiteSpace: 'nowrap',
                }}>
                  {new Date(session.createdAt).toLocaleString()}
                </td>
                <td>
                  <button
                    onClick={() => onLoad(session)}
                    className="btn btn-secondary"
                    style={{ fontSize: 'var(--text-xs)', padding: '2px var(--space-2)' }}
                  >
                    Load
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
