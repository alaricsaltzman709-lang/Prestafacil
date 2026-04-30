import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Loan } from '../types';
import { cn } from '../lib/utils';

export default function Charts({ loans, darkMode }: { loans: Loan[], darkMode: boolean }) {
  const chartData = useMemo(() => {
    const monthly = loans.reduce((acc: any, loan) => {
      const month = new Date(loan.startDate).toLocaleString('es-ES', { month: 'short' });
      acc[month] = (acc[month] || 0) + loan.amount;
      return acc;
    }, {});

    return Object.entries(monthly).map(([name, amount]) => ({ name, amount }));
  }, [loans]);

  const pieData = useMemo(() => {
    const statusCount = loans.reduce((acc: any, loan) => {
      acc[loan.status] = (acc[loan.status] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: 'Activos', value: statusCount.active || 0, color: '#1a237e' },
      { name: 'Pagados', value: statusCount.paid || 0, color: '#10b981' },
      { name: 'En Mora', value: statusCount.defaulted || 0, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [loans]);

  return (
    <>
      <div className={cn(
        "p-6 rounded-3xl border",
        darkMode ? "bg-[#111111] border-white/5" : "bg-white border-gray-100 shadow-sm"
      )}>
        <h3 className="text-lg font-bold mb-6">Desembolsos Mensuales</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis 
                dataKey="name" 
                stroke={darkMode ? "#4b5563" : "#9ca3af"} 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke={darkMode ? "#4b5563" : "#9ca3af"} 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: darkMode ? '#1f2937' : '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  color: darkMode ? '#fff' : '#000'
                }}
              />
              <Bar 
                dataKey="amount" 
                fill="#1a237e" 
                radius={[6, 6, 0, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cn(
        "p-6 rounded-3xl border",
        darkMode ? "bg-[#111111] border-white/5" : "bg-white border-gray-100 shadow-sm"
      )}>
        <h3 className="text-lg font-bold mb-6">Estado de Préstamos</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: darkMode ? '#1f2937' : '#fff',
                  border: 'none',
                  borderRadius: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-gray-500">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
