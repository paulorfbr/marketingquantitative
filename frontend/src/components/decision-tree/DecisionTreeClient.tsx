'use client';

import { useState } from 'react';
import {
  calculateTree,
  validateTree,
  countLeaves,
  treeDepth,
  newId,
  type TreeNode,
  type Branch,
  type TreeCalcResult,
  type TreeValidationError,
} from '@/lib/decision-tree';

/* ── Default example tree (matches TC-05-U02) ────────────────────────────── */

function makeDefault(): TreeNode {
  return {
    id: newId(), kind: 'decision', label: 'Main Decision',
    branches: [
      {
        id: newId(), label: 'Option A', probability: '', terminalValue: '',
        child: {
          id: newId(), kind: 'chance', label: 'Market Outcome',
          branches: [
            { id: newId(), label: 'Success', probability: '0.6', terminalValue: '100', child: null },
            { id: newId(), label: 'Failure', probability: '0.4', terminalValue: '50',  child: null },
          ],
        },
      },
      { id: newId(), label: 'Option B', probability: '', terminalValue: '60', child: null },
    ],
  };
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export default function DecisionTreeClient() {
  const [root, setRoot]     = useState<TreeNode>(makeDefault);
  const [result, setResult] = useState<TreeCalcResult | null>(null);
  const [errors, setErrors] = useState<TreeValidationError[]>([]);

  const calculate = () => {
    const errs = validateTree(root);
    setErrors(errs);
    if (errs.length > 0) { setResult(null); return; }
    setResult(calculateTree(root));
  };

  const reset = () => {
    setRoot(makeDefault());
    setResult(null);
    setErrors([]);
  };

  const errorsForNode = (nodeId: string) =>
    errors.filter(e => e.nodeId === nodeId);

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Decision Tree
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 'var(--text-sm)' }}>
          Build a decision tree by adding decision nodes (□) and chance nodes (○),
          then click Calculate to run backwards induction and find the optimal path.
        </p>
      </div>

      {/* Tree builder */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Tree Builder
        </h2>

        <NodeEditor
          node={root}
          depth={0}
          isRoot
          errorsForNode={errorsForNode}
          onChange={updated => { setRoot(updated); setResult(null); setErrors([]); }}
        />

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <button onClick={calculate} className="btn btn-primary">Calculate</button>
          <button onClick={reset} className="btn btn-secondary">Reset to Example</button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-3)',
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-600)', fontWeight: 'var(--font-semibold)' }}>
              Root EMV
            </span>
            <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary-700)' }}>
              ${result.rootEmv.toFixed(2)}
            </span>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Tree Diagram
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', marginBottom: 'var(--space-3)' }}>
              □ decision node &nbsp;·&nbsp; ○ chance node &nbsp;·&nbsp;
              <span style={{ color: 'var(--color-primary-600)', fontWeight: 'var(--font-semibold)' }}>highlighted path</span> = optimal
            </p>
            <TreeSVG root={root} result={result} />
          </div>
        </>
      )}
    </div>
  );
}

/* ── NodeEditor ─────────────────────────────────────────────────────────────── */

