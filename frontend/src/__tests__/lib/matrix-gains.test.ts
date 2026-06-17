import { calculateMatrixGains, rowMax, rowMin } from '@/lib/matrix-gains';

describe('rowMax', () => {
  it('returns the largest value', () => {
    expect(rowMax([4, 2, 1])).toBe(4);
  });

  it('handles all negative values', () => {
    expect(rowMax([-1, -2, -3])).toBe(-1);
  });

  it('handles a single value', () => {
    expect(rowMax([7])).toBe(7);
  });
});

describe('rowMin', () => {
  it('returns the smallest value', () => {
    expect(rowMin([4, 2, 1])).toBe(1);
  });

  it('handles all negative values', () => {
    expect(rowMin([-1, -2, -3])).toBe(-3);
  });

  it('handles a single value', () => {
    expect(rowMin([7])).toBe(7);
  });
});

describe('calculateMatrixGains', () => {
  it('computes maxi-max and maxi-min for a 3×3 matrix', () => {
    const result = calculateMatrixGains([
      { label: 'A', values: [4, 2, 1] },
      { label: 'B', values: [3, 5, 2] },
      { label: 'C', values: [1, 4, 6] },
    ]);

    // Row maxima: A=4, B=5, C=6 → maxi-max = C (index 2), value = 6
    expect(result.maxiMax.value).toBe(6);
    expect(result.maxiMax.strategyIndices).toEqual([2]);

    // Row minima: A=1, B=2, C=1 → maxi-min = B (index 1), value = 2
    expect(result.maxiMin.value).toBe(2);
    expect(result.maxiMin.strategyIndices).toEqual([1]);
  });

  it('handles a 1×1 matrix', () => {
    const result = calculateMatrixGains([{ label: 'A', values: [7] }]);

    expect(result.maxiMax.value).toBe(7);
    expect(result.maxiMax.strategyIndices).toEqual([0]);
    expect(result.maxiMin.value).toBe(7);
    expect(result.maxiMin.strategyIndices).toEqual([0]);
  });

  it('handles all-negative payoffs', () => {
    const result = calculateMatrixGains([
      { label: 'A', values: [-1, -2] },
      { label: 'B', values: [-3, -4] },
    ]);

    expect(result.maxiMax.value).toBe(-1);
    expect(result.maxiMax.strategyIndices).toEqual([0]);
    expect(result.maxiMin.value).toBe(-2);
    expect(result.maxiMin.strategyIndices).toEqual([0]);
  });

  it('reports all tied strategies for maxi-max', () => {
    const result = calculateMatrixGains([
      { label: 'A', values: [5, 1] },
      { label: 'B', values: [5, 2] },
    ]);

    expect(result.maxiMax.value).toBe(5);
    expect(result.maxiMax.strategyIndices).toEqual([0, 1]);
    expect(result.maxiMin.value).toBe(2);
    expect(result.maxiMin.strategyIndices).toEqual([1]);
  });
});
