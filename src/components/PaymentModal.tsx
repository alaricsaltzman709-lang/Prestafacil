import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, ArrowDownCircle, History, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { Loan, Payment } from '../types';
import { cn, formatCurrency, formatDate } from '../lib/utils';

export default function PaymentModal({ loan, onClose, darkMode }: { loan: Loan, onClose: () => void, darkMode: boolean }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState(loan.monthlyInstallment.toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, `loans/${loan.id}/payments`),
      orderBy('paymentDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `loans/${loan.id}/payments`);
    });

    return () => unsubscribe();
  }, [loan.id]);

  const handleAddPayment = async () => {
    setLoading(true);
    try {
      const paymentAmount = Number(amount);
      const newRemainingBalance = Math.max(0, loan.remainingBalance - paymentAmount);
      const newStatus = newRemainingBalance <= 0 ? 'paid' : 'active';

      // 1. Add payment record
      await addDoc(collection(db, `loans/${loan.id}/payments`), {
        loanId: loan.id,
        userId: loan.userId,
        amount: paymentAmount,
        paymentDate: new Date().toISOString(),
        installmentNumber: payments.length + 1,
        createdAt: serverTimestamp()
      });

      // 2. Update loan balance
      await updateDoc(doc(db, 'loans', loan.id), {
        remainingBalance: newRemainingBalance,
        status: newStatus
      });

      setAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `loans/${loan.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este préstamo?')) {
      try {
        await deleteDoc(doc(db, 'loans', loan.id));
        onClose();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `loans/${loan.id}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          "relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]",
          darkMode ? "bg-[#111111] text-white" : "bg-white text-gray-900"
        )}
      >
        {/* Left: Summary and Action */}
        <div className="p-8 border-b md:border-b-0 md:border-r border-white/5 md:w-1/2 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold">{loan.borrowerName}</h3>
              <p className="text-gray-500 text-sm">Resumen de deuda</p>
            </div>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-white/5 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6 flex-grow">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-1">Balance Pendiente</p>
              <h4 className="text-3xl font-bold text-indigo-500">{formatCurrency(loan.remainingBalance)}</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Cuota</p>
                <p className="font-bold">{formatCurrency(loan.monthlyInstallment)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total</p>
                <p className="font-bold">{formatCurrency(loan.totalPayable)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-bold uppercase">Registrar Cuota</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className={cn("flex-grow px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500", darkMode ? "bg-black/20" : "bg-gray-100")}
                />
                <button 
                  onClick={handleAddPayment}
                  disabled={loading || !amount || loan.remainingBalance === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
                >
                  <ArrowDownCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={handleDeleteLoan}
            className="mt-8 flex items-center justify-center gap-2 text-xs text-rose-500/50 hover:text-rose-500 transition-colors uppercase font-bold tracking-tight"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar Préstamo
          </button>
        </div>

        {/* Right: History */}
        <div className="flex-grow p-8 bg-black/10 overflow-y-auto">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-gray-500" />
            <h4 className="font-bold">Historial de Pagos</h4>
          </div>

          <div className="space-y-4">
            {payments.length === 0 ? (
              <div className="text-center py-10 opacity-30">
                <Banknote className="w-12 h-12 mx-auto mb-2" />
                <p>Sin pagos registrados</p>
              </div>
            ) : (
              payments.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div>
                    <p className="font-bold">{formatCurrency(p.amount)}</p>
                    <p className="text-[10px] text-gray-500">{formatDate(p.paymentDate)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { Banknote } from 'lucide-react';
