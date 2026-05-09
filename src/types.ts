export interface AppSettings {
  appName: string;
  logoUrl?: string;
  primaryFont?: string;
  fontSize?: 'small' | 'medium' | 'large';
  primaryIconSet?: string;
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

export interface Loan {
  id: string;
  userId: string;
  customerId?: string;
  borrowerName: string;
  amount: number;
  interestRate: number; // monthly interest rate (percentage)
  termMonths: number;
  startDate: string;
  status: 'active' | 'paid' | 'defaulted';
  totalPayable: number;
  monthlyInstallment: number;
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
