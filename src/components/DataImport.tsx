import React, { useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { 
  FileUp, 
  FileSpreadsheet, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface DataImportProps {
  darkMode: boolean;
  onImportComplete: () => void;
}

export default function DataImport({ darkMode, onImportComplete }: DataImportProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setStatus(null);

    try {
      if (!isSupabaseEnabled) {
        throw new Error('Supabase no está configurado. Por favor contacta al administrador.');
      }

      const user = auth.currentUser;
      if (!user) throw new Error('Debes estar autenticado para importar datos.');

      const extension = file.name.split('.').pop()?.toLowerCase();
      let customers: any[] = [];
      let loans: any[] = [];

      if (extension === 'csv') {
        const text = await file.text();
        const results = Papa.parse(text, { header: true });
        customers = results.data;
      } else if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        customers = XLSX.utils.sheet_to_json(firstSheet);
      } else if (['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'].includes(extension || '')) {
        // Use backend API to extract structured data 
        setStatus({ type: 'success', text: 'Analizando archivo con IA...' });
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mimeType: file.type || "application/pdf" })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error en el análisis de IA.');
        }

        const extracted = await response.json();
        if (extracted.customers) {
          customers = extracted.customers;
          loans = extracted.loans || [];
        } else {
          customers = Array.isArray(extracted) ? extracted : [extracted];
        }
      } else {
        throw new Error('Formato de archivo no soportado.');
      }

      if (customers.length === 0 && loans.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo.');
      }

      // Process Customers
      const processedCustomers = customers.map(c => ({
        userId: user.uid,
        name: c.name || c.nombre || 'Sin nombre',
        idNumber: c.idNumber || c.id_number || c.documento || '',
        phone: c.phone || c.telefono || '',
        email: c.email || c.correo || '',
        address: c.address || c.direccion || '',
        createdAt: new Date().toISOString()
      }));

      // 1. Sync Customers to Firestore
      const customerIdMap: Record<string, string> = {};
      for (const cust of processedCustomers) {
        const docRef = await addDoc(collection(db, 'customers'), {
          ...cust,
          createdAt: serverTimestamp()
        });
        customerIdMap[cust.name] = docRef.id;
      }

      // 2. Sync Customers to Supabase
      if (isSupabaseEnabled) {
        const { error: sbCustError } = await supabase
          .from('clients')
          .insert(processedCustomers.map(c => ({
            ...c,
            id_number: c.idNumber,
            created_at: c.createdAt
          })));
        if (sbCustError) console.warn("Supabase clients Error:", sbCustError);
      }

      // 3. Process and Sync Loans
      if (loans.length > 0) {
        const processedLoans = loans.map(l => {
          const amount = Number(l.amount) || 0;
          const interestRate = Number(l.interestRate) || 0;
          const termMonths = Number(l.termMonths) || 12;
          const totalPayable = amount + (amount * (interestRate / 100) * termMonths);
          
          return {
            userId: user.uid,
            customerId: customerIdMap[l.borrowerName] || null,
            borrowerName: l.borrowerName,
            amount,
            interestRate,
            termMonths,
            startDate: l.startDate || new Date().toISOString().split('T')[0],
            status: l.status || 'active',
            totalPayable,
            monthlyInstallment: totalPayable / termMonths,
            remainingBalance: totalPayable,
            createdAt: new Date().toISOString()
          };
        });

        // Firestore Loans
        for (const loan of processedLoans) {
          await addDoc(collection(db, 'loans'), {
            ...loan,
            createdAt: serverTimestamp()
          });
        }

        // Supabase Loans
        if (isSupabaseEnabled) {
          const { error: sbLoanError } = await supabase
            .from('loans')
            .insert(processedLoans.map(l => ({
              ...l,
              customer_id: l.customerId,
              borrower_name: l.borrowerName,
              interest_rate: l.interestRate,
              term_months: l.termMonths,
              start_date: l.startDate,
              total_payable: l.totalPayable,
              monthly_installment: l.monthlyInstallment,
              remaining_balance: l.remainingBalance,
              created_at: l.createdAt
            })));
          if (sbLoanError) console.warn("Supabase loans Error:", sbLoanError);
        }
      }

      setStatus({ 
        type: 'success', 
        text: `¡Éxito! Se importaron ${processedCustomers.length} clientes y ${loans.length} préstamos.` 
      });
      onImportComplete();
    } catch (err: any) {
      console.error("Import Error:", err);
      setStatus({ type: 'error', text: err.message || 'Error al importar datos.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className={cn(
      "p-6 rounded-3xl border",
      darkMode ? "bg-black/20 border-white/5" : "bg-white border-gray-100"
    )}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-rae-blue-500/10 text-rae-blue-500">
          <FileUp className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold">Importar Base de Datos</h4>
          <p className="text-xs text-gray-500">XLS, CSV, PDF, DOC o Imagen</p>
        </div>
      </div>

      {status && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={cn(
            "mb-4 p-3 rounded-xl text-sm flex items-center gap-2",
            status.type === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}
        >
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{status.text}</span>
          <button onClick={() => setStatus(null)} className="ml-auto p-1 hover:bg-black/10 rounded-full">
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      <label className={cn(
        "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
        loading ? "opacity-50 cursor-not-allowed" : "hover:border-rae-blue-500/50 hover:bg-rae-blue-500/5",
        darkMode ? "border-white/10" : "border-gray-200"
      )}>
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {loading ? (
            <Loader2 className="w-8 h-8 text-rae-blue-500 animate-spin" />
          ) : (
            <>
              <div className="flex gap-2 mb-2 text-gray-400">
                <FileSpreadsheet className="w-6 h-6" />
                <FileText className="w-6 h-6" />
              </div>
              <p className="mb-1 text-sm font-bold">Haz clic para subir</p>
              <p className="text-xs text-gray-400">o arrastra y suelta aquí</p>
            </>
          )}
        </div>
        <input 
          disabled={loading}
          type="file" 
          className="hidden" 
          accept=".csv,.xls,.xlsx,.pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
