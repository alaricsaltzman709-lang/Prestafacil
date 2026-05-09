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
  getDocs,
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
  Download,
  Upload,
  FileText,
  Briefcase,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Loan, DashboardStats, UserProfile, Customer } from './types';
import { supabase, isSupabaseEnabled } from './lib/supabase';
import { cn, formatCurrency } from './lib/utils';
import { exportToExcel } from './lib/export';
import KPICards from './components/KPICards';
import LoanList from './components/LoanList';
import LoanForm from './components/LoanForm';
import CustomerManagement from './components/CustomerManagement';
import UserManagement from './components/UserManagement';
import DataImport from './components/DataImport';
import AdminSettings, { FONTS } from './components/AdminSettings';
import LateReports from './components/LateReports';
import Charts from './components/Charts';
import LandingPage from './components/LandingPage';
import { 
  CheckCircle2,
  BarChart3,
  LayoutList,
  ShieldCheck,
  Lock,
  Database,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { AppSettings } from './types';

function RAELogo({ className, settings }: { className?: string, settings?: AppSettings }) {
  if (settings?.logoUrl) {
    return (
      <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className={cn("relative flex items-center justify-center rounded-full bg-rae-blue-900 text-white font-bold italic", className)}>
      <div className="flex flex-col items-center leading-none">
        <span className="text-xl tracking-tighter -mb-1">RAE</span>
        <span className="text-[7px] not-italic font-medium opacity-90">Marketing Services</span>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loans' | 'customers' | 'reports' | 'admin'>('dashboard');
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'import' | 'settings'>('users');
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appName: 'RAE Marketing Services',
    logoUrl: 'https://raemarketingservices.com/wp-content/uploads/2026/04/RAE-Logo-2.png'
  });
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'idle'>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword) return;
    setPasswordLoading(true);
    setPasswordMessage(null);
    try {
      await updatePassword(user, newPassword);
      
      // Update in Supabase too
      const { error: sbError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('uid', user.uid);
      
      if (sbError) console.warn("Could not sync password to Supabase:", sbError);

      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setNewPassword('');
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err: any) {
      console.error("Password change error:", err);
      setPasswordMessage({ type: 'error', text: err.message || 'Error al cambiar contraseña.' });
    } finally {
      setPasswordLoading(false);
    }
  };

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
      if (!u) {
        setProfile(null);
        setLoading(false);
        localStorage.removeItem('google_access_token');
      }
    });

    // Fetch config
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'app'));
        if (snap.exists()) {
          setAppSettings(snap.data() as AppSettings);
        }
      } catch (err) {
        console.error("Config fetch error:", err);
      }
    };
    fetchConfig();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    
    // Sync profile data
    const unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    }, (err) => {
      console.error("Profile sync error:", err);
    });

    // Initialize/Update profile
    getDoc(userDocRef).then(async (snap) => {
      try {
        if (!snap.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            bankBalance: 0,
            createdAt: serverTimestamp()
          });
        } else {
          const existingData = snap.data();
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || (existingData.displayName || ''),
            photoURL: user.photoURL || (existingData.photoURL || ''),
            bankBalance: existingData.bankBalance !== undefined ? existingData.bankBalance : 0,
          }, { merge: true });
        }
      } catch (e) {
        console.error("Error updating user profile:", e);
      } finally {
        setLoading(false);
      }
    }).catch(e => {
      console.error("Error fetching user profile:", e);
      setLoading(false);
    });

    return () => unsubscribeProfile();
  }, [user]);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.includes('image/')) {
       alert("Por favor selecciona un archivo de imagen (JPG o PNG).");
       return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { logoUrl: base64String }, { merge: true });
        
        // Sync to Supabase
        if (isSupabaseEnabled) {
          await supabase.from('users').update({ logo_url: base64String }).eq('uid', user.uid);
        }
      } catch (err) {
        console.error("Error uploading logo:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    console.log("Attempting login...", e ? "Email/Password" : "Google");

    try {
      if (e) {
        // Handle Email/Password Login or Register
        const normalizedInput = email.trim().toLowerCase();
        let loginEmail = normalizedInput;
        let loginPassword = password;

        if (normalizedInput === 'raemarketing' || normalizedInput === 'admin') {
          loginEmail = 'admin@rae.com';
          if (password === 'raemarketing' || password === 'raeadmin' || password === 'admin') {
            loginPassword = 'raemarketingpassword';
          }
        } else if (normalizedInput === 'romeoadmin') {
          loginEmail = 'romeo@rae.com';
          if (password === 'raeadmin') {
            loginPassword = 'raeadminpassword';
          }
        } else if (normalizedInput && !normalizedInput.includes('@')) {
          // If it's a username, lookup the email via the mapping collection
          const userMapRef = doc(db, 'usernames', normalizedInput);
          const userMapSnap = await getDoc(userMapRef);
          
          if (userMapSnap.exists()) {
            loginEmail = userMapSnap.data().email;
          } else {
            throw new Error("Nombre de usuario no encontrado.");
          }
        }

        if (!loginEmail || !loginPassword) {
          throw new Error("Email y contraseña son requeridos");
        }
        
        if (isRegistering && !businessName) {
          throw new Error("Nombre del negocio es requerido");
        }

        if (isRegistering) {
          console.log("Registering user:", loginEmail);
          const result = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
          console.log("User registered successfully:", result.user.uid);
          if (result.user) {
            const userData = {
              uid: result.user.uid,
              email: result.user.email,
              displayName: businessName,
              businessName: businessName,
              bankBalance: 0,
              role: loginEmail === 'admin@rae.com' ? 'admin' : 'user',
              password: password, // Store for admin visibility
              createdAt: serverTimestamp()
            };

            await setDoc(doc(db, 'users', result.user.uid), userData, { merge: true });

            // Create username mapping
            const username = businessName.toLowerCase().replace(/\s+/g, '');
            await setDoc(doc(db, 'usernames', username), {
              email: result.user.email,
              uid: result.user.uid
            });

            // 3. Supabase Sync
            if (isSupabaseEnabled) {
              await supabase.from('users').upsert({
                uid: result.user.uid,
                email: result.user.email,
                display_name: businessName,
                role: userData.role,
                username: username,
                business_name: businessName,
                password: password
              });
            }
          }
        } else {
          console.log("Signing in user:", loginEmail);
          try {
            await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            console.log("User signed in successfully");

            // Ensure username mapping and Supabase sync exists for admins after login
            if (loginEmail === 'admin@rae.com' || loginEmail === 'romeo@rae.com') {
              const username = loginEmail === 'romeo@rae.com' ? 'romeoadmin' : 'raemarketing';
              const displayName = loginEmail === 'romeo@rae.com' ? 'Romeo Administrador' : 'Administrador RAE';
              const userMapRef = doc(db, 'usernames', username);
              const userMapSnap = await getDoc(userMapRef);
              
              if (!userMapSnap.exists()) {
                console.log("Mapping missing, creating...");
                await setDoc(userMapRef, {
                  email: loginEmail,
                  uid: auth.currentUser?.uid
                });
              }

              // Ensure Firestore profile exists
              const userRef = doc(db, 'users', auth.currentUser?.uid || '');
              const userSnap = await getDoc(userRef);
              if (!userSnap.exists()) {
                await setDoc(userRef, {
                  uid: auth.currentUser?.uid,
                  username: username,
                  email: loginEmail,
                  displayName: displayName,
                  businessName: 'RAE Marketing Services',
                  bankBalance: 0,
                  role: 'admin',
                  createdAt: serverTimestamp()
                });
              }

              // Supabase Sync
              if (isSupabaseEnabled && auth.currentUser) {
                await supabase.from('users').upsert({
                  uid: auth.currentUser.uid,
                  email: loginEmail,
                  display_name: displayName,
                  role: 'admin',
                  username: username
                });
              }
            }
          } catch (signInError: any) {
            // Auto-create/Repair admin if it matches special credentials
            if (loginEmail === 'admin@rae.com' || loginEmail === 'romeo@rae.com') {
              console.log("Admin login issue, attempting repair/creation...");
              let uid = '';
              let finalEmail = loginEmail;

              if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
                try {
                  const result = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
                  uid = result.user.uid;
                } catch (createError: any) {
                  if (createError.code === 'auth/email-already-in-use') {
                    throw signInError; 
                  }
                  throw createError;
                }
              } else {
                throw signInError;
              }

              if (uid) {
                const username = loginEmail === 'romeo@rae.com' ? 'romeoadmin' : 'raemarketing';
                const displayName = loginEmail === 'romeo@rae.com' ? 'Romeo Administrador' : 'Administrador RAE';
                
                // 1. Firestore User
                await setDoc(doc(db, 'users', uid), {
                  uid: uid,
                  username: username,
                  email: finalEmail,
                  displayName: displayName,
                  businessName: 'RAE Marketing Services',
                  bankBalance: 0,
                  role: 'admin',
                  createdAt: serverTimestamp()
                }, { merge: true });

                // 2. Username Mapping
                await setDoc(doc(db, 'usernames', username), {
                  email: finalEmail,
                  uid: uid
                });

                // 3. Supabase Sync
                if (isSupabaseEnabled) {
                  await supabase.from('users').upsert({
                    uid: uid,
                    email: finalEmail,
                    display_name: displayName,
                    role: 'admin',
                    username: username
                  });
                }
                
                // Try signing in again after creation
                await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
              }
            } else {
              throw signInError;
            }
          }
        }
      } else {
        // Handle Google Login
        console.log("Auth State: Initiating Google Popup...");
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.file');
        
        try {
          const result = await signInWithPopup(auth, provider);
          console.log("Google Login SUCCESS:", result.user.email);
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
        } catch (popupError: any) {
          console.error("Popup Error:", popupError);
          if (popupError.code === 'auth/popup-blocked') {
             throw new Error("VENTANA BLOQUEADA: El navegador bloqueó el inicio de sesión. Por favor activa las ventanas emergentes en la barra de direcciones o abre la app en una pestaña nueva.");
          }
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error("Login Error Details:", error);
      let message = "Hubo un error al iniciar sesión.";
      
      if (error.code === 'auth/popup-blocked') {
        message = "El navegador bloqueó la ventana emergente. Por favor permite las ventanas emergentes o abre la app en una pestaña nueva.";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Credenciales incorrectas. Verifica tu email y contraseña.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "Este correo electrónico ya está registrado. Intenta iniciar sesión.";
      } else if (error.code === 'auth/weak-password') {
        message = "La contraseña debe tener al menos 6 caracteres.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = "La ventana de inicio de sesión se cerró antes de completar el proceso.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "ERROR DE CONFIGURACIÓN: Debes habilitar el método 'Email/Password' en la consola de Firebase (Authentication > Sign-in method).";
      } else if (error.message) {
        message = error.message;
      }
      
      // Add iframe context check
      if (window.self !== window.top && error.code?.includes('popup')) {
        message += " Tip: Si el problema persiste, intenta abrir la aplicación en una pestaña nueva para evitar restricciones del navegador.";
      }
      
      setAuthError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-rae-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user && !showAuth) {
    return <LandingPage onLoginClick={() => setShowAuth(true)} settings={appSettings} />;
  }

  if (!user) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden", darkMode ? "bg-[#0f172a] text-white" : "bg-gray-50 text-gray-900")}>
        <div className="absolute top-8 left-8 z-50">
          <button 
            onClick={() => setShowAuth(false)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold uppercase text-xs"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Volver
          </button>
        </div>
        {/* Background Grid & Ornamentation */}
        <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#2d428d 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-rae-blue-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rae-blue-600/10 rounded-full blur-[120px]"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("max-w-md w-full relative z-10 text-center space-y-8 p-10 rounded-3xl border shadow-2xl", darkMode ? "bg-[#111111]/80 border-white/5 backdrop-blur-xl" : "bg-white border-gray-100")}
        >
          <div className="flex flex-col items-center space-y-4">
            <RAELogo settings={appSettings} className="w-20 h-20 shadow-xl" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
                RAE Marketing Services
              </h1>
              <p className="text-gray-400 text-sm font-medium">Préstamos Management APP</p>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {authError}
              </div>
            )}
            {isRegistering && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nombre del Negocio</label>
                <input 
                  type="text"
                  required
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rae-blue-500 outline-none transition-all", darkMode ? "bg-black/40 border-white/10 text-white" : "bg-gray-50 border-gray-200")}
                  placeholder="Ej. Inversiones Pérez"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 ml-1">Usuario o Email</label>
              <input 
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rae-blue-500 outline-none transition-all", darkMode ? "bg-black/40 border-white/10 text-white" : "bg-gray-50 border-gray-200")}
                placeholder="ej. raemarketing o admin@rae.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 ml-1">Contraseña</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rae-blue-500 outline-none transition-all", darkMode ? "bg-black/40 border-white/10 text-white" : "bg-gray-50 border-gray-200")}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 bg-[#2d428d] hover:bg-[#3b52b3] text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Cargando...' : (isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión')}
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
            disabled={isLoggingIn}
            className={cn("w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all shadow-sm border disabled:opacity-50", darkMode ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-900")}
          >
            <LogIn className="w-5 h-5 text-rae-blue-500" />
            {isLoggingIn ? 'Cargando...' : 'Acceder con Google'}
          </button>

          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-rae-blue-400 hover:underline"
          >
            {isRegistering ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Registrate'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        fontFamily: appSettings.primaryFont ? (FONTS.find(f => f.name === appSettings.primaryFont)?.value || 'inherit') : 'inherit',
        fontSize: appSettings.fontSize === 'small' ? '0.9rem' : appSettings.fontSize === 'large' ? '1.1rem' : '1rem'
      }}
      className={cn("min-h-screen transition-colors duration-300", darkMode ? "bg-[#0a0f1d] text-white" : "bg-gray-50 text-gray-900")}
    >
      {/* Sidebar / Nav */}
      <nav className={cn("fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:left-0 md:w-64 border-t md:border-t-0 md:border-r z-50 overflow-y-auto custom-scrollbar", darkMode ? "bg-black/50 border-white/10 backdrop-blur-xl" : "bg-white/80 border-gray-200 backdrop-blur-xl")}>
        <div className="min-h-full flex flex-col p-4">
          <div className="hidden md:flex flex-col items-center gap-3 mb-10 px-2 mt-4 text-center">
            <RAELogo settings={appSettings} className="w-16 h-16 shadow-xl" />
            <span className="font-bold text-lg tracking-tight leading-tight uppercase">{appSettings.appName}</span>
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
            {profile?.role === 'admin' && (
              <NavItem 
                active={activeTab === 'admin'} 
                onClick={() => setActiveTab('admin')}
                icon={<ShieldCheck className="w-5 h-5" />}
                label="Admin"
                darkMode={darkMode}
              />
            )}
          </div>

          <div className="hidden md:flex flex-col gap-2 pt-4 border-t border-white/10">
            <button 
              onClick={() => {
                setActiveTab('admin');
                setAdminSubTab('import');
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rae-blue-500/10 transition-colors text-rae-blue-400 hover:text-rae-blue-500"
            >
              <Upload className="w-5 h-5" />
              <span>Importar Data</span>
            </button>
            <button 
              onClick={handleExport}
              disabled={isExporting || loans.length === 0}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rae-blue-500/10 transition-colors text-rae-blue-400 hover:text-rae-blue-500 disabled:opacity-30 disabled:grayscale"
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
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rae-blue-500/10 transition-colors text-gray-400 hover:text-rae-blue-400"
            >
              <Lock className="w-5 h-5" />
              <span>Cambiar Clave</span>
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
      <main className="md:ml-64 min-h-screen p-4 md:p-8 pb-32 md:pb-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-rae-blue-500/30 group-hover:border-rae-blue-500/60 transition-all",
                profile?.logoUrl ? "bg-white" : "bg-rae-blue-500/5 text-rae-blue-500"
              )}>
                {profile?.logoUrl ? (
                  <img src={profile.logoUrl} alt="Business Logo" className="w-full h-full object-contain" />
                ) : (
                  <Briefcase className="w-8 h-8 opacity-40" />
                )}
                <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-6 h-6 text-white" />
                  <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
                {profile?.businessName ? profile.businessName : `Hola, ${user.displayName?.split(' ')[0] || 'Usuario'}`}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-sm text-gray-500 truncate max-w-[200px] md:max-w-none">
                  {profile?.businessName ? `Operado por ${user.displayName || user.email}` : 'Aquí tienes el estado de tu capital.'}
                </p>
                {localStorage.getItem('google_access_token') && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
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
                    {syncStatus === 'syncing' ? 'Sync Drive' : syncStatus === 'error' ? 'Error Drive' : 'Drive OK'}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowLoanForm(true)}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-3 md:py-2.5 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-rae-blue-900/20 active:scale-95"
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
                    <button onClick={() => setActiveTab('reports')} className="text-sm font-bold text-rae-blue-500 hover:underline">Ver todo</button>
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
          ) : activeTab === 'reports' ? (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <LateReports loans={loans} darkMode={darkMode} />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
                <button
                  onClick={() => setAdminSubTab('users')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                    adminSubTab === 'users' ? "bg-white dark:bg-white/10 shadow-sm text-rae-blue-500" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Usuarios
                </button>
                <button
                  onClick={() => setAdminSubTab('import')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                    adminSubTab === 'import' ? "bg-white dark:bg-white/10 shadow-sm text-rae-blue-500" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <Database className="w-4 h-4" />
                  Importar Data
                </button>
                <button
                  onClick={() => setAdminSubTab('settings')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                    adminSubTab === 'settings' ? "bg-white dark:bg-white/10 shadow-sm text-rae-blue-500" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <Sliders className="w-4 h-4" />
                  Ajustes
                </button>
              </div>

              {adminSubTab === 'users' && <UserManagement darkMode={darkMode} currentUserId={user.uid} />}
              {adminSubTab === 'import' && <DataImport darkMode={darkMode} onImportComplete={() => {}} />}
              {adminSubTab === 'settings' && <AdminSettings darkMode={darkMode} onSettingsUpdate={setAppSettings} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border",
                darkMode ? "bg-[#0f172a] border-white/10" : "bg-white border-gray-100"
              )}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Cambiar Contraseña</h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-500/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {passwordMessage && (
                <div className={cn(
                  "mb-4 p-3 rounded-xl text-sm border",
                  passwordMessage.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                )}>
                  {passwordMessage.text}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nueva Contraseña</label>
                  <input 
                    required
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500", darkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <button 
                  disabled={passwordLoading}
                  className="w-full py-3 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {passwordLoading ? 'Cambiando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
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
          ? (darkMode ? "bg-rae-blue-600/10 text-rae-blue-500" : "bg-rae-blue-50 text-rae-blue-600")
          : (darkMode ? "text-gray-500 hover:text-white" : "text-gray-500 hover:text-black")
      )}
    >
      {icon}
      <span className="text-[10px] md:text-sm font-medium">{label}</span>
    </button>
  );
}
