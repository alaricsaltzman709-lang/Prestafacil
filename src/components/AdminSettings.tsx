import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Palette, 
  Type, 
  Layout, 
  Image as ImageIcon, 
  Check, 
  Save,
  Loader2,
  Monitor,
  LayoutDashboard,
  Plus,
  Trash2,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, LandingPageSettings } from '../types';
import { cn } from '../lib/utils';
import { FONTS } from '../constants';

interface AdminSettingsProps {
  darkMode: boolean;
  onSettingsUpdate: (settings: AppSettings) => void;
}

const DEFAULT_LANDING: LandingPageSettings = {
  heroTitle: "Domina tus Finanzas con Inteligencia y Control Total",
  heroSubtitle: "La plataforma definitiva para prestamistas y agencias. Gestiona clientes, automatiza reportes de mora y sincroniza tu data en tiempo real.",
  heroCtaText: "Comenzar Ahora",
  heroShowDemo: true,
  heroGradient: "from-blue-400 via-indigo-400 to-purple-400",
  backgroundColor: "#0a0f1d",
  features: [
    {
      title: "Control de Capital",
      description: "KPIs en tiempo real para visualizar tu rendimiento, mora y proyecciones de intereses.",
      icon: "LayoutDashboard",
      color: "from-blue-500 to-indigo-600"
    },
    {
      title: "Gestión de Préstamos",
      description: "Crea contratos, amortizaciones y pagos en segundos con nuestra interfaz intuitiva.",
      icon: "HandCoins",
      color: "from-emerald-500 to-teal-600"
    }
  ],
  showcaseTitle: "Gestiona miles de préstamos sin perder el control.",
  showcaseDescription: "Todo lo que necesitas para escalar tu operación de préstamos en una sola plataforma robusta y segura.",
  ctaTitle: "¿Listo para transformar tu negocio de préstamos?",
  ctaDescription: "Únete a las agencias que ya están optimizando su capital con RAE Marketing Services.",
  ctaButtonText: "Empezar Ahora"
};

