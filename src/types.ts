export interface LandingPageSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroShowDemo?: boolean;
  heroGradient?: string;
  backgroundColor?: string;
  heroImageUrl?: string;
  showcaseImageUrl?: string;
  features: Array<{
    title: string;
    description: string;
    icon: string;
    color: string;
  }>;
  showcaseTitle: string;
  showcaseDescription: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonText: string;
}

export interface CustomAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
}

export interface AppSettings {
  appName: string;
  logoUrl?: string;
  primaryFont?: string;
  fontSize?: 'small' | 'medium' | 'large';
  primaryIconSet?: string;
  landingPage?: LandingPageSettings;
  customActions?: CustomAction[];
}

export interface UserProfile {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
  businessName?: string;
  logoUrl?: string; // App dashboard logo for the business
  photoURL: string;
  role?: 'admin' | 'user';
  bankBalance: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: any;
}

export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface LoanTable {
  id: string;
  userId: string;
  title: string;
  frequency: PaymentFrequency;
  interestRate: number;
  installments: number; // e.g. 6 (quincenas)
  rows: Array<{
    amount: number;
    installmentAmount: number;
    totalAmount: number;
  }>;
  createdAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  customerId?: string;
  borrowerName: string;
  amount: number;
  interestRate: number; // interest rate (percentage)
  termMonths: number; // can be replaced by total installments in logic
  installments: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;
  status: 'active' | 'paid' | 'defaulted';
  totalPayable: number;
  installmentAmount: number;
  remainingBalance: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  loanId: string;
  userId: string;
  amount: number;
  paymentDate: string;
  installmentNumber: number;
  notes?: string;
}

export interface DashboardStats {
  totalLent: number;
  totalCollected: number;
  projectedInterest: number;
  pendingBalance: number;
  bankBalance: number; // This would ideally be a user setting or tracked separately
}
