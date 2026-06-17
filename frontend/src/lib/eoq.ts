export interface EoqInputs {
  demand: number;      // D — annual demand (units/year)
  orderingCost: number; // S — cost per order ($)
  unitCost: number;    // C — cost per unit ($)
  holdingRate: number; // I — annual holding cost rate as decimal (e.g. 0.20 = 20%)
}

export interface EoqResult {
  eoq: number;            // √(2DS / IC)
  ordersPerYear: number;  // D / EOQ
  cycleDays: number;      // (EOQ / D) × 365
  totalAnnualCost: number; // (D/EOQ × S) + (EOQ/2 × I × C)
}

export function calculateEoq(inputs: EoqInputs): EoqResult {
  const { demand, orderingCost, unitCost, holdingRate } = inputs;
  const eoq = Math.sqrt((2 * demand * orderingCost) / (holdingRate * unitCost));
  const ordersPerYear = demand / eoq;
  const cycleDays = (eoq / demand) * 365;
  const totalAnnualCost = ordersPerYear * orderingCost + (eoq / 2) * holdingRate * unitCost;
  return { eoq, ordersPerYear, cycleDays, totalAnnualCost };
}
