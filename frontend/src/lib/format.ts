/** Format a number to 2 decimal places (NFR-04). */
export const fmt2 = (n: number): string => n.toFixed(2);

/** Format a number as a USD dollar amount to 2 decimal places. */
export const fmtUSD = (n: number): string => `$${n.toFixed(2)}`;

/** Format a 0–1 ratio as a percentage to 2 decimal places. */
export const fmtPct = (n: number): string => `${(n * 100).toFixed(2)}%`;
