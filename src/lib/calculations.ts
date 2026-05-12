import { PaymentFrequency } from '../types';

export function calculateInstallmentSimple(principal: number, periodRate: number, installments: number): number {
  if (installments === 0) return 0;
  const interestPerPeriod = principal * (periodRate / 100);
  const principalPerPeriod = principal / installments;
  return Number((principalPerPeriod + interestPerPeriod).toFixed(2));
}

/**
 * Calculates installment using French Amortization system based on frequency
 */
export function calculateInstallment(principal: number, annualRate: number, installments: number, frequency: PaymentFrequency): number {
  let periodRate: number;
  
  switch(frequency) {
    case 'weekly':
      periodRate = (annualRate / 100) / 52;
      break;
    case 'biweekly':
      periodRate = (annualRate / 100) / 26;
      break;
    case 'monthly':
    default:
      periodRate = (annualRate / 100) / 12;
      break;
  }

  if (periodRate === 0) return principal / installments;
  
  const installment = principal * (periodRate * Math.pow(1 + periodRate, installments)) / (Math.pow(1 + periodRate, installments) - 1);
  return Number(installment.toFixed(2));
}

export function calculateTotalPayable(installment: number, installments: number): number {
  return Number((installment * installments).toFixed(2));
}

export function calculateProjectedInterest(totalPayable: number, principal: number): number {
  return Number((totalPayable - principal).toFixed(2));
}
