import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CircleDollarSign,
  Landmark,
  Pencil,
  X,
  Check
} from 'lucide-react';
import { DashboardStats } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function KPICards({ stats, darkMode, userId }: { stats: DashboardStats, darkMode: boolean, userId: string }) {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState(stats.bankBalance.toString());
  const [loading, setLoading] = useState(false);

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        bankBalance: Number(newBalance)
      });
      setIsEditingBalance(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Capital Prestado',
      value: formatCurrency(stats.totalLent),
      icon: <HandCoins className="w-6 h-6" />,
      color: 'indigo',
      trend: '+12%',
      isUp: true
    },
    {
      title: 'Balance Pendiente',
      value: formatCurrency(stats.pendingBalance),
      icon: <Wallet className="w-6 h-6" />,
      color: 'amber',
      trend: '-5%',
      isUp: false
    },
    {
      title: 'Interés Proyectado',
      value: formatCurrency(stats.projectedInterest),
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'emerald',
      trend: '+8%',
      isUp: true
    },
    {
      title: 'Balance Bancario',
      value: formatCurrency(stats.bankBalance),
      icon: <Landmark className="w-6 h-6" />,
      color: 'purple',
      trend: '0%',
      isUp: true,
      editable: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "p-6 rounded-3xl border transition-all duration-300 relative group",
            darkMode 
              ? "bg-[#111111] border-white/5 hover:border-white/10" 
              : "bg-white border-gray-100 shadow-sm hover:shadow-md"
          )}
        >
          {card.editable && !isEditingBalance && (
            <button 
              onClick={() => {
                setNewBalance(stats.bankBalance.toString());
                setIsEditingBalance(true);
              }}
              className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 rounded-lg text-gray-400 hover:text-indigo-500"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              card.color === 'indigo' && "bg-indigo-500/10 text-indigo-500",
              card.color === 'amber' && "bg-amber-500/10 text-amber-500",
              card.color === 'emerald' && "bg-emerald-500/10 text-emerald-500",
              card.color === 'purple' && "bg-purple-500/10 text-purple-500",
            )}>
              {card.icon}
            </div>
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              card.isUp 
                ? (darkMode ? "bg-emerald-500/10 text-emerald-500" : "bg-emerald-50 text-emerald-600")
                : (darkMode ? "bg-rose-500/10 text-rose-500" : "bg-rose-50 text-rose-600")
            )}>
              {card.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {card.trend}
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium mb-1">{card.title}</p>
          
          {card.editable && isEditingBalance ? (
            <form onSubmit={handleUpdateBalance} className="mt-2 flex items-center gap-2">
              <input 
                autoFocus
                type="number"
                value={newBalance}
                onChange={e => setNewBalance(e.target.value)}
                className={cn(
                  "w-full px-3 py-1 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold font-mono",
                  darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                )}
              />
              <button 
                type="submit"
                disabled={loading}
                className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20"
              >
                <Check className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => setIsEditingBalance(false)}
                className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <h3 className="text-2xl font-bold tracking-tight">{card.value}</h3>
          )}
        </motion.div>
      ))}
    </div>
  );
}

import { HandCoins } from 'lucide-react';
