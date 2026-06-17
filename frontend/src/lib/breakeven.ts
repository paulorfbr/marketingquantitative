export interface BreakevenInputs {
  fixedCosts: number;          // CF — total fixed costs ($)
  variableCostPerUnit: number; // CVu — variable cost per unit ($)
  pricePerUnit: number;        // P — selling price per unit ($)
}

export interface BreakevenResult {
  breakEvenQty: number;       // CF / (P − CVu)
  breakEvenRevenue: number;   // breakEvenQty × P
  contributionMargin: number; // P − CVu ($ per unit)
  marginRatio: number;        // (P − CVu) / P  (0–1)
}

export type BreakevenValidationError = 'price_not_greater_than_variable_cost' | 'negative_fixed_costs';

export function validateBreakeven(inputs: BreakevenInputs): BreakevenValidationError | null {
  if (inputs.fixedCosts < 0) return 'negative_fixed_costs';
  if (inputs.pricePerUnit <= inputs.variableCostPerUnit) return 'price_not_greater_than_variable_cost';
  return null;
}

export function calculateBreakeven(inputs: BreakevenInputs): BreakevenResult {
  const { fixedCosts, variableCostPerUnit, pricePerUnit } = inputs;
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  const breakEvenQty = fixedCosts / contributionMargin;
  const breakEvenRevenue = breakEvenQty * pricePerUnit;
  const marginRatio = contributionMargin / pricePerUnit;
  return { breakEvenQty, breakEvenRevenue, contributionMargin, marginRatio };
}