function NodeEditor({
  node, depth, isRoot, errorsForNode, onChange,
}: {
  node: TreeNode;
  depth: number;
  isRoot?: boolean;
  errorsForNode: (id: string) => TreeValidationError[];
  onChange: (updated: TreeNode) => void;
}) {
  const nodeErrors = errorsForNode(node.id);

  const addBranch = () => {
    const newBranch: Branch = {
      id: newId(),
      label: `Branch ${node.branches.length + 1}`,
      probability: node.kind === 'chance' ? '0' : '',
      terminalValue: '0',
      child: null,
    };
    onChange({ ...node, branches: [...node.branches, newBranch] });
  };

  return (
    <div
      style={{
        marginLeft: depth > 0 ? 'var(--space-6)' : 0,
        borderLeft: depth > 0 ? '2px solid var(--color-neutral-200)' : 'none',
        paddingLeft: depth > 0 ? 'var(--space-4)' : 0,
      }}
    >
      {/* Node header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <NodeBadge kind={node.kind} />
        <select
          value={node.kind}
          onChange={e => onChange({ ...node, kind: e.target.value as TreeNode['kind'] })}
          style={{ fontSize: 'var(--text-sm)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)' }}
        >
          <option value="decision">Decision</option>
          <option value="chance">Chance</option>
        </select>
        <input
          type="text"
          value={node.label}
          onChange={e => onChange({ ...node, label: e.target.value })}
          placeholder="Node label"
          style={{ flex: 1, fontSize: 'var(--text-sm)', maxWidth: '240px' }}
        />
        {node.kind === 'chance' && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>
            Probabilities must sum to 1.0
          </span>
        )}
      </div>

      {/* Validation errors for this node */}
      {nodeErrors.map((err, i) => (
        <div key={i} role="alert" style={{
          marginBottom: 'var(--space-2)', padding: '6px 10px',
          background: 'var(--color-error-bg)', border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--color-error)',
        }}>
          {err.message}
        </div>
      ))}

      {/* Branches */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {node.branches.map((branch, idx) => (
          <BranchEditor
            key={branch.id}
            branch={branch}
            idx={idx}
            parentKind={node.kind}
            errorsForNode={errorsForNode}
            onChange={updated => onChange({
              ...node,
              branches: node.branches.map(b => b.id === branch.id ? updated : b),
            })}
            onRemove={() => onChange({
              ...node,
              branches: node.branches.filter(b => b.id !== branch.id),
            })}
            depth={depth}
          />
        ))}
      </div>

      <button
        onClick={addBranch}
        style={{
          marginTop: 'var(--space-3)',
          fontSize: 'var(--text-xs)',
          padding: '4px 10px',
          background: 'none',
          border: '1px dashed var(--color-neutral-300)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-neutral-500)',
          cursor: 'pointer',
        }}
      >
        + Add branch
      </button>
    </div>
  );
}

/* ── BranchEditor ───────────────────────────────────────────────────────────── */

function BranchEditor({
  branch, idx, parentKind, errorsForNode, onChange, onRemove, depth,
}: {
  branch: Branch;
  idx: number;
  parentKind: TreeNode['kind'];
  errorsForNode: (id: string) => TreeValidationError[];
  onChange: (updated: Branch) => void;
  onRemove: () => void;
  depth: number;
}) {
  const addChild = (kind: TreeNode['kind']) => {
    const child: TreeNode = {
      id: newId(), kind, label: kind === 'decision' ? 'Decision' : 'Chance',
      branches: [
        { id: newId(), label: 'Branch 1', probability: kind === 'chance' ? '0.5' : '', terminalValue: '0', child: null },
        { id: newId(), label: 'Branch 2', probability: kind === 'chance' ? '0.5' : '', terminalValue: '0', child: null },
      ],
    };
    onChange({ ...branch, terminalValue: '', child });
  };

  const removeChild = () => onChange({ ...branch, child: null, terminalValue: '0' });

  return (
    <div style={{
      padding: 'var(--space-3)',
      background: 'var(--color-neutral-50)',
      border: '1px solid var(--color-neutral-200)',
      borderRadius: 'var(--radius-md)',
    }}>
      {/* Branch row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', minWidth: '16px' }}>
          {idx + 1}.
        </span>
        <input
          type="text"
          value={branch.label}
          onChange={e => onChange({ ...branch, label: e.target.value })}
          placeholder="Branch label"
          style={{ width: '140px', fontSize: 'var(--text-sm)' }}
        />

        {parentKind === 'chance' && (
          <>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>p =</span>
            <input
              type="number"
              value={branch.probability}
              min={0} max={1} step={0.01}
              onChange={e => onChange({ ...branch, probability: e.target.value })}
              style={{ width: '68px', fontSize: 'var(--text-sm)' }}
              placeholder="0.0"
            />
          </>
        )}

        {!branch.child && (
          <>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)' }}>value =</span>
            <input
              type="number"
              value={branch.terminalValue}
              step="any"
              onChange={e => onChange({ ...branch, terminalValue: e.target.value })}
              style={{ width: '88px', fontSize: 'var(--text-sm)' }}
              placeholder="0"
            />
          </>
        )}

        {!branch.child && depth < 1 && (
          <div style={{ display: 'flex', gap: 'var(--space-1)', marginLeft: 'auto' }}>
            <button
              onClick={() => addChild('decision')}
              title="Add decision child node"
              style={{
                fontSize: 'var(--text-xs)', padding: '2px 8px',
                background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)',
                borderRadius: 'var(--radius-md)', color: 'var(--color-primary-600)', cursor: 'pointer',
              }}
            >+ □ node</button>
            <button
              onClick={() => addChild('chance')}
              title="Add chance child node"
              style={{
                fontSize: 'var(--text-xs)', padding: '2px 8px',
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 'var(--radius-md)', color: '#d97706', cursor: 'pointer',
              }}
            >+ ○ node</button>
          </div>
        )}

        {branch.child && (
          <button
            onClick={removeChild}
            title="Remove child node (becomes terminal)"
            style={{
              fontSize: 'var(--text-xs)', padding: '2px 8px', marginLeft: 'auto',
              background: 'none', border: '1px solid var(--color-neutral-300)',
              borderRadius: 'var(--radius-md)', color: 'var(--color-neutral-500)', cursor: 'pointer',
            }}
          >Remove child</button>
        )}

        <button
          onClick={onRemove}
          style={{
            fontSize: 'var(--text-xs)', padding: '2px 6px',
            background: 'none', border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)', color: 'var(--color-error)', cursor: 'pointer',
          }}
        >×</button>
      </div>

      {/* Child node editor */}
      {branch.child && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <NodeEditor
            node={branch.child}
            depth={depth + 1}
            errorsForNode={errorsForNode}
            onChange={updated => onChange({ ...branch, child: updated })}
          />
        </div>
      )}
    </div>
  );
}

