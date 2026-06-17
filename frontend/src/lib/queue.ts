export interface QueueInputs {
  arrivalRate: number;  // λ — average arrivals per time unit
  serviceRate: number;  // μ — service rate per server per time unit
  servers: number;      // s — number of servers (positive integer)
}

export interface QueueResult {
  utilization: number; // ρ = λ / (s × μ)
  p0: number;          // probability the system is empty
  lq: number;          // avg customers waiting in queue
  l: number;           // avg customers in system (queue + service)
  wq: number;          // avg waiting time in queue  (= Lq / λ)
  w: number;           // avg time in system         (= L  / λ)
}

export type QueueValidationError = 'unstable' | 'invalid_servers';

export function validateQueue(inputs: QueueInputs): QueueValidationError | null {
  if (!Number.isInteger(inputs.servers) || inputs.servers < 1) return 'invalid_servers';
  if (inputs.servers * inputs.serviceRate <= inputs.arrivalRate) return 'unstable';
  return null;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function calculateQueue(inputs: QueueInputs): QueueResult {
  const { arrivalRate: lambda, serviceRate: mu, servers: s } = inputs;

  const r   = lambda / mu;   // offered load per server
  const rho = r / s;         // server utilisation

  // P₀ = 1 / [ Σ_{n=0}^{s-1} rⁿ/n! + rˢ / (s! · (1−ρ)) ]
  let sum = 0;
  for (let n = 0; n < s; n++) sum += Math.pow(r, n) / factorial(n);
  const p0 = 1 / (sum + Math.pow(r, s) / (factorial(s) * (1 - rho)));

  // Lq = P₀ · rˢ · ρ / (s! · (1−ρ)²)
  const lq = (p0 * Math.pow(r, s) * rho) / (factorial(s) * Math.pow(1 - rho, 2));

  const l  = lq + r;
  const wq = lq / lambda;
  const w  = l  / lambda;

  return { utilization: rho, p0, lq, l, wq, w };
}
