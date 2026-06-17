export interface Strategy {
  label: string;
  values: number[];
}

export interface MatrixGainsResult {
  maxiMax: { value: number; strategyIndices: number[] };
  maxiMin: { value: number; strategyIndices: number[] };
}

export function rowMax(values: number[]): number {
  return Math.max(...values);
}

export function rowMin(values: number[]): number {
  return Math.min(...values);
}

export function calculateMatrixGains(strategies: Strategy[]): MatrixGainsResult {
  const maxima = strategies.map(s => rowMax(s.values));
  const minima = strategies.map(s => rowMin(s.values));

  const bestMaxValue = Math.max(...maxima);
  const bestMinValue = Math.max(...minima);

  return {
    maxiMax: {
      value: bestMaxValue,
      strategyIndices: maxima.reduce<number[]>(
        (acc, m, i) => (m === bestMaxValue ? [...acc, i] : acc),
        []
      ),
    },
    maxiMin: {
      value: bestMinValue,
      strategyIndices: minima.reduce<number[]>(
        (acc, m, i) => (m === bestMinValue ? [...acc, i] : acc),
        []
      ),
    },
  };
}
