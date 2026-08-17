import React, { useState, useEffect } from 'react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile } from '../types';
import { TARGET_LANGUAGES } from '../data/languages';
import { Menu, X } from 'lucide-react';

export type NavTab =
  | 'home'
  | 'translator'
  | 'settings'
  | 'memorize'
  | 'grammar'
  | 'pronunciation'
  | 'reading'
  | 'scenarios'
  | 'import';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  dueCount?: number;
  user?: UserProfile;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  dueCount = 0,
  user,
  t,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const activeLang = TARGET_LANGUAGES.find((l) => l.code === (user?.activeProfileId || 'en')) || {
    code: 'en',
    name: 'Inglese',
    flag: '🇬🇧',
  };

  const navItems: {
    id: NavTab;
    label: string;
    icon: string;
    badge?: number;
    description?: string;
  }[] = [
    {
      id: 'home',
      label: t ? t('nav.home') : 'Tana',
      icon: '🏠',
      badge: dueCount,
      description: 'Hub centrale e percorso di studio',
    },
    {
      id: 'translator',
      label: 'Traduttore & Dizionario',
      icon: '🔤',
      description: 'Cerca, ascolta e salva in tana',
    },
    {
      id: 'settings',
      label: t ? t('nav.profile') : 'Impostazioni',
      icon: '⚙️',
      description: 'Profilo, notifiche e preferenze',
    },
  ];

  const handleNavigate = (tab: NavTab) => {
    onSelectTab(tab);
    setIsOpen(false);
  };

  // Greeting in drawer
  const hour = new Date().getHours();
  let timeGreeting = 'Buondì';
  if (hour >= 18 || hour < 5) timeGreeting = 'Buonasera';
  else if (hour >= 12) timeGreeting = 'Buon pomeriggio';

  const userName = user?.firstName || user?.username || 'Esploratore';

  return (
    <>
      {/* Fixed Hamburger Button on Top-Left */}
      <button
        id="tour-target-nav-hamburger"
        onClick={() => setIsOpen(true)}
        aria-label="Apri menu di navigazione"
        className="fixed top-4 left-4 z-40 bg-[#2B2622] text-[#F2E8D5] p-3 rounded-2xl border-2 border-[#6B7C4F]/40 shadow-xl hover:border-[#E8802F] hover:bg-[#342D28] active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
      >
        <Menu className="w-6 h-6 text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors" />

        {dueCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#E8802F] text-[#1A1512] text-[10px] font-extrabold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-md border-2 border-[#1A1512] animate-pulse font-display">
            {dueCount > 99 ? '99+' : dueCount}
          </span>
        )}
      </button>

      {/* Hidden nav targets for guided tour backwards-compatibility */}
      <div className="sr-only" aria-hidden="true">
        <button id="tour-target-nav-home" onClick={() => onSelectTab('home')} />
        <button id="tour-target-nav-translator" onClick={() => onSelectTab('translator')} />
        <button id="tour-target-nav-settings" onClick={() => onSelectTab('settings')} />
      </div>

      {/* Slide-in Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 animate-fade-in transition-opacity"
        />
      )}

      {/* Slide-in Drawer Panel (~80% width on mobile) */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-[82vw] max-w-xs sm:max-w-sm bg-[#2B2622] text-[#F2E8D5] z-50 shadow-2xl border-r-2 border-[#6B7C4F]/35 p-5 flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header Section with Close Button */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#6B7C4F]/20">
            <div className="flex items-center gap-2">
              <span className="text-xl">🦝</span>
              <span className="font-display font-extrabold text-lg tracking-wide text-[#F2E8D5]">
                RACCOONARY
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Chiudi menu"
              className="p-2 rounded-xl bg-[#1A1512] text-[#F2E8D5]/80 hover:text-[#F2E8D5] hover:bg-[#3A2B22] border border-[#6B7C4F]/30 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Rocky Mascot Greeting in Drawer Header */}
          <div className="my-4 p-3.5 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/30 flex items-center gap-3.5">
            <Mascot pose="greeting" size={68} className="shrink-0" />
            <div className="space-y-0.5 overflow-hidden">
              <p className="text-[11px] font-bold text-[#E8802F] uppercase tracking-wider font-display">
                {timeGreeting}, {userName}!
              </p>
              <p className="text-xs text-[#F2E8D5]/80 font-medium line-clamp-2 leading-relaxed">
                {dueCount > 0
                  ? `Ci sono ${dueCount} parole pronte in tana.`
                  : 'Tutto pronto per esplorare la tana!'}
              </p>
            </div>
          </div>

          {/* Navigation Items List */}
          <div className="space-y-1.5 mt-4">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left group ${
                    isActive
                      ? 'bg-[#E8802F] text-[#1A1512] font-bold shadow-md'
                      : 'text-[#F2E8D5]/85 hover:text-[#F2E8D5] hover:bg-[#1A1512]/70 border border-transparent hover:border-[#6B7C4F]/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <p
                        className={`text-sm font-display font-bold leading-tight truncate ${
                          isActive ? 'text-[#1A1512]' : 'text-[#F2E8D5]'
                        }`}
                      >
                        {item.label}
                      </p>
                      {item.description && (
                        <p
                          className={`text-[10px] truncate ${
                            isActive ? 'text-[#1A1512]/75 font-medium' : 'text-[#F2E8D5]/50'
                          }`}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`text-[10px] font-extrabold rounded-full px-2 py-0.5 shrink-0 ${
                        isActive
                          ? 'bg-[#1A1512] text-[#E8802F]'
                          : 'bg-[#E8802F] text-[#1A1512]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer Bottom Info Footer */}
        <div className="pt-4 mt-6 border-t border-[#6B7C4F]/20 flex items-center justify-between text-xs text-[#F2E8D5]/60">
          <div className="flex items-center gap-2 bg-[#1A1512] px-3 py-1.5 rounded-xl border border-[#6B7C4F]/30">
            <span className="text-base">{activeLang.flag}</span>
            <span className="font-bold text-[#F2E8D5] font-display text-xs">
              {activeLang.name}
            </span>
          </div>

          <span className="text-[11px] font-display font-medium text-[#6B7C4F]">
            Livello: {user?.livelloStudioAttivo || user?.currentLevel || 'A1'}
          </span>
        </div>
      </div>
    </>
  );
};
export default Navigation;
