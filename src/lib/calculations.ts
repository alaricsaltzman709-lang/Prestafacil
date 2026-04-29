/**
 * Calculates monthly installment using French Amortization system
 * Monthly Payment (A) = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyInstallment(principal: number, annualRate: number, termMonths: number): number {
  const r = (annualRate / 100) / 12;
  if (r === 0) return principal / termMonths;
  const n = termMonths;
  
  const installment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Number(installment.toFixed(2));
}

export function calculateTotalPayable(installment: number, termMonths: number): number {
  return Number((installment * termMonths).toFixed(2));
}

export function calculateProjectedInterest(totalPayable: number, principal: number): number {
  return Number((totalPayable - principal).toFixed(2));
}