export default function AdminSettings({ darkMode, onSettingsUpdate }: AdminSettingsProps) {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'RAE Marketing Services',
    fontSize: 'medium',
    primaryFont: 'Inter',
    landingPage: DEFAULT_LANDING
  });
  const [activeTab, setActiveTab] = useState<'app' | 'landing' | 'custom-nav'>('app');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'config', 'app');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as AppSettings;
          setSettings({
            ...data,
            landingPage: data.landingPage || DEFAULT_LANDING,
            customActions: data.customActions || []
          });
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'app'), settings, { merge: true });
      onSettingsUpdate(settings);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateLanding = (updates: Partial<LandingPageSettings>) => {
    setSettings(prev => ({
      ...prev,
      landingPage: { ...prev.landingPage!, ...updates }
    }));
  };

  const addCustomAction = () => {
    const newAction = {
      id: crypto.randomUUID(),
      label: 'Nuevo Botón',
      icon: 'Plus',
      description: 'Describe qué debe hacer este botón...',
      enabled: true
    };
    setSettings(prev => ({
      ...prev,
      customActions: [...(prev.customActions || []), newAction]
    }));
  };

  const updateCustomAction = (id: string, updates: any) => {
    setSettings(prev => ({
      ...prev,
      customActions: prev.customActions?.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const removeCustomAction = (id: string) => {
    setSettings(prev => ({
      ...prev,
      customActions: prev.customActions?.filter(a => a.id !== id)
    }));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-rae-blue-500" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">Configuración de Plataforma</h3>
          <p className="text-gray-500">Configura la identidad y el contenido público de tu app.</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('app')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'app' ? "bg-white dark:bg-white/10 shadow-sm text-rae-blue-500" : "text-gray-500"
            )}
          >
            <Settings2 className="w-4 h-4" />
            Sistema
          </button>
          <button
            onClick={() => setActiveTab('custom-nav')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'custom-nav' ? "bg-white dark:bg-white/10 shadow-sm text-rae-blue-500" : "text-gray-500"
            )}
          >
            <Plus className="w-4 h-4" />
            Botones Usuario
          </button>
          <button
            onClick={() => setActiveTab('landing')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'landing' ? "bg-white dark:bg-white/10 shadow-sm text-rae-blue-500" : "text-gray-500"
            )}
          >
            <Monitor className="w-4 h-4" />
            Landing Page
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'app' ? (
          <motion.div
            key="app-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Branding */}
            <div className={cn(
              "p-6 rounded-3xl border space-y-6",
              darkMode ? "bg-black/20 border-white/5" : "bg-white border-gray-100 shadow-sm"
            )}>
              <div className="flex items-center gap-2 mb-4">
                <Layout className="w-5 h-5 text-rae-blue-500" />
                <h4 className="font-bold uppercase text-xs tracking-widest text-gray-400">Identidad</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombre de la Aplicación</label>
                  <input 
                    type="text"
                    value={settings.appName}
                    onChange={e => setSettings({...settings, appName: e.target.value})}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500",
                      darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                    )}
                    placeholder="Nombre de la App"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">URL del Logo (SVG o PNG)</label>
                  <input 
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={e => setSettings({...settings, logoUrl: e.target.value})}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500",
                      darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                    )}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className={cn(
              "p-6 rounded-3xl border space-y-6",
              darkMode ? "bg-black/20 border-white/5" : "bg-white border-gray-100 shadow-sm"
            )}>
              <div className="flex items-center gap-2 mb-4">
                <Type className="w-5 h-5 text-rae-blue-500" />
                <h4 className="font-bold uppercase text-xs tracking-widest text-gray-400">Tipografía</h4>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Fuente Principal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FONTS.map(font => (
                      <button
                        key={font.name}
                        onClick={() => setSettings({...settings, primaryFont: font.name})}
                        className={cn(
                          "p-3 rounded-xl border text-left flex items-center justify-between transition-all",
                          settings.primaryFont === font.name 
                            ? "border-rae-blue-500 bg-rae-blue-500/10 text-rae-blue-500" 
                            : (darkMode ? "border-white/5 bg-white/5 hover:border-white/20" : "border-gray-200 bg-white hover:border-gray-300")
                        )}
                      >
                        <span style={{ fontFamily: font.value }} className="text-sm">{font.name}</span>
                        {settings.primaryFont === font.name && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Tamaño de Letra</label>
                  <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                    {(['small', 'medium', 'large'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => setSettings({...settings, fontSize: size})}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize",
                          settings.fontSize === size 
                            ? "bg-white dark:bg-white/10 shadow-sm text-rae-blue-500" 
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                      >
                        {size === 'small' ? 'Pequeño' : size === 'medium' ? 'Normal' : 'Grande'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'custom-nav' ? (
          <motion.div
            key="nav-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold">Botones Personalizados</h4>
                <p className="text-gray-500 text-sm">Añade opciones extras al panel lateral del usuario.</p>
              </div>
              <button
                onClick={addCustomAction}
                className="flex items-center gap-2 px-4 py-2 bg-rae-blue-600 text-white rounded-xl font-bold"
              >
                <Plus className="w-4 h-4" />
                Nuevo Botón
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.customActions?.map(action => (
                <div key={action.id} className={cn(
                  "p-6 rounded-3xl border space-y-4",
                  darkMode ? "bg-black/20 border-white/5" : "bg-white border-gray-100 shadow-sm"
                )}>
                  <div className="flex items-center justify-between">
                    <input 
                      type="text"
                      value={action.label}
                      onChange={e => updateCustomAction(action.id, { label: e.target.value })}
                      className="bg-transparent font-bold outline-none border-b border-white/10 focus:border-rae-blue-500"
                      placeholder="Nombre del Botón"
                    />
                    <button onClick={() => removeCustomAction(action.id)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea 
                    value={action.description}
                    onChange={e => updateCustomAction(action.id, { description: e.target.value })}
                    className="w-full bg-transparent text-sm text-gray-500 outline-none h-20"
                    placeholder="Describe qué hace este botón. La app lo mostrará como información."
                  />
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Ícono (Lucide Name)</label>
                      <input 
                        type="text"
                        value={action.icon}
                        onChange={e => updateCustomAction(action.id, { icon: e.target.value })}
                        className="w-full bg-transparent text-xs border-b border-white/10 outline-none"
                        placeholder="Plus, Settings, etc."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                       <input 
                        type="checkbox"
                        checked={action.enabled}
                        onChange={e => updateCustomAction(action.id, { enabled: e.target.checked })}
                        className="w-4 h-4 rounded accent-rae-blue-500"
                      />
                      <label className="text-xs">Activo</label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="landing-tab"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-8"
          >
            {/* Hero Section Editor */}
            <div className={cn(
              "p-8 rounded-[2.5rem] border space-y-6",
              darkMode ? "bg-black/20 border-white/5" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-5 h-5 text-rae-blue-500" />
                <h4 className="font-bold uppercase text-xs tracking-widest text-gray-400">Sección Hero</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Título Principal</label>
                    <textarea 
                      value={settings.landingPage?.heroTitle}
                      onChange={e => updateLanding({ heroTitle: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500 min-h-[100px]",
                        darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Descripción</label>
                    <textarea 
                      value={settings.landingPage?.heroSubtitle}
                      onChange={e => updateLanding({ heroSubtitle: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500 min-h-[100px]",
                        darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">URL Imagen Hero</label>
                    <input 
                      type="text"
                      value={settings.landingPage?.heroImageUrl || ''}
                      onChange={e => updateLanding({ heroImageUrl: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500",
                        darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                      )}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Texto del Botón Principal</label>
                    <input 
                      type="text"
                      value={settings.landingPage?.heroCtaText}
                      onChange={e => updateLanding({ heroCtaText: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500",
                        darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Gradiente del Título (Tailwind Classes)</label>
                    <input 
                      type="text"
                      value={settings.landingPage?.heroGradient}
                      onChange={e => updateLanding({ heroGradient: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500",
                        darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input 
                      type="checkbox"
                      checked={settings.landingPage?.heroShowDemo}
                      onChange={e => updateLanding({ heroShowDemo: e.target.checked })}
                      className="w-5 h-5 rounded accent-rae-blue-500"
                    />
                    <label className="text-sm font-medium">Mostrar Botón de Demo</label>
                  </div>
                  <div className="space-y-1 mt-4">
                    <label className="text-xs font-bold uppercase text-gray-500">Color de Fondo (Hex)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color"
                        value={settings.landingPage?.backgroundColor || '#0a0f1d'}
                        onChange={e => updateLanding({ backgroundColor: e.target.value })}
                        className="w-12 h-10 rounded-lg p-0 border-0 cursor-pointer"
                      />
                      <input 
                        type="text"
                        value={settings.landingPage?.backgroundColor || '#0a0f1d'}
                        onChange={e => updateLanding({ backgroundColor: e.target.value })}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500",
                          darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Editor */}
            <div className={cn(
              "p-8 rounded-[2.5rem] border space-y-6",
              darkMode ? "bg-black/20 border-white/5" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-rae-blue-500" />
                  <h4 className="font-bold uppercase text-xs tracking-widest text-gray-400">Características (Features)</h4>
                </div>
                <button
                  onClick={() => {
                    const newFeatures = [...(settings.landingPage?.features || [])];
                    newFeatures.push({ title: 'Nueva Mejora', description: 'Descripción de la mejora', icon: 'CheckCircle2', color: 'from-blue-500 to-indigo-600' });
                    updateLanding({ features: newFeatures });
                  }}
                  className="p-2 rounded-xl bg-rae-blue-500/10 text-rae-blue-500 hover:bg-rae-blue-500/20 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settings.landingPage?.features.map((feature, idx) => (
                  <div key={idx} className={cn(
                    "p-4 rounded-2xl border space-y-3 relative group",
                    darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                  )}>
                    <button
                      onClick={() => {
                        const newFeatures = settings.landingPage!.features.filter((_, i) => i !== idx);
                        updateLanding({ features: newFeatures });
                      }}
                      className="absolute top-2 right-2 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <input 
                      type="text"
                      value={feature.title}
                      onChange={e => {
                        const newFeatures = [...settings.landingPage!.features];
                        newFeatures[idx].title = e.target.value;
                        updateLanding({ features: newFeatures });
                      }}
                      className="w-full bg-transparent font-bold outline-none border-b border-transparent focus:border-rae-blue-500"
                      placeholder="Título Feature"
                    />
                    <textarea 
                      value={feature.description}
                      onChange={e => {
                        const newFeatures = [...settings.landingPage!.features];
                        newFeatures[idx].description = e.target.value;
                        updateLanding({ features: newFeatures });
                      }}
                      className="w-full bg-transparent text-sm text-gray-500 outline-none min-h-[60px]"
                      placeholder="Descripción"
                    />
                    <div className="flex gap-2">
                       <input 
                        type="text"
                        value={feature.color}
                        onChange={e => {
                          const newFeatures = [...settings.landingPage!.features];
                          newFeatures[idx].color = e.target.value;
                          updateLanding({ features: newFeatures });
                        }}
                        className="flex-1 bg-transparent text-[10px] uppercase font-bold outline-none border-b border-transparent focus:border-rae-blue-500"
                        placeholder="Color (Tailwind Gray)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Showcase Section Editor */}
            <div className={cn(
              "p-8 rounded-[2.5rem] border space-y-6",
              darkMode ? "bg-black/20 border-white/5" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard className="w-5 h-5 text-rae-blue-500" />
                <h4 className="font-bold uppercase text-xs tracking-widest text-gray-400">Sección de Exhibición (Showcase)</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Título del Showcase</label>
                    <textarea 
                      value={settings.landingPage?.showcaseTitle}
                      onChange={e => updateLanding({ showcaseTitle: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500 min-h-[80px]",
                        darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Descripción del Showcase</label>
                    <textarea 
                      value={settings.landingPage?.showcaseDescription}
                      onChange={e => updateLanding({ showcaseDescription: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500 min-h-[80px]",
                        darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">URL Imagen Showcase</label>
                    <input 
                      type="text"
                      value={settings.landingPage?.showcaseImageUrl || ''}
                      onChange={e => updateLanding({ showcaseImageUrl: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-rae-blue-500",
                        darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200"
                      )}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section Editor */}
            <div className={cn(
              "p-8 rounded-[2.5rem] border space-y-6 text-white bg-gradient-to-br from-blue-600 to-indigo-700",
              darkMode ? "border-white/5 shadow-2xl" : "border-transparent"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="w-5 h-5 text-white/50" />
                <h4 className="font-bold uppercase text-xs tracking-widest text-white/50">Cierre (CTA Section)</h4>
              </div>
              
              <div className="space-y-4">
                <input 
                  type="text"
                  value={settings.landingPage?.ctaTitle}
                  onChange={e => updateLanding({ ctaTitle: e.target.value })}
                  className="w-full bg-transparent text-3xl font-bold outline-none border-b border-white/20 focus:border-white placeholder:text-white/30"
                  placeholder="Título de Cierre"
                />
                <textarea 
                  value={settings.landingPage?.ctaDescription}
                  onChange={e => updateLanding({ ctaDescription: e.target.value })}
                  className="w-full bg-transparent text-lg outline-none border-b border-white/20 focus:border-white placeholder:text-white/30 min-h-[80px]"
                  placeholder="Descripción de Cierre"
                />
                <input 
                  type="text"
                  value={settings.landingPage?.ctaButtonText}
                  onChange={e => updateLanding({ ctaButtonText: e.target.value })}
                  className="px-6 py-2 bg-white text-blue-600 rounded-xl font-bold outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Texto Botón"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-10 py-5 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-[2rem] font-bold transition-all shadow-2xl shadow-rae-blue-900/40 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Guardar Configuración
        </button>
      </div>
    </div>
  );
}
