import { calculateEoq } from '@/lib/eoq';

describe('calculateEoq', () => {
  // TC-02-U01 — spec stated cycle=81.65 days; correct value is 81.62 (spec rounding error)
  it('returns correct EOQ and metrics for standard inputs', () => {
    const result = calculateEoq({ demand: 1000, orderingCost: 50, unitCost: 10, holdingRate: 0.2 });

    expect(result.eoq).toBeCloseTo(223.61, 1);
    expect(result.ordersPerYear).toBeCloseTo(4.47, 1);
    expect(result.cycleDays).toBeCloseTo(81.62, 1);
    expect(result.totalAnnualCost).toBeCloseTo(447.21, 1);
  });

  // TC-02-U02
  it('produces larger EOQ when ordering cost is high and holding rate is low', () => {
    const result = calculateEoq({ demand: 500, orderingCost: 100, unitCost: 5, holdingRate: 0.1 });

    expect(result.eoq).toBeCloseTo(447.21, 1);
  });

  // TC-02-U03
  it('returns √2 when all inputs equal 1', () => {
    const result = calculateEoq({ demand: 1, orderingCost: 1, unitCost: 1, holdingRate: 1 });

    expect(result.eoq).toBeCloseTo(Math.sqrt(2), 9);
  });

  it('total annual cost equals ordering cost plus holding cost', () => {
    const inputs = { demand: 1000, orderingCost: 50, unitCost: 10, holdingRate: 0.2 };
    const result = calculateEoq(inputs);

    const orderingCost = result.ordersPerYear * inputs.orderingCost;
    const holdingCost  = (result.eoq / 2) * inputs.holdingRate * inputs.unitCost;
    expect(result.totalAnnualCost).toBeCloseTo(orderingCost + holdingCost, 9);
  });

  it('cycle time in days equals EOQ / demand × 365', () => {
    const inputs = { demand: 1000, orderingCost: 50, unitCost: 10, holdingRate: 0.2 };
    const result = calculateEoq(inputs);

    expect(result.cycleDays).toBeCloseTo((result.eoq / inputs.demand) * 365, 9);
  });
});
