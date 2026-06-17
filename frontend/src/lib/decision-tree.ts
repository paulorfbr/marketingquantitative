export type NodeKind = 'decision' | 'chance';

export interface TreeNode {
  id: string;
  kind: NodeKind;
  label: string;
  branches: Branch[];
}

export interface Branch {
  id: string;
  label: string;
  probability: string;   // decimal string, e.g. "0.6"; "" for decision branches
  terminalValue: string; // number string if leaf; "" if branch has a child node
  child: TreeNode | null;
}

export interface TreeCalcResult {
  rootEmv: number;
  nodeEmv: Record<string, number>;   // node id → emv
  optimalBranchIds: Set<string>;
}

export interface TreeValidationError {
  nodeId: string;
  message: string;
}

let _counter = 0;
export function newId(): string {
  return `n${++_counter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function countLeaves(node: TreeNode): number {
  return node.branches.reduce((s, b) => s + (b.child ? countLeaves(b.child) : 1), 0);
}

export function treeDepth(node: TreeNode): number {
  const ds = node.branches.map(b => (b.child ? 1 + treeDepth(b.child) : 0));
  return ds.length > 0 ? Math.max(...ds) : 0;
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateTree(node: TreeNode): TreeValidationError[] {
  const errors: TreeValidationError[] = [];

  if (node.kind === 'chance') {
    let probSum = 0;
    for (const b of node.branches) {
      const p = Number(b.probability);
      if (b.probability.trim() === '' || isNaN(p) || p < 0 || p > 1) {
        errors.push({ nodeId: node.id, message: `Branch "${b.label}": probability must be between 0 and 1.` });
      } else {
        probSum += p;
      }
    }
    if (Math.abs(probSum - 1.0) > 0.001) {
      errors.push({
        nodeId: node.id,
        message: `"${node.label}": probabilities sum to ${probSum.toFixed(3)}, must equal 1.000.`,
      });
    }
  }

  for (const b of node.branches) {
    if (!b.child) {
      const v = Number(b.terminalValue);
      if (b.terminalValue.trim() === '' || isNaN(v)) {
        errors.push({ nodeId: node.id, message: `Branch "${b.label}": enter a terminal value.` });
      }
    } else {
      errors.push(...validateTree(b.child));
    }
  }

  return errors;
}

// ── Calculation (backwards induction) ─────────────────────────────────────────

function branchValue(b: Branch, emvMap: Record<string, number>): number {
  return b.child ? (emvMap[b.child.id] ?? 0) : Number(b.terminalValue);
}

function computeEmv(node: TreeNode, emvMap: Record<string, number>): number {
  // recurse first (bottom-up)
  for (const b of node.branches) {
    if (b.child) computeEmv(b.child, emvMap);
  }

  const vals = node.branches.map(b => branchValue(b, emvMap));
  const emv =
    node.kind === 'chance'
      ? node.branches.reduce((s, b, i) => s + Number(b.probability) * vals[i], 0)
      : Math.max(...vals);

  emvMap[node.id] = emv;
  return emv;
}

function traceOptimal(node: TreeNode, emvMap: Record<string, number>, opt: Set<string>): void {
  if (node.kind === 'decision') {
    // find branch whose value equals the node EMV
    let bestId = '';
    let bestVal = -Infinity;
    for (const b of node.branches) {
      const v = branchValue(b, emvMap);
      if (v > bestVal) { bestVal = v; bestId = b.id; }
    }
    opt.add(bestId);
    const best = node.branches.find(b => b.id === bestId);
    if (best?.child) traceOptimal(best.child, emvMap, opt);
  } else {
    // chance: all branches are part of the outcome distribution
    for (const b of node.branches) {
      opt.add(b.id);
      if (b.child) traceOptimal(b.child, emvMap, opt);
    }
  }
}

export function calculateTree(root: TreeNode): TreeCalcResult {
  const emvMap: Record<string, number> = {};
  computeEmv(root, emvMap);

  const opt = new Set<string>();
  traceOptimal(root, emvMap, opt);

  return { rootEmv: emvMap[root.id] ?? 0, nodeEmv: emvMap, optimalBranchIds: opt };
}

// ── Immutable tree-update helpers ─────────────────────────────────────────────

export function updateNode(
  root: TreeNode,
  targetId: string,
  fn: (n: TreeNode) => TreeNode
): TreeNode {
  if (root.id === targetId) return fn(root);
  return {
    ...root,
    branches: root.branches.map(b => ({
      ...b,
      child: b.child ? updateNode(b.child, targetId, fn) : null,
    })),
  };
}

export function updateBranch(
  root: TreeNode,
  nodeId: string,
  branchId: string,
  fn: (b: Branch) => Branch
): TreeNode {
  return updateNode(root, nodeId, node => ({
    ...node,
    branches: node.branches.map(b => (b.id === branchId ? fn(b) : b)),
  }));
}
