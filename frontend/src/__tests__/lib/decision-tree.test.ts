import {
  calculateTree,
  validateTree,
  type TreeNode,
} from '@/lib/decision-tree';

/* ── shared fixtures ──────────────────────────────────────────────────────── */

// TC-05-U01: single chance node, EMV = 0.6×100 + 0.4×50 = 80
const chanceRoot: TreeNode = {
  id: 'root', kind: 'chance', label: 'Market',
  branches: [
    { id: 'bA', label: 'A', probability: '0.6', terminalValue: '100', child: null },
    { id: 'bB', label: 'B', probability: '0.4', terminalValue: '50',  child: null },
  ],
};

// TC-05-U02: decision between chance EMV=80 and terminal 60 → pick 80
const decisionRoot: TreeNode = {
  id: 'root2', kind: 'decision', label: 'Decision',
  branches: [
    { id: 'b1', label: 'Option A', probability: '', terminalValue: '', child: chanceRoot },
    { id: 'b2', label: 'Option B', probability: '', terminalValue: '60', child: null },
  ],
};

// TC-05-U03: two-level nested chance nodes
//   Path A: 0.7×200 + 0.3×50 = 155
//   Path B: 0.5×150 + 0.5×80 = 115
//   Decision → pick 155
const twoLevelRoot: TreeNode = {
  id: 'root3', kind: 'decision', label: 'Decision',
  branches: [
    {
      id: 'b1', label: 'Path A', probability: '', terminalValue: '',
      child: {
        id: 'cA', kind: 'chance', label: 'Chance A',
        branches: [
          { id: 'cA1', label: 'Good', probability: '0.7', terminalValue: '200', child: null },
          { id: 'cA2', label: 'Bad',  probability: '0.3', terminalValue:  '50', child: null },
        ],
      },
    },
    {
      id: 'b2', label: 'Path B', probability: '', terminalValue: '',
      child: {
        id: 'cB', kind: 'chance', label: 'Chance B',
        branches: [
          { id: 'cB1', label: 'Hit',  probability: '0.5', terminalValue: '150', child: null },
          { id: 'cB2', label: 'Miss', probability: '0.5', terminalValue:  '80', child: null },
        ],
      },
    },
  ],
};

/* ── calculateTree ──────────────────────────────────────────────────────────── */

describe('calculateTree', () => {
  it('TC-05-U01: chance node EMV = 0.6×100 + 0.4×50 = 80', () => {
    const r = calculateTree(chanceRoot);
    expect(r.rootEmv).toBeCloseTo(80, 9);
  });

  it('TC-05-U02: decision picks max EMV (80 over 60)', () => {
    const r = calculateTree(decisionRoot);
    expect(r.rootEmv).toBeCloseTo(80, 9);
    expect(r.optimalBranchIds.has('b1')).toBe(true);
    expect(r.optimalBranchIds.has('b2')).toBe(false);
  });

  it('TC-05-U03: two-level backwards induction — root EMV = 155', () => {
    const r = calculateTree(twoLevelRoot);
    expect(r.rootEmv).toBeCloseTo(155, 9);
    expect(r.nodeEmv['cA']).toBeCloseTo(155, 9);
    expect(r.nodeEmv['cB']).toBeCloseTo(115, 9);
    expect(r.optimalBranchIds.has('b1')).toBe(true);
    expect(r.optimalBranchIds.has('b2')).toBe(false);
  });

  it('nodeEmv is populated for every node', () => {
    const r = calculateTree(decisionRoot);
    expect(r.nodeEmv).toHaveProperty('root2');
    expect(r.nodeEmv).toHaveProperty('root');
    expect(r.nodeEmv['root']).toBeCloseTo(80, 9);
  });

  it('chance node: all branches are in optimalBranchIds', () => {
    const r = calculateTree(chanceRoot);
    expect(r.optimalBranchIds.has('bA')).toBe(true);
    expect(r.optimalBranchIds.has('bB')).toBe(true);
  });

  it('single terminal branch', () => {
    const node: TreeNode = {
      id: 'n', kind: 'decision', label: 'D',
      branches: [{ id: 'b', label: 'Only', probability: '', terminalValue: '42', child: null }],
    };
    const r = calculateTree(node);
    expect(r.rootEmv).toBe(42);
    expect(r.optimalBranchIds.has('b')).toBe(true);
  });
});

/* ── validateTree ──────────────────────────────────────────────────────────── */

describe('validateTree', () => {
  it('returns empty array for valid chance node', () => {
    expect(validateTree(chanceRoot)).toHaveLength(0);
  });

  it('returns empty array for valid decision tree', () => {
    expect(validateTree(decisionRoot)).toHaveLength(0);
  });

  it('TC-05-F02: probabilities do not sum to 1 → error', () => {
    const bad: TreeNode = {
      id: 'n', kind: 'chance', label: 'C',
      branches: [
        { id: 'b1', label: 'A', probability: '0.6', terminalValue: '100', child: null },
        { id: 'b2', label: 'B', probability: '0.6', terminalValue:  '50', child: null },
      ],
    };
    const errs = validateTree(bad);
    expect(errs.some(e => e.message.includes('sum'))).toBe(true);
  });

  it('probability out of range → error', () => {
    const bad: TreeNode = {
      id: 'n', kind: 'chance', label: 'C',
      branches: [
        { id: 'b1', label: 'A', probability: '-0.1', terminalValue: '100', child: null },
        { id: 'b2', label: 'B', probability: '1.1',  terminalValue:  '50', child: null },
      ],
    };
    const errs = validateTree(bad);
    expect(errs.length).toBeGreaterThan(0);
  });

  it('terminal branch with empty value → error', () => {
    const bad: TreeNode = {
      id: 'n', kind: 'decision', label: 'D',
      branches: [
        { id: 'b1', label: 'No value', probability: '', terminalValue: '', child: null },
      ],
    };
    const errs = validateTree(bad);
    expect(errs.some(e => e.message.includes('terminal value'))).toBe(true);
  });

  it('recurses into child nodes to validate them too', () => {
    const badChild: TreeNode = {
      id: 'c', kind: 'chance', label: 'Chance',
      branches: [
        { id: 'ca', label: 'A', probability: '0.7', terminalValue: '100', child: null },
        { id: 'cb', label: 'B', probability: '0.7', terminalValue:  '50', child: null }, // sums to 1.4
      ],
    };
    const root: TreeNode = {
      id: 'root', kind: 'decision', label: 'D',
      branches: [
        { id: 'b1', label: 'Go', probability: '', terminalValue: '', child: badChild },
      ],
    };
    const errs = validateTree(root);
    expect(errs.some(e => e.nodeId === 'c')).toBe(true);
  });
});