/* ── SVG Tree Visualisation ─────────────────────────────────────────────────── */

const L = {
  padLeft:  90,
  padTop:   44,
  padBot:   44,
  levelW:  210,
  leafH:    78,
  nodeR:    15,
  termW:    84,
  termH:    26,
};

interface NodeLayout {
  node: TreeNode;
  x: number;
  y: number;
  emv: number;
  branches: BranchLayout[];
}

interface BranchLayout {
  branch: Branch;
  midY: number;
  isOptimal: boolean;
  childLayout: NodeLayout | null;
}

function buildLayout(
  node: TreeNode,
  depth: number,
  yTop: number,
  yBot: number,
  termX: number,
  result: TreeCalcResult
): NodeLayout {
  const x = L.padLeft + depth * L.levelW;
  const total = countLeaves(node);
  let cursor = yTop;

  const branches: BranchLayout[] = node.branches.map(branch => {
    const leaves = branch.child ? countLeaves(branch.child) : 1;
    const bTop = cursor;
    const bBot = cursor + (yBot - yTop) * (leaves / total);
    cursor = bBot;
    const midY = (bTop + bBot) / 2;

    return {
      branch,
      midY,
      isOptimal: result.optimalBranchIds.has(branch.id),
      childLayout: branch.child
        ? buildLayout(branch.child, depth + 1, bTop, bBot, termX, result)
        : null,
    };
  });

  return { node, x, y: (yTop + yBot) / 2, emv: result.nodeEmv[node.id] ?? 0, branches };
}

function TreeSVG({ root, result }: { root: TreeNode; result: TreeCalcResult }) {
  const depth   = treeDepth(root);
  const leaves  = countLeaves(root);
  const termX   = L.padLeft + (depth + 1) * L.levelW;
  const svgW    = termX + L.termW + 60;
  const svgH    = L.padTop + leaves * L.leafH + L.padBot;

  const layout = buildLayout(root, 0, L.padTop, svgH - L.padBot, termX, result);

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      aria-label="Decision tree diagram"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <RenderNode layout={layout} termX={termX} />
    </svg>
  );
}

