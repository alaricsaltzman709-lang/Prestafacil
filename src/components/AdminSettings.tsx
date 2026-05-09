import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { 
  Palette, 
  Type, 
  Layout, 
  Image as ImageIcon, 
  Check, 
  Save,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppSettings } from '../types';
import { cn } from '../lib/utils';

interface AdminSettingsProps {
  darkMode: boolean;
  onSettingsUpdate: (settings: AppSettings) => void;
}

export const FONTS = [
  { name: 'Inter', value: 'var(--font-sans)', category: 'Sans' },
  { name: 'Space Grotesk', value: '"Space Grotesk", sans-serif', category: 'Tech' },
  { name: 'Playfair Display', value: '"Playfair Display", serif', category: 'Serif' },
  { name: 'JetBrains Mono', value: 'var(--font-mono)', category: 'Mono' },
];

export default function AdminSettings({ darkMode, onSettingsUpdate }: AdminSettingsProps) {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'RAE Marketing Services',
    fontSize: 'medium',
    primaryFont: 'Inter'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'config', 'app');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings(snap.data() as AppSettings);
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
      
      // Also sync to Supabase if possible/requested
      // ... Supabase logic here ...
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-rae-blue-500" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h3 className="text-2xl font-bold">Personalización del Sistema</h3>
        <p className="text-gray-500">Configura la identidad visual y experiencia de la aplicación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-4 bg-rae-blue-600 hover:bg-rae-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-rae-blue-900/40 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
