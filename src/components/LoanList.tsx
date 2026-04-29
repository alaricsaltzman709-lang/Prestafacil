import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ChevronRight, 
  User, 
  Calendar, 
  Clock, 
  Banknote,
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Loan } from '../types';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import PaymentModal from './PaymentModal';

export default function LoanList({ loans, darkMode }: { loans: Loan[], darkMode: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const filteredLoans = loans.filter(l => 
    l.borrowerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input 
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={cn(
            "w-full pl-12 pr-4 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
            darkMode ? "bg-[#111111] border-white/5 text-white" : "bg-white border-gray-200"
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredLoans.map((loan, index) => (
          <motion.div
            key={loan.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedLoan(loan)}
            className={cn(
              "group p-5 rounded-3xl border cursor-pointer hover:scale-[1.01] transition-all duration-300",
              darkMode ? "bg-[#111111] border-white/5 hover:border-white/10" : "bg-white border-gray-100 shadow-sm"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{loan.borrowerName}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Banknote className="w-3 h-3" />
                      {formatCurrency(loan.amount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(loan.startDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden md:block text-right">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Pendiente</p>
                  <p className="font-bold text-indigo-500">{formatCurrency(loan.remainingBalance)}</p>
                </div>
                
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                  loan.status === 'active' && (darkMode ? "bg-indigo-500/10 text-indigo-500" : "bg-indigo-50 text-indigo-600"),
                  loan.status === 'paid' && (darkMode ? "bg-emerald-500/10 text-emerald-500" : "bg-emerald-50 text-emerald-600"),
                  loan.status === 'defaulted' && (darkMode ? "bg-rose-500/10 text-rose-500" : "bg-rose-50 text-rose-600"),
                )}>
                  {loan.status === 'active' && <Clock className="w-3 h-3" />}
                  {loan.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                  {loan.status === 'defaulted' && <AlertCircle className="w-3 h-3" />}
                  {loan.status === 'active' ? 'Activo' : loan.status === 'paid' ? 'Pagado' : 'Mora'}
                </div>

                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedLoan && (
          <PaymentModal 
            loan={selectedLoan} 
            onClose={() => setSelectedLoan(null)}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
