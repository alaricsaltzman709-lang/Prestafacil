import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Calculator, Info, UserPlus, Users } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { calculateMonthlyInstallment, calculateTotalPayable } from '../lib/calculations';
import { cn, formatCurrency } from '../lib/utils';
import { Customer } from '../types';

export default function LoanForm({ onClose, darkMode, userId }: { onClose: () => void, darkMode: boolean, userId: string }) {
  const [formData, setFormData] = useState({
    customerId: '',
    borrowerName: '',
    amount: '',
    annualRate: '15',
    termMonths: '12',
    startDate: new Date().toISOString().split('T')[0]
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const q = query(collection(db, 'customers'), where('userId', '==', userId));
        const snap = await getDocs(q);
        setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[]);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };
    fetchCustomers();
  }, [userId]);

  const installment = calculateMonthlyInstallment(
    Number(formData.amount) || 0,
    Number(formData.annualRate),
    Number(formData.termMonths)
  );

  const totalPayable = calculateTotalPayable(installment, Number(formData.termMonths));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loanAmount = Number(formData.amount);
      
      // Debit user balance first then create loan
      await updateDoc(doc(db, 'users', userId), {
        bankBalance: increment(-loanAmount)
      });

      await addDoc(collection(db, 'loans'), {
        userId,
        customerId: formData.customerId || null,
        borrowerName: formData.borrowerName,
        amount: loanAmount,
        interestRate: Number(formData.annualRate),
        termMonths: Number(formData.termMonths),
        startDate: formData.startDate,
        status: 'active',
        monthlyInstallment: installment,
        totalPayable: totalPayable,
        remainingBalance: totalPayable,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'loans');
    } finally {
      setLoading(false);
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
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          "relative w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden",
          darkMode ? "bg-[#111111] text-white" : "bg-white text-gray-900"
        )}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold">Nuevo Préstamo</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-gray-400">Seleccionar Cliente (Opcional)</label>
              <div className="flex gap-2">
                <select 
                  value={formData.customerId}
                  onChange={e => {
                    const selected = customers.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData, 
                      customerId: e.target.value,
                      borrowerName: selected ? selected.name : formData.borrowerName
                    });
                  }}
                  className={cn("flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                >
                  <option value="">-- Nuevo Cliente --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-gray-400">Nombre del Prestatario</label>
              <input 
                required
                type="text"
                placeholder="Ej. Juan Pérez"
                value={formData.borrowerName}
                onChange={e => setFormData({...formData, borrowerName: e.target.value})}
                className={cn("w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Monto del Préstamo</label>
              <input 
                required
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className={cn("w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Tasa Anual (%)</label>
              <input 
                required
                type="number"
                value={formData.annualRate}
                onChange={e => setFormData({...formData, annualRate: e.target.value})}
                className={cn("w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Plazo (Meses)</label>
              <input 
                required
                type="number"
                value={formData.termMonths}
                onChange={e => setFormData({...formData, termMonths: e.target.value})}
                className={cn("w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Fecha de Inicio</label>
              <input 
                required
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className={cn("w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
              />
            </div>
          </div>

          <div className={cn("p-4 rounded-2xl flex items-center gap-4", darkMode ? "bg-indigo-500/10" : "bg-indigo-50")}>
            <Calculator className="w-10 h-10 text-indigo-500 shrink-0" />
            <div className="flex-grow">
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Cálculo Estimado</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
                <div>
                  <p className="text-indigo-200 font-bold text-lg">{formatCurrency(installment)}</p>
                  <p className="text-[10px] text-indigo-400">Cuota Mensual</p>
                </div>
                <div className="w-px h-8 bg-indigo-500/20 hidden sm:block" />
                <div>
                  <p className="text-indigo-200 font-bold text-lg">{formatCurrency(totalPayable)}</p>
                  <p className="text-[10px] text-indigo-400">Total a Pagar</p>
                </div>
                <div className="w-px h-8 bg-indigo-500/20 hidden sm:block" />
                <div>
                  <p className="text-emerald-400 font-bold text-lg">
                    {formData.startDate && formData.termMonths ? 
                      new Date(new Date(formData.startDate).setMonth(new Date(formData.startDate).getMonth() + Number(formData.termMonths))).toLocaleDateString('es-DO') 
                      : '--/--/----'
                    }
                  </p>
                  <p className="text-[10px] text-indigo-400">Fecha Finalización</p>
                </div>
              </div>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Crear Préstamo'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
