import { calculateBreakeven, validateBreakeven } from '@/lib/breakeven';

describe('validateBreakeven', () => {
  it('returns null for valid inputs', () => {
    expect(validateBreakeven({ fixedCosts: 10000, variableCostPerUnit: 5, pricePerUnit: 15 })).toBeNull();
  });

  it('returns error when price equals variable cost', () => {
    expect(validateBreakeven({ fixedCosts: 1000, variableCostPerUnit: 10, pricePerUnit: 10 }))
      .toBe('price_not_greater_than_variable_cost');
  });

  it('returns error when price is below variable cost', () => {
    expect(validateBreakeven({ fixedCosts: 1000, variableCostPerUnit: 12, pricePerUnit: 10 }))
      .toBe('price_not_greater_than_variable_cost');
  });

  it('returns error for negative fixed costs', () => {
    expect(validateBreakeven({ fixedCosts: -1, variableCostPerUnit: 5, pricePerUnit: 10 }))
      .toBe('negative_fixed_costs');
  });

  it('allows zero fixed costs', () => {
    expect(validateBreakeven({ fixedCosts: 0, variableCostPerUnit: 5, pricePerUnit: 10 })).toBeNull();
  });
});

describe('calculateBreakeven', () => {
  // TC-03-U01
  it('returns correct qty and revenue for standard inputs', () => {
    const result = calculateBreakeven({ fixedCosts: 10000, variableCostPerUnit: 5, pricePerUnit: 15 });

    expect(result.breakEvenQty).toBeCloseTo(1000, 9);
    expect(result.breakEvenRevenue).toBeCloseTo(15000, 9);
    expect(result.contributionMargin).toBeCloseTo(10, 9);
  });

  // TC-03-U02
  it('break-even at zero when fixed costs are zero', () => {
    const result = calculateBreakeven({ fixedCosts: 0, variableCostPerUnit: 5, pricePerUnit: 10 });

    expect(result.breakEvenQty).toBe(0);
    expect(result.breakEvenRevenue).toBe(0);
  });

  // TC-03-U03
  it('returns correct result for low-margin scenario', () => {
    const result = calculateBreakeven({ fixedCosts: 5000, variableCostPerUnit: 8, pricePerUnit: 10 });

    expect(result.breakEvenQty).toBeCloseTo(2500, 9);
    expect(result.breakEvenRevenue).toBeCloseTo(25000, 9);
  });

  it('computes margin ratio as contributionMargin / price', () => {
    const result = calculateBreakeven({ fixedCosts: 10000, variableCostPerUnit: 5, pricePerUnit: 15 });

    expect(result.marginRatio).toBeCloseTo(10 / 15, 9);
  });
});
