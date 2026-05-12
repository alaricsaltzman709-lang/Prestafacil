import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Save, Trash2, Calculator, ArrowRight, Table, Business, Briefcase, Phone, Mail } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { calculateInstallmentSimple } from '../lib/calculations';
import { cn, formatCurrency } from '../lib/utils';
import { LoanTable, PaymentFrequency, UserProfile } from '../types';

export default function LoanTableCreator({ onClose, darkMode, userId, profile }: { onClose: () => void, darkMode: boolean, userId: string, profile: UserProfile | null }) {
  const [formData, setFormData] = useState({
    title: '',
    frequency: 'biweekly' as PaymentFrequency,
    rate: '5',
    installments: '6',
    amounts: '5000, 7000, 10000, 12000, 15000, 20000'
  });

  const [tables, setTables] = useState<LoanTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const q = query(collection(db, 'loan_tables'), where('userId', '==', userId));
        const snap = await getDocs(q);
        setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LoanTable[]);
      } catch (error) {
        console.error("Error fetching tables:", error);
      }
    };
    fetchTables();
  }, [userId]);

  const generatePreviewRows = () => {
    const amountsArray = formData.amounts.split(',').map(a => Number(a.trim())).filter(a => !isNaN(a) && a > 0);
    const rate = Number(formData.rate);
    const instCount = Number(formData.installments);
    
    return amountsArray.map(amount => {
      const installmentAmount = calculateInstallmentSimple(amount, rate, instCount);
      return {
        amount,
        installmentAmount,
        totalAmount: installmentAmount * instCount
      };
    });
  };

  const previewRows = generatePreviewRows();

  const handleSave = async () => {
    if (!formData.title) {
        alert("Por favor ingresa un título para la tabla");
        return;
    }
    setLoading(true);
    try {
      const newTable: Omit<LoanTable, 'id'> = {
        userId,
        title: formData.title,
        frequency: formData.frequency,
        interestRate: Number(formData.rate),
        installments: Number(formData.installments),
        rows: previewRows,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'loan_tables'), {
          ...newTable,
          createdAt: serverTimestamp()
      });
      setTables([{ id: docRef.id, ...newTable } as LoanTable, ...tables]);
      setActiveTab('list');
      setFormData({
        title: '',
        frequency: 'biweekly',
        rate: '5',
        installments: '6',
        amounts: '5000, 7000, 10000, 12000, 15000, 20000'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'loan_tables');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta tabla?")) return;
    try {
      await deleteDoc(doc(db, 'loan_tables', id));
      setTables(tables.filter(t => t.id !== id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `loan_tables/${id}`);
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
          "relative w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col",
          darkMode ? "bg-[#0a0a0a] text-white" : "bg-white text-gray-900"
        )}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rae-blue-500/10 flex items-center justify-center text-rae-blue-500">
               <Table className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Tablas de Préstamos</h3>
          </div>
          <div className="flex bg-white/5 p-1 rounded-xl">
             <button 
                onClick={() => setActiveTab('create')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'create' ? "bg-rae-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white")}
             >
                Crear Nueva
             </button>
             <button 
                onClick={() => setActiveTab('list')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'list' ? "bg-rae-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white")}
             >
                Mis Tablas ({tables.length})
             </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'create' ? (
              <motion.div 
                key="create"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Editor Side */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-gray-500">Título de la Tabla</label>
                       <input 
                          type="text"
                          placeholder="Ej. Préstamos Quincenales - 6 Quincenas"
                          value={formData.title}
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rae-blue-500 outline-none", darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-500">Frecuencia</label>
                            <select 
                                value={formData.frequency}
                                onChange={e => setFormData({...formData, frequency: e.target.value as PaymentFrequency})}
                                className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rae-blue-500 outline-none", darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}
                            >
                                <option value="weekly">Semanal</option>
                                <option value="biweekly">Quincenal</option>
                                <option value="monthly">Mensual</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-500">Tasa por Período (%)</label>
                            <input 
                                type="number"
                                value={formData.rate}
                                onChange={e => setFormData({...formData, rate: e.target.value})}
                                className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rae-blue-500 outline-none", darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-500">Cant. Cuotas</label>
                            <input 
                                type="number"
                                value={formData.installments}
                                onChange={e => setFormData({...formData, installments: e.target.value})}
                                className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rae-blue-500 outline-none", darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-gray-500">Montos (Separados por coma)</label>
                        <textarea 
                            rows={3}
                            value={formData.amounts}
                            onChange={e => setFormData({...formData, amounts: e.target.value})}
                            className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rae-blue-500 outline-none resize-none", darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}
                            placeholder="5000, 7000, 10000..."
                        />
                    </div>
                  </div>

                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full py-4 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-rae-blue-900/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Guardando...' : 'Guardar Tabla'}
                  </button>
                </div>

                {/* Preview Side */}
                <div className="space-y-6">
                    <div className={cn("p-8 rounded-[2.5rem] border shadow-2xl overflow-hidden", darkMode ? "bg-[#111111] border-white/10" : "bg-white border-gray-200")}>
                        {/* Header Image/Info */}
                        <div className="flex flex-col items-center text-center space-y-4 mb-8">
                            {profile?.logoUrl ? (
                                <img src={profile.logoUrl} alt="Logo" className="h-20 object-contain" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-rae-blue-600 flex items-center justify-center text-white text-xl font-bold italic">CjR</div>
                            )}
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black text-[#B8860B] uppercase tracking-tighter">
                                    {profile?.businessName || 'Empresa Préstamos'}
                                </h1>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Crecemos contigo, paso a paso, con propósito.</p>
                            </div>
                        </div>

                        <h2 className="text-[#DAA520] text-center font-bold text-xl mb-6 uppercase tracking-tight">
                            {formData.title || 'Título de la Tabla'}
                        </h2>

                        <div className="overflow-hidden rounded-2xl border border-[#DAA520]/30 shadow-lg">
                            <table className="w-full text-left">
                                <thead className="bg-[#DAA520] text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-sm font-black uppercase">Monto</th>
                                        <th className="px-4 py-3 text-sm font-black uppercase">Duración</th>
                                        <th className="px-4 py-3 text-sm font-black uppercase">Cuota {formData.frequency === 'weekly' ? 'Semanal' : formData.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewRows.map((row, idx) => (
                                        <tr key={idx} className={cn(darkMode ? "border-[#DAA520]/10" : "border-gray-100", "border-b last:border-0", idx % 2 === 0 ? (darkMode ? "bg-white/5" : "bg-gray-50") : "")}>
                                            <td className="px-4 py-3 font-bold text-sm">RD$ {row.amount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 italic">{formData.installments} {formData.frequency === 'weekly' ? 'semanas' : formData.frequency === 'biweekly' ? 'quincenas' : 'meses'}</td>
                                            <td className="px-4 py-3 font-black text-sm text-[#B8860B]">RD${row.installmentAmount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 text-center space-y-4">
                            <p className="text-[11px] font-bold text-gray-500 leading-relaxed uppercase">
                                Tiempo y forma de pago de los préstamos pueden variar a preferencia del cliente.
                            </p>
                            <div className="pt-4 border-t border-gray-100 mt-4 flex flex-col items-center">
                                <p className="text-[10px] font-bold opacity-60 uppercase">Escríbenos {profile?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {tables.length === 0 ? (
                    <div className="col-span-full py-20 text-center space-y-4">
                         <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-500">
                             <Table className="w-8 h-8" />
                         </div>
                         <p className="text-gray-500 font-medium">Aún no has creado ninguna tabla de pagos.</p>
                         <button 
                            onClick={() => setActiveTab('create')}
                            className="px-6 py-2 bg-rae-blue-600 text-white rounded-xl font-bold hover:bg-rae-blue-700 transition-colors"
                         >
                            Crear mi primera tabla
                         </button>
                    </div>
                ) : (
                    tables.map(table => (
                        <div key={table.id} className={cn("group p-6 rounded-[2rem] border relative overflow-hidden transition-all hover:scale-[1.02]", darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm")}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-rae-blue-500/10 flex items-center justify-center text-rae-blue-500">
                                    <Table className="w-5 h-5" />
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(table.id);
                                    }}
                                    className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/10 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <h4 className="font-bold text-lg mb-1 truncate">{table.title}</h4>
                            <p className="text-xs text-gray-500 mb-4">{table.rows.length} montos calculados</p>
                            
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                <span className="px-2 py-1 bg-white/5 rounded-lg">{table.interestRate}% Tasa</span>
                                <span className="px-2 py-1 bg-white/5 rounded-lg">{table.frequency}</span>
                            </div>

                            <button
                                onClick={() => {
                                    // I could add a full view here
                                    alert("ID de tabla copiado al portapapeles (Simulado)");
                                }}
                                className="mt-6 w-full py-3 bg-rae-blue-500/10 text-rae-blue-500 rounded-xl font-bold hover:bg-rae-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                Ver Detalle
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
