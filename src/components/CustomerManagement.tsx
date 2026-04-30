import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Plus, 
  X, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard,
  Trash2,
  Edit2
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { Customer } from '../types';
import { cn } from '../lib/utils';

export default function CustomerManagement({ darkMode, userId }: { darkMode: boolean, userId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'customers'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customers');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          userId,
          createdAt: serverTimestamp()
        });
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      setFormData({ name: '', idNumber: '', phone: '', email: '', address: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.idNumber?.includes(searchTerm) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Clientes</h2>
          <p className="text-gray-500">Administra la base de datos de tus prestatarios.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-rae-blue-900/20"
        >
          <UserPlus className="w-5 h-5" />
          <span>Añadir Cliente</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Buscar por nombre, ID o teléfono..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={cn(
            "w-full pl-12 pr-4 py-3 rounded-2xl border outline-none focus:ring-2 focus:ring-rae-blue-500 transition-all",
            darkMode ? "bg-black/20 border-white/10" : "bg-white border-gray-100 shadow-sm"
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredCustomers.map((customer) => (
            <motion.div
              key={customer.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "p-5 rounded-3xl border group relative",
                darkMode ? "bg-[#111111] border-white/5 hover:border-white/10" : "bg-white border-gray-100 hover:shadow-lg hover:shadow-rae-blue-500/5"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rae-blue-500/10 flex items-center justify-center text-rae-blue-500">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingCustomer(customer);
                      setFormData({
                        name: customer.name,
                        idNumber: customer.idNumber || '',
                        phone: customer.phone || '',
                        email: customer.email || '',
                        address: customer.address || ''
                      });
                      setShowAddModal(true);
                    }}
                    className="p-2 hover:bg-rae-blue-500/10 rounded-lg text-gray-400 hover:text-rae-blue-500 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(customer.id)}
                    className="p-2 hover:bg-rose-500/10 rounded-lg text-gray-400 hover:text-rose-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h4 className="text-lg font-bold mb-1">{customer.name}</h4>
              <div className="space-y-2 text-sm text-gray-500">
                {customer.idNumber && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>{customer.idNumber}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-1">{customer.address}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowAddModal(false);
              setEditingCustomer(null);
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "relative w-full max-w-lg rounded-3xl p-6",
              darkMode ? "bg-[#111111] text-white" : "bg-white text-gray-900"
            )}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCustomer(null);
                }} 
                className="p-2 hover:bg-white/5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Nombre Completo</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Cédula / ID</label>
                  <input 
                    type="text"
                    value={formData.idNumber}
                    onChange={e => setFormData({...formData, idNumber: e.target.value})}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                    placeholder="000-0000000-0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Teléfono</label>
                  <input 
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                    placeholder="809-000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Email</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Dirección</label>
                <textarea 
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                  placeholder="Calle..."
                />
              </div>

              <button 
                disabled={loading}
                className="w-full py-4 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rae-blue-900/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : editingCustomer ? 'Actualizar Cliente' : 'Crear Cliente'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
