import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  getDoc,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as AuthSignOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Edit2, 
  Mail, 
  Briefcase, 
  Key,
  X,
  Check,
  Search,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface UserManagementProps {
  darkMode: boolean;
  currentUserId: string;
}

export default function UserManagement({ darkMode, currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
    businessName: '',
    logoUrl: '',
    role: 'user' as 'admin' | 'user'
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingCustomers, setViewingCustomers] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userCustomers, setUserCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const viewUserCustomers = async (user: UserProfile) => {
    setViewingCustomers(user);
    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.uid);
      if (error) throw error;
      setUserCustomers(data || []);
    } catch (err) {
      console.error("Error fetching user customers:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserProfile[];
      setUsers(userData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      // Check if username is unique via mapping collection
      const userMapRef = doc(db, 'usernames', formData.username.toLowerCase());
      const userMapSnap = await getDoc(userMapRef);
      if (userMapSnap.exists()) {
        throw new Error("El nombre de usuario ya está en uso.");
      }

      // Create secondary app instance to create user without logging out current admin
      const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuth');
      const secondaryAuth = getAuth(secondaryApp);

      const result = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      
      if (result.user) {
        const profileData = {
          uid: result.user.uid,
          username: formData.username,
          email: formData.email,
          displayName: formData.displayName,
          businessName: formData.businessName,
          logoUrl: formData.logoUrl,
          role: formData.role,
          password: formData.password, // Store password in DB for admin visibility
          bankBalance: 0,
          createdAt: new Date().toISOString()
        };

        // Firestore sync
        await setDoc(doc(db, 'users', result.user.uid), {
          ...profileData,
          createdAt: serverTimestamp()
        });

        // Create username mapping
        await setDoc(doc(db, 'usernames', formData.username.toLowerCase()), {
          email: formData.email,
          uid: result.user.uid
        });

        // Supabase sync
        const { error: sbError } = await supabase
          .from('users')
          .insert([{ 
            ...profileData,
            logo_url: formData.logoUrl,
            password: formData.password // Storing password in supabase as requested ("cada vez que un usuario cambie su contrasena se actualize en automatico en la tabla de supabase")
          }]);
        
        if (sbError) console.warn("Supabase sync error:", sbError);
      }

      // Cleanup secondary app
      await AuthSignOut(secondaryAuth);
      
      setShowAddModal(false);
      setFormData({ username: '', email: '', password: '', displayName: '', businessName: '', logoUrl: '', role: 'user' });
    } catch (err: any) {
      console.error("Error creating user:", err);
      let msg = err.message || 'Error al crear usuario';
      if (err.code === 'auth/operation-not-allowed') {
        msg = "ERROR: El método de Email/Password no está habilitado en la consola de Firebase.";
      }
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRole = async (user: UserProfile) => {
    if (user.uid === currentUserId) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      
      // Sync to Supabase
      await supabase.from('users').update({ role: newRole }).eq('uid', user.uid);
    } catch (err) {
      console.error("Error toggling role:", err);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    setError(null);

    try {
      // 1. Check if username changed and is unique
      if (formData.username !== editingUser.username) {
        const userMapRef = doc(db, 'usernames', formData.username.toLowerCase());
        const userMapSnap = await getDoc(userMapRef);
        if (userMapSnap.exists()) {
          throw new Error("El nuevo nombre de usuario ya está en uso.");
        }

        // Delete old mapping, create new one
        await deleteDoc(doc(db, 'usernames', editingUser.username.toLowerCase()));
        await setDoc(doc(db, 'usernames', formData.username.toLowerCase()), {
          email: formData.email,
          uid: editingUser.uid
        });
      }

      const updateData = {
        username: formData.username,
        displayName: formData.displayName,
        businessName: formData.businessName,
        logoUrl: formData.logoUrl,
        role: formData.role,
        password: formData.password,
        updatedAt: serverTimestamp()
      };

      // 2. Update Firestore
      await updateDoc(doc(db, 'users', editingUser.uid), updateData);

      // 3. Sync to Supabase
      const { error: sbError } = await supabase
        .from('users')
        .update({
          username: formData.username,
          display_name: formData.displayName,
          business_name: formData.businessName,
          logo_url: formData.logoUrl,
          role: formData.role,
          password: formData.password
        })
        .eq('uid', editingUser.uid);
      
      if (sbError) console.warn("Supabase update error:", sbError);

      setEditingUser(null);
      setFormData({ username: '', email: '', password: '', displayName: '', businessName: '', logoUrl: '', role: 'user' });
    } catch (err: any) {
      console.error("Error updating user:", err);
      setError(err.message || 'Error al actualizar usuario');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (uid === currentUserId) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario? Los datos en Auth no se eliminarán automáticamente, solo el perfil de Firestore.')) return;
    
    try {
      await deleteDoc(doc(db, 'users', uid));
      
      // Supabase sync
      const { error: sbError } = await supabase
        .from('users')
        .delete()
        .eq('uid', uid);
      
      if (sbError) console.warn("Supabase delete sync error:", sbError);
    } catch (err) {
      console.error("Error deleting user profile:", err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">Gestión de Usuarios</h3>
          <p className="text-gray-500">Administra las cuentas y permisos del sistema.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-rae-blue-900/20"
        >
          <UserPlus className="w-5 h-5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Buscar por nombre, email o negocio..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={cn(
            "w-full pl-12 pr-4 py-3 rounded-2xl border outline-none focus:ring-2 focus:ring-rae-blue-500 transition-all",
            darkMode ? "bg-black/20 border-white/10" : "bg-white border-gray-100 shadow-sm"
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredUsers.map((u) => (
            <motion.div
              key={u.uid}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "p-5 rounded-3xl border group relative",
                darkMode ? "bg-[#111111] border-white/5 hover:border-white/10" : "bg-white border-gray-100 hover:shadow-lg hover:shadow-rae-blue-500/5"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden border",
                    u.role === 'admin' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-rae-blue-500/10 text-rae-blue-500 border-rae-blue-500/20"
                  )}>
                    {u.logoUrl ? (
                      <img src={u.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      u.role === 'admin' ? <Shield className="w-6 h-6" /> : <Users className="w-6 h-6" />
                    )}
                  </div>
                  {u.logoUrl && (
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center",
                      u.role === 'admin' ? "bg-amber-500 text-white" : "bg-rae-blue-500 text-white"
                    )}>
                      {u.role === 'admin' ? <Shield className="w-2 h-2" /> : <Users className="w-2 h-2" />}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => viewUserCustomers(u)}
                    title="Ver Clientes"
                    className="p-2 hover:bg-rae-blue-500/10 rounded-lg text-gray-400 hover:text-rae-blue-500 transition-all"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  {u.uid !== currentUserId && (
                    <>
                      <button 
                        onClick={() => {
                          setEditingUser(u);
                          setFormData({
                            username: u.username || '',
                            email: u.email || '',
                            displayName: u.displayName || '',
                            businessName: u.businessName || '',
                            logoUrl: u.logoUrl || '',
                            password: (u as any).password || '',
                            role: u.role as any
                          });
                        }}
                        title="Editar Usuario"
                        className="p-2 hover:bg-rae-blue-500/10 rounded-lg text-gray-400 hover:text-rae-blue-500 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleRole(u)}
                        title="Cambiar Rol"
                        className="p-2 hover:bg-amber-500/10 rounded-lg text-gray-400 hover:text-amber-500 transition-all"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.uid)}
                        title="Eliminar Perfil"
                        className="p-2 hover:bg-rose-500/10 rounded-lg text-gray-400 hover:text-rose-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg mb-1">{u.displayName || 'Sin Nombre'}</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-rae-blue-500 bg-rae-blue-500/10 px-2 py-0.5 rounded text-[10px] uppercase">@{u.username || 'sin-usuario'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="w-4 h-4" />
                    <span>{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Key className="w-4 h-4" />
                    <span className="font-mono blur-[3px] hover:blur-none transition-all cursor-help" title="Click para ver">
                      {(u as any).password || '••••••••'}
                    </span>
                  </div>
                  {u.businessName && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Briefcase className="w-4 h-4" />
                      <span>{u.businessName}</span>
                    </div>
                  )}
                  <div className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    u.role === 'admin' ? "bg-amber-500/10 text-amber-500" : "bg-rae-blue-500/10 text-rae-blue-500"
                  )}>
                    {u.role || 'user'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-lg p-8 rounded-[2.5rem] shadow-2xl border overflow-hidden",
                darkMode ? "bg-[#0f172a] border-white/10" : "bg-white border-gray-100"
              )}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold">Crear Nuevo Usuario</h3>
                  <p className="text-gray-500 text-sm">Ingresa las credenciales del nuevo cliente.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-500/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nombre de Usuario</label>
                  <input 
                    required
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                    placeholder="usuario123"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nombre Completo</label>
                    <input 
                      required
                      type="text"
                      value={formData.displayName}
                      onChange={e => setFormData({...formData, displayName: e.target.value})}
                      className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nombre de Negocio</label>
                    <input 
                      required
                      type="text"
                      value={formData.businessName}
                      onChange={e => setFormData({...formData, businessName: e.target.value})}
                      className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                      placeholder="Ej. Inversiones JP"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Email</label>
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                    placeholder="cliente@email.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Contraseña Temporal</label>
                  <input 
                    required
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Logo del Negocio</label>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden",
                      formData.logoUrl ? "bg-white border-rae-blue-500" : "bg-gray-50 border-gray-200"
                    )}>
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Briefcase className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <label className="cursor-pointer px-4 py-2 bg-rae-blue-500/10 text-rae-blue-500 rounded-lg text-xs font-bold hover:bg-rae-blue-500/20 transition-all">
                      Seleccionar Logo
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setFormData({...formData, logoUrl: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Rol</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as 'admin' | 'user'})}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                  >
                    <option value="user">Usuario Estándar</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <button 
                  disabled={actionLoading}
                  className="w-full py-4 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rae-blue-900/20 active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-lg p-8 rounded-[2.5rem] shadow-2xl border overflow-hidden",
                darkMode ? "bg-[#0f172a] border-white/10" : "bg-white border-gray-100"
              )}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold">Editar Usuario</h3>
                  <p className="text-gray-500 text-sm">Actualiza los datos de {editingUser.displayName}</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-500/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nombre de Usuario</label>
                  <input 
                    required
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nombre Completo</label>
                    <input 
                      required
                      type="text"
                      value={formData.displayName}
                      onChange={e => setFormData({...formData, displayName: e.target.value})}
                      className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nombre de Negocio</label>
                    <input 
                      required
                      type="text"
                      value={formData.businessName}
                      onChange={e => setFormData({...formData, businessName: e.target.value})}
                      className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Contraseña (Solo visualización/DB)</label>
                  <input 
                    required
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500 font-mono", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                  />
                  <p className="text-[10px] text-gray-500 mt-1 italic">* Nota: Cambiarla aquí solo actualiza la base de datos para referencia del administrador.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Logo del Negocio</label>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden",
                      formData.logoUrl ? "bg-white border-rae-blue-500" : "bg-gray-50 border-gray-200"
                    )}>
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Briefcase className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <label className="cursor-pointer px-4 py-2 bg-rae-blue-500/10 text-rae-blue-500 rounded-lg text-xs font-bold hover:bg-rae-blue-500/20 transition-all">
                      Cambiar Logo
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setFormData({...formData, logoUrl: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Rol</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as 'admin' | 'user'})}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                  >
                    <option value="user">Usuario Estándar</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <button 
                  disabled={actionLoading}
                  className="w-full py-4 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rae-blue-900/20 active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Customers Modal */}
      <AnimatePresence>
        {viewingCustomers && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingCustomers(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-[2.5rem] shadow-2xl border flex flex-col",
                darkMode ? "bg-[#0f172a] border-white/10" : "bg-white border-gray-100"
              )}
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-rae-blue-600/5">
                <div>
                  <h3 className="text-2xl font-bold">Clientes del Usuario</h3>
                  <p className="text-gray-500 text-sm">{viewingCustomers.displayName} — {viewingCustomers.businessName}</p>
                </div>
                <button onClick={() => setViewingCustomers(null)} className="p-3 hover:bg-black/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8">
                {loadingCustomers ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-rae-blue-500" />
                    <p className="text-gray-500 font-medium">Cargando base de datos...</p>
                  </div>
                ) : userCustomers.length === 0 ? (
                  <div className="text-center py-20 bg-black/5 rounded-3xl border border-dashed border-white/5">
                    <div className="w-16 h-16 bg-rae-blue-500/10 rounded-full flex items-center justify-center text-rae-blue-500 mx-auto mb-4">
                      <Users className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold mb-1">Sin clientes registrados</h4>
                    <p className="text-gray-500 text-sm">Este usuario aún no ha importado o creado clientes.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userCustomers.map((customer, idx) => (
                      <div key={idx} className={cn(
                        "p-5 rounded-2xl border",
                        darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                      )}>
                        <h5 className="font-bold text-rae-blue-500 mb-2">{customer.name}</h5>
                        <div className="space-y-1.5 text-xs text-gray-500">
                          {customer.id_number && <p><span className="font-bold opacity-50 uppercase mr-1">ID:</span> {customer.id_number}</p>}
                          {customer.phone && <p><span className="font-bold opacity-50 uppercase mr-1">Tel:</span> {customer.phone}</p>}
                          {customer.email && <p><span className="font-bold opacity-50 uppercase mr-1">Email:</span> {customer.email}</p>}
                          {customer.address && <p className="line-clamp-1"><span className="font-bold opacity-50 uppercase mr-1">Dir:</span> {customer.address}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