function RenderNode({ layout, termX }: { layout: NodeLayout; termX: number }) {
  const { x, y, node, emv, branches } = layout;
  const startX    = x + L.nodeR;
  const junctionX = x + L.levelW * 0.42;

  const branchYs  = branches.map(b => b.midY);
  const minY      = Math.min(...branchYs);
  const maxY      = Math.max(...branchYs);

  // For shared backbone, use optimal color if any branch is optimal
  const anyOptimal  = branches.some(b => b.isOptimal);
  const spineStroke = anyOptimal ? '#4f46e5' : '#d1d5db';
  const spineSW     = anyOptimal ? 2 : 1.5;

  return (
    <g>
      {/* Shared stub: node right-edge → junction (drawn once) */}
      <path
        d={`M${startX},${y} H${junctionX}`}
        stroke={spineStroke} strokeWidth={spineSW} fill="none"
      />
      {/* Vertical spine connecting all branch origins (drawn once) */}
      {branches.length > 1 && (
        <line
          x1={junctionX} y1={minY} x2={junctionX} y2={maxY}
          stroke={spineStroke} strokeWidth={spineSW}
        />
      )}

      {/* Per-branch: arm + label + terminal/child */}
      {branches.map(bl => {
        const endX   = bl.childLayout ? bl.childLayout.x - L.nodeR : termX;
        const stroke = bl.isOptimal ? '#4f46e5' : '#d1d5db';
        const sw     = bl.isOptimal ? 2.5 : 1.5;
        const midArm = (junctionX + endX) / 2;

        return (
          <g key={bl.branch.id}>
            {/* Arm: junction → destination */}
            <path d={`M${junctionX},${bl.midY} H${endX}`} stroke={stroke} strokeWidth={sw} fill="none" />

            {/* Branch label */}
            <text
              x={midArm} y={bl.midY - 7}
              textAnchor="middle" fontSize="10"
              fill={bl.isOptimal ? '#4338ca' : '#6b7280'}
              fontWeight={bl.isOptimal ? '600' : '400'}
            >
              {node.kind === 'chance'
                ? `${bl.branch.label} (p=${Number(bl.branch.probability).toFixed(2)})`
                : bl.branch.label}
            </text>

            {/* Terminal box */}
            {!bl.childLayout && (
              <g>
                <rect
                  x={termX} y={bl.midY - L.termH / 2}
                  width={L.termW} height={L.termH} rx={5}
                  fill={bl.isOptimal ? '#eef2ff' : '#f9fafb'}
                  stroke={bl.isOptimal ? '#6366f1' : '#e5e7eb'}
                  strokeWidth={bl.isOptimal ? 1.5 : 1}
                />
                <text
                  x={termX + L.termW / 2} y={bl.midY + 5}
                  textAnchor="middle" fontSize="11" fontWeight="600"
                  fill={bl.isOptimal ? '#4338ca' : '#374151'}
                >
                  ${Number(bl.branch.terminalValue).toFixed(2)}
                </text>
              </g>
            )}

            {/* Recurse into child node */}
            {bl.childLayout && <RenderNode layout={bl.childLayout} termX={termX} />}
          </g>
        );
      })}

      {/* Node symbol (drawn last = on top of lines) */}
      {node.kind === 'decision' ? (
        <rect x={x - L.nodeR} y={y - L.nodeR} width={L.nodeR * 2} height={L.nodeR * 2} fill="#4f46e5" rx={3} />
      ) : (
        <circle cx={x} cy={y} r={L.nodeR} fill="#d97706" />
      )}

      {/* Node label above */}
      <text x={x} y={y - L.nodeR - 6} textAnchor="middle" fontSize="10" fill="#374151">
        {node.label}
      </text>

      {/* EMV below */}
      <text
        x={x} y={y + L.nodeR + 13}
        textAnchor="middle" fontSize="10" fontWeight="600"
        fill={node.kind === 'decision' ? '#4338ca' : '#b45309'}
      >
        ${emv.toFixed(2)}
      </text>
    </g>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function NodeBadge({ kind }: { kind: TreeNode['kind'] }) {
  const isDecision = kind === 'decision';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '22px', height: '22px', flexShrink: 0,
      borderRadius: isDecision ? '3px' : '50%',
      background: isDecision ? '#4f46e5' : '#d97706',
      color: 'white', fontSize: '11px', fontWeight: 'bold',
    }}>
      {isDecision ? '□' : '○'}
    </span>
  );
}
