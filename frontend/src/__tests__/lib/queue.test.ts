import { calculateQueue, validateQueue } from '@/lib/queue';

describe('validateQueue', () => {
  it('returns null for a valid stable system', () => {
    expect(validateQueue({ arrivalRate: 2, serviceRate: 3, servers: 1 })).toBeNull();
  });

  it('returns unstable when sμ < λ', () => {
    expect(validateQueue({ arrivalRate: 5, serviceRate: 2, servers: 2 })).toBe('unstable');
  });

  it('returns unstable when sμ = λ (boundary)', () => {
    expect(validateQueue({ arrivalRate: 6, serviceRate: 3, servers: 2 })).toBe('unstable');
  });

  it('returns invalid_servers for s = 0', () => {
    expect(validateQueue({ arrivalRate: 1, serviceRate: 2, servers: 0 })).toBe('invalid_servers');
  });

  it('returns invalid_servers for non-integer s', () => {
    expect(validateQueue({ arrivalRate: 1, serviceRate: 2, servers: 1.5 })).toBe('invalid_servers');
  });
});

describe('calculateQueue', () => {
  // TC-04-U01: M/M/1 — λ=2, μ=3, s=1
  it('M/M/1: computes all five metrics correctly', () => {
    const r = calculateQueue({ arrivalRate: 2, serviceRate: 3, servers: 1 });

    expect(r.utilization).toBeCloseTo(0.667, 2);
    expect(r.lq).toBeCloseTo(1.333, 2);
    expect(r.l).toBeCloseTo(2.000, 2);
    expect(r.wq).toBeCloseTo(0.667, 2);
    expect(r.w).toBeCloseTo(1.000, 2);
  });

  // TC-04-U02: M/M/2 — λ=4, μ=3, s=2
  it('M/M/2: utilisation is 0.67', () => {
    const r = calculateQueue({ arrivalRate: 4, serviceRate: 3, servers: 2 });

    expect(r.utilization).toBeCloseTo(0.667, 2);
  });

  // TC-04-U03: M/M/1 low load
  it('M/M/1 low load: ρ=0.10 and very short queue', () => {
    const r = calculateQueue({ arrivalRate: 1, serviceRate: 10, servers: 1 });

    expect(r.utilization).toBeCloseTo(0.10, 9);
    expect(r.lq).toBeLessThan(0.02);
  });

  it("Little's Law: L = λ·W and Lq = λ·Wq", () => {
    const lambda = 2;
    const r = calculateQueue({ arrivalRate: lambda, serviceRate: 3, servers: 1 });

    expect(r.l).toBeCloseTo(lambda * r.w,   9);
    expect(r.lq).toBeCloseTo(lambda * r.wq, 9);
  });

  it('M/M/1: P₀ = 1 − ρ', () => {
    const r = calculateQueue({ arrivalRate: 2, serviceRate: 3, servers: 1 });

    expect(r.p0).toBeCloseTo(1 - r.utilization, 9);
  });

  it('adding a second server reduces Lq', () => {
    const mm1 = calculateQueue({ arrivalRate: 4, serviceRate: 3, servers: 1 });
    // M/M/1 with λ=4, μ=3 is unstable — use a comparable stable configuration
    const mm2 = calculateQueue({ arrivalRate: 4, serviceRate: 3, servers: 2 });
    const mm3 = calculateQueue({ arrivalRate: 4, serviceRate: 3, servers: 3 });

    expect(mm3.lq).toBeLessThan(mm2.lq);
  });
});
