import * as XLSX from 'xlsx';
import { Loan, Payment } from '../types';
import { formatCurrency, formatDate } from './utils';
import { db } from './firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export async function exportToExcel(loans: Loan[], businessName: string) {
  const workbook = XLSX.utils.book_new();

  // 1. Loans Sheet
  const loansData = loans.map(l => ({
    'Nombre Prestatario': l.borrowerName,
    'Monto Prestado': l.amount,
    'Tasa Anual (%)': l.interestRate,
    'Frecuencia': l.paymentFrequency === 'weekly' ? 'Semanal' : l.paymentFrequency === 'biweekly' ? 'Quincenal' : 'Mensual',
    'Cuotas': l.installments,
    'Monto Cuota': l.installmentAmount,
    'Total a Pagar': l.totalPayable,
    'Balance Pendiente': l.remainingBalance,
    'Estado': l.status === 'active' ? 'Activo' : l.status === 'paid' ? 'Pagado' : 'Mora',
    'Fecha Inicio': formatDate(l.startDate)
  }));

  const loansSheet = XLSX.utils.json_to_sheet(loansData);
  XLSX.utils.book_append_sheet(workbook, loansSheet, 'Préstamos');

  // 2. Payments Sheet (Consolidated)
  const allPayments: any[] = [];

  for (const loan of loans) {
    const pSnap = await getDocs(query(collection(db, `loans/${loan.id}/payments`), orderBy('paymentDate', 'asc')));
    pSnap.docs.forEach(doc => {
      const p = doc.data() as Payment;
      allPayments.push({
        'Prestatario': loan.borrowerName,
        'ID Préstamo': loan.id,
        'Monto Pago': p.amount,
        'Fecha Pago': formatDate(p.paymentDate),
        'Cuota #': p.installmentNumber,
        'Notas': p.notes || ''
      });
    });
  }

  if (allPayments.length > 0) {
    const paymentsSheet = XLSX.utils.json_to_sheet(allPayments);
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Pagos');
  }

  // 3. Save File
  const fileName = `${businessName || 'RAE_Marketing'}_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
