import React, { useState, useEffect } from 'react';
import { 
  auth, db, handleFirestoreError, OperationType 
} from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { syncLoansToDrive } from './lib/drive';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  doc,
  setDoc,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  HandCoins, 
  Users, 
  Settings, 
  LogOut, 
  LogIn,
  TrendingUp,
  CreditCard,
  Plus,
  Moon,
  Sun,
  Cloud,
  CloudOff,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Loan, DashboardStats, UserProfile, Customer } from './types';
import { cn, formatCurrency } from './lib/utils';
import { exportToExcel } from './lib/export';
import KPICards from './components/KPICards';
import LoanList from './components/LoanList';
import LoanForm from './components/LoanForm';
import CustomerManagement from './components/CustomerManagement';
import LateReports from './components/LateReports';
import Charts from './components/Charts';
import { 
  CheckCircle2,
  BarChart3,
  LayoutList
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loans' | 'customers' | 'reports'>('dashboard');
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'idle'>('idle');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (loans.length === 0) return;
    setIsExporting(true);
    try {
      await exportToExcel(loans, profile?.businessName || '');
    } catch (error) {
      console.error("Export Error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      
      if (u) {
        // Sync user profile safely
        const userDocRef = doc(db, 'users', u.uid);
        onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        });

        getDoc(userDocRef).then((snap) => {
          if (!snap.exists()) {
            setDoc(userDocRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName || '',
              photoURL: u.photoURL || '',
              bankBalance: 0,
              createdAt: serverTimestamp()
            }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${u.uid}`));
          } else {
            const existingData = snap.data();
            // Only update mutable fields, but ensure required fields exist for rules
            setDoc(userDocRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName || (existingData.displayName || ''),
              photoURL: u.photoURL || (existingData.photoURL || ''),
              bankBalance: existingData.bankBalance !== undefined ? existingData.bankBalance : 0,
            }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${u.uid}`));
          }
          setLoading(false);
        }).catch(e => {
          handleFirestoreError(e, OperationType.GET, `users/${u.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        localStorage.removeItem('google_access_token');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || loans.length === 0) return;
    const token = localStorage.getItem('google_access_token');
    if (token) {
      setSyncStatus('syncing');
      syncLoansToDrive(loans, user.uid, profile?.businessName || '')
        .then(() => setSyncStatus('synced'))
        .catch((err) => {
          console.error("Drive Sync Fail:", err);
          setSyncStatus('error');
        });
    }
  }, [loans, user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'loans'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loanData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Loan[];
      setLoans(loanData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'loans');
    });

    return () => unsubscribe();
  }, [user]);

  const stats: DashboardStats = {
    totalLent: loans.reduce((acc, l) => acc + l.amount, 0),
    totalCollected: 0, // In a real app, sum all payments
    projectedInterest: loans.reduce((acc, l) => acc + (l.totalPayable - l.amount), 0),
    pendingBalance: loans.reduce((acc, l) => acc + l.remainingBalance, 0),
    bankBalance: profile?.bankBalance || 0,
  };

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      if (e && email && password) {
        if (isRegistering) {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          if (result.user && businessName) {
            await setDoc(doc(db, 'users', result.user.uid), {
              uid: result.user.uid,
              email: result.user.email,
              displayName: businessName,
              businessName: businessName,
              bankBalance: 0,
              createdAt: serverTimestamp()
            }, { merge: true });
          }
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } else {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          localStorage.setItem('google_access_token', credential.accessToken);
        }
        // Initialize profile if it doesn't exist
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName || '',
            bankBalance: 0,
            createdAt: serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-4", darkMode ? "bg-[#0a0a0a] text-white" : "bg-gray-50 text-gray-900")}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("max-w-md w-full text-center space-y-8 p-8 rounded-3xl border", darkMode ? "bg-[#111111] border-white/5" : "bg-white border-gray-100 shadow-xl")}
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              RAE Marketing Services Prestamos Management APP
            </h1>
            <p className="text-gray-500 shrink-0">Gestión de préstamos en Pesos Dominicanos.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            {isRegistering && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nombre del Negocio</label>
                <input 
                  type="text"
                  required
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                  placeholder="Ej. Inversiones Pérez"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 ml-1">Email</label>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                placeholder="tu@email.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 ml-1">Contraseña</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={cn("px-2", darkMode ? "bg-[#111111] text-gray-500" : "bg-white")}>O continúa con</span>
            </div>
          </div>

          <button
            onClick={() => handleLogin()}
            className={cn("w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all shadow-sm border", darkMode ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-900")}
          >
            <LogIn className="w-5 h-5 text-indigo-500" />
            Acceder con Google
          </button>

          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-indigo-500 hover:underline"
          >
            {isRegistering ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Registrate'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen transition-colors duration-300", darkMode ? "bg-[#0a0a0a] text-white" : "bg-gray-50 text-gray-900")}>
      {/* Sidebar / Nav */}
      <nav className={cn("fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:left-0 md:w-64 border-t md:border-t-0 md:border-r z-50", darkMode ? "bg-black/50 border-white/10 backdrop-blur-xl" : "bg-white/80 border-gray-200 backdrop-blur-xl")}>
        <div className="h-full flex flex-col p-4">
          <div className="hidden md:flex items-center gap-3 mb-10 px-2 mt-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight leading-tight">RAE Marketing Services</span>
          </div>

          <div className="flex md:flex-col items-center justify-around md:justify-start gap-1 md:gap-2 flex-grow">
            <NavItem 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')}
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Tablero"
              darkMode={darkMode}
            />
            <NavItem 
              active={activeTab === 'loans'} 
              onClick={() => setActiveTab('loans')}
              icon={<LayoutList className="w-5 h-5" />}
              label="Préstamos"
              darkMode={darkMode}
            />
            <NavItem 
              active={activeTab === 'customers'} 
              onClick={() => setActiveTab('customers')}
              icon={<Users className="w-5 h-5" />}
              label="Clientes"
              darkMode={darkMode}
            />
            <NavItem 
              active={activeTab === 'reports'} 
              onClick={() => setActiveTab('reports')}
              icon={<BarChart3 className="w-5 h-5" />}
              label="Mora"
              darkMode={darkMode}
            />
          </div>

          <div className="hidden md:flex flex-col gap-2 pt-4 border-t border-white/10">
            <button 
              onClick={handleExport}
              disabled={isExporting || loans.length === 0}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-500/10 transition-colors text-indigo-400 hover:text-indigo-500 disabled:opacity-30 disabled:grayscale"
            >
              <Download className={cn("w-5 h-5", isExporting && "animate-bounce")} />
              <span>{isExporting ? 'Exportando...' : 'Exportar Data (XLS)'}</span>
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-red-400 hover:text-red-500"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {profile?.businessName ? profile.businessName : `Hola, ${user.displayName?.split(' ')[0] || 'Usuario'}`}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-500">
                  {profile?.businessName ? `Operado por ${user.displayName || user.email}` : 'Aquí tienes el estado de tu capital.'}
                </p>
                {localStorage.getItem('google_access_token') && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    syncStatus === 'synced' && "bg-emerald-500/10 text-emerald-500",
                    syncStatus === 'syncing' && "bg-indigo-500/10 text-indigo-500",
                    syncStatus === 'error' && "bg-rose-500/10 text-rose-500",
                    syncStatus === 'idle' && "bg-white/5 text-gray-500"
                  )}>
                    {syncStatus === 'syncing' ? (
                      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <Cloud className="w-3 h-3" />
                      </motion.div>
                    ) : syncStatus === 'error' ? (
                      <CloudOff className="w-3 h-3" />
                    ) : (
                      <Cloud className="w-3 h-3" />
                    )}
                    {syncStatus === 'syncing' ? 'Sincronizando Drive' : syncStatus === 'error' ? 'Error Drive' : 'Drive Sincronizado'}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowLoanForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5" />
            Nuevo Préstamo
          </button>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <KPICards stats={stats} darkMode={darkMode} userId={user.uid} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Resumen de Mora</h3>
                    <button onClick={() => setActiveTab('reports')} className="text-sm font-bold text-indigo-500 hover:underline">Ver todo</button>
                  </div>
                  <div className={cn("p-6 rounded-3xl border", darkMode ? "bg-[#111111] border-white/5" : "bg-white border-gray-100")}>
                    {loans.filter(l => l.status === 'defaulted').length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-3">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-gray-500">¡Felicidades! No tienes préstamos en mora.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {loans.filter(l => l.status === 'defaulted').slice(0, 3).map(loan => (
                          <div key={loan.id} className="flex items-center justify-between p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                            <div>
                              <p className="font-bold text-sm">{loan.borrowerName}</p>
                              <p className="text-xs text-rose-500">Atraso detectado</p>
                            </div>
                            <p className="font-mono text-sm font-bold">{formatCurrency(loan.remainingBalance)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Distribución de Cartera</h3>
                  <Charts loans={loans} darkMode={darkMode} />
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'loans' ? (
            <motion.div
              key="loans"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <LoanList loans={loans} darkMode={darkMode} />
            </motion.div>
          ) : activeTab === 'customers' ? (
            <motion.div
              key="customers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CustomerManagement darkMode={darkMode} userId={user.uid} />
            </motion.div>
          ) : (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <LateReports loans={loans} darkMode={darkMode} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showLoanForm && (
          <LoanForm 
            onClose={() => setShowLoanForm(false)} 
            darkMode={darkMode}
            userId={user.uid}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, darkMode }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, darkMode: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all w-full",
        active 
          ? (darkMode ? "bg-indigo-600/10 text-indigo-500" : "bg-indigo-50 text-indigo-600")
          : (darkMode ? "text-gray-500 hover:text-white" : "text-gray-500 hover:text-black")
      )}
    >
      {icon}
      <span className="text-[10px] md:text-sm font-medium">{label}</span>
    </button>
  );
}
