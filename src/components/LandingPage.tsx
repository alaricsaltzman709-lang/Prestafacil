import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  HandCoins, 
  Users, 
  ShieldCheck, 
  Database, 
  Cloud, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2,
  Lock,
  Smartphone,
  ChevronRight,
  FileText,
  Briefcase
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AppSettings } from '../types';
import { FONTS } from '../constants';

interface LandingPageProps {
  onLoginClick: () => void;
  settings?: AppSettings;
}

export default function LandingPage({ onLoginClick, settings }: LandingPageProps) {
  const [activeFeature, setActiveFeature] = useState(0);

  const landing = settings?.landingPage;

  const Logo = () => {
    if (settings?.logoUrl) {
      return (
        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20">
          <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold italic shadow-lg shadow-blue-500/20">
        RAE
      </div>
    );
  };

  const IconComponent = ({ name, className }: { name: string, className?: string }) => {
    const icons: Record<string, any> = {
      LayoutDashboard, HandCoins, Users, ShieldCheck, Database, Cloud, TrendingUp, CheckCircle2, Lock, Smartphone, FileText, Briefcase
    };
    const Icon = icons[name] || CheckCircle2;
    return <Icon className={className} />;
  };

  const features = landing?.features || [
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
  ];

  return (
    <div 
      className="text-white selection:bg-blue-500/30 min-h-screen" 
      style={{ 
        backgroundColor: landing?.backgroundColor || '#0a0f1d',
        fontFamily: settings?.primaryFont ? (FONTS.find(f => f.name === settings.primaryFont)?.value || 'inherit') : 'inherit',
        fontSize: settings?.fontSize === 'small' ? '0.9rem' : settings?.fontSize === 'large' ? '1.1rem' : '1rem'
      }}
    >
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/5" style={{ backgroundColor: `${landing?.backgroundColor || '#0a0f1d'}cc` }}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="font-bold text-xl tracking-tight hidden sm:block uppercase">{settings?.appName || 'RAE Marketing Services'}</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLoginClick}
              className="text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={onLoginClick}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
            >
              {landing?.heroCtaText || 'Empezar Gratis'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8"
          >
            <ShieldCheck className="w-4 h-4" />
            {settings?.appName || 'Control de Préstamos Empresarial'}
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[1.1]"
          >
            <span className={cn("text-transparent bg-clip-text bg-gradient-to-r", landing?.heroGradient || "from-blue-400 via-indigo-400 to-purple-400")}>
              {landing?.heroTitle || 'Domina tus Finanzas con Inteligencia'}
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10"
          >
            {landing?.heroSubtitle || 'La plataforma definitiva para prestamistas y agencias.'}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button 
              onClick={onLoginClick}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 group"
            >
              {landing?.heroCtaText || 'Comenzar Ahora'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            {landing?.heroShowDemo && (
              <button 
                className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold text-lg transition-all"
              >
                Ver Demo
              </button>
            )}
          </motion.div>

          {landing?.heroImageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative max-w-5xl mx-auto"
            >
               <div className="absolute inset-0 bg-blue-600/20 blur-[100px] -z-10 rounded-full"></div>
               <img 
                src={landing.heroImageUrl} 
                alt="Product Preview" 
                className="w-full rounded-[2.5rem] border border-white/10 shadow-2xl"
              />
            </motion.div>
          )}
        </div>
      </section>

      {/* Trust Marks */}
      <section className="py-10 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all">
            <span className="font-bold text-2xl flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-500"><Cloud className="w-6 h-6" /> Google Drive</span>
            <span className="font-bold text-2xl flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-500"><Database className="w-6 h-6" /> Supabase</span>
            <span className="font-bold text-2xl flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-500"><Lock className="w-6 h-6" /> FireStore</span>
            <span className="font-bold text-2xl flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-500"><Smartphone className="w-6 h-6" /> PWA Ready</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Poderosas herramientas para tu negocio</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">Optimiza cada aspecto de tu operación financiera con tecnología de punta.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -10 }}
                className="p-8 rounded-3xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.05] transition-all group"
              >
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br shadow-lg",
                  feature.color
                )}>
                  <IconComponent name={feature.icon} className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Showcase */}
      <section className="py-32 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="inline-flex px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                Control Total
              </div>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                {landing?.showcaseTitle || 'Gestiona miles de préstamos sin perder el control.'}
              </h2>
              <p className="text-gray-400 text-lg">
                {landing?.showcaseDescription || 'Optimiza tu negocio de préstamos con nuestra solución empresarial.'}
              </p>
              
              <div className="space-y-6">
                {[
                  { title: "Dashboard en tiempo real", desc: "Monitorea tu capital circulante e intereses al instante." },
                  { title: "Reportes Automatizados", desc: "Descarga reportes PDF/Excel para contabilidad en un clic." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{item.title}</h4>
                      <p className="text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={onLoginClick}
                className="px-8 py-4 bg-white text-black rounded-2xl font-bold transition-all hover:bg-gray-200"
              >
                Solicitar Acceso
              </button>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-full blur-[100px] absolute inset-0"></div>
              {landing?.showcaseImageUrl ? (
                <div className="relative p-2 rounded-[2rem] border border-white/10 bg-[#111111]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                  <img src={landing.showcaseImageUrl} alt="Showcase" className="w-full rounded-[1.5rem]" />
                </div>
              ) : (
                <div className="relative p-8 rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Crecimiento</p>
                        <p className="font-bold">Análisis Mensual</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase">+24.5%</p>
                      <p className="text-emerald-500 font-bold">En Alza</p>
                    </div>
                  </div>
                  
                  {/* Simulated Chart Bars */}
                  <div className="flex items-end gap-3 h-48 mb-8">
                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                      <motion.div 
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ delay: i * 0.1, duration: 1 }}
                        className="flex-grow bg-blue-600/20 rounded-t-lg relative group cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-blue-600 rounded-t-lg scale-x-0 group-hover:scale-x-100 transition-transform origin-bottom duration-300"></div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Capital Activo</p>
                      <p className="text-xl font-bold tracking-tight text-blue-400">$128,500</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Tasa de Mora</p>
                      <p className="text-xl font-bold tracking-tight text-rose-500">3.2%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-12 md:p-20 text-center relative overflow-hidden"
        >
          {/* Ornaments */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8">
              {landing?.ctaTitle || '¿Listo para transformar tu negocio?'}
            </h2>
            <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              {landing?.ctaDescription || 'Únete a las agencias que ya están optimizando su capital.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onLoginClick}
                className="w-full sm:w-auto px-10 py-5 bg-white text-blue-600 rounded-2xl font-bold text-xl shadow-xl hover:scale-105 transition-all active:scale-95"
              >
                {landing?.ctaButtonText || 'Empezar Ahora'}
              </button>
              <p className="text-blue-200 text-sm font-medium">No se requiere tarjeta de crédito</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <Logo />
              <span className="font-bold text-xl tracking-tight uppercase">{settings?.appName || 'RAE Marketing Services'}</span>
            </div>
            <p className="text-gray-500 max-w-sm mb-6 uppercase text-xs tracking-widest font-bold">
              Potenciando negocios de préstamos con tecnología de vanguardia.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-400">Producto</h4>
            <ul className="space-y-4 text-gray-500 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Tablero</a></li>
              <li><a href="#" className="hover:text-white transition-colors">KPIs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Seguridad</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Importación</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-400">Compañía</h4>
            <ul className="space-y-4 text-gray-500 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Sobre Nosotros</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Términos</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 text-center text-gray-600 text-sm">
          <p>© 2026 {settings?.appName || 'RAE Marketing Services'}. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
