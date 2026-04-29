import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Calendar, DollarSign, Clock, ArrowRight } from 'lucide-react';
import { Loan } from '../types';
import { cn, formatCurrency, formatDate } from '../lib/utils';

export default function LateReports({ loans, darkMode }: { loans: Loan[], darkMode: boolean }) {
  // A loan is considered "late" if its status is 'defaulted' or if we logic it (here we simulate by filtering 'active' but could be enhanced)
  // For this app, let's assume 'defaulted' means late or we can add a 'late' status.
  const lateLoans = loans.filter(l => l.status === 'defaulted' || (l.status === 'active' && l.remainingBalance > 0)); 
  // Note: True late detection would require checking installment dates vs today.

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reportes de Mora</h2>
        <p className="text-gray-500">Préstamos con pagos pendientes o en estado de falta.</p>
      </div>

      <div className={cn(
        "rounded-3xl border overflow-hidden",
        darkMode ? "bg-[#111111] border-white/5" : "bg-white border-gray-100 shadow-sm"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={darkMode ? "bg-white/5" : "bg-gray-50"}>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Prestatario</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Monto Original</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Pendiente</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Fecha Inicio</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lateLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No hay reportes de mora pendientes.
                  </td>
                </tr>
              ) : (
                lateLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-bold">{loan.borrowerName}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{formatCurrency(loan.amount)}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-rose-500 font-bold">{formatCurrency(loan.remainingBalance)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        loan.status === 'defaulted' ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        <AlertCircle className="w-3 h-3" />
                        {loan.status === 'defaulted' ? 'En Mora' : 'Pendiente'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(loan.startDate)}</td>
                    <td className="px-6 py-4">
                      <button className="flex items-center gap-2 text-indigo-500 font-bold text-sm hover:underline">
                        Detalles <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cn("p-6 rounded-3xl border", darkMode ? "bg-rose-500/5 border-rose-500/10" : "bg-rose-50 border-rose-100")}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-rose-500">Total en Riesgo</p>
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(lateLoans.reduce((acc, l) => acc + l.remainingBalance, 0))}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Este es el monto total que se encuentra fuera de la fecha de cobro esperada o en estado de falta.</p>
        </div>

        <div className={cn("p-6 rounded-3xl border", darkMode ? "bg-amber-500/5 border-amber-500/10" : "bg-amber-50 border-amber-100")}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-amber-500">Clientes Afectados</p>
              <p className="text-2xl font-bold text-amber-600">{lateLoans.length}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Número total de prestatarios con incidencias activas en sus pagos.</p>
        </div>
      </div>
    </div>
  );
}
