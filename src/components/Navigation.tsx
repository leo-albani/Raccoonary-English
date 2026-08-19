import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { Home, Languages, Settings as SettingsIcon } from 'lucide-react';

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
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      // Scroll Down -> Hide bar (threshold 8px, after passing header area)
      if (diff > 8 && currentScrollY > 60) {
        setIsVisible(false);
      }
      // Scroll Up or reached near top -> Show bar
      else if (diff < -6 || currentScrollY <= 40) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;

      // Stop scrolling -> Reveal bar after short pause
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const navItems = [
    {
      id: 'home' as NavTab,
      label: t ? t('nav.home') : 'Tana',
      icon: Home,
      badge: dueCount,
      tourId: 'tour-target-nav-home',
    },
    {
      id: 'translator' as NavTab,
      label: 'Traduttore',
      icon: Languages,
      tourId: 'tour-target-nav-translator',
    },
    {
      id: 'settings' as NavTab,
      label: t ? t('nav.profile') : 'Impostazioni',
      icon: SettingsIcon,
      tourId: 'tour-target-nav-settings',
    },
  ];

  return (
    <>
      {/* Hidden button targets for tour / test backwards compatibility */}
      <div className="sr-only" aria-hidden="true">
        <button id="tour-target-nav-hamburger" onClick={() => onSelectTab('home')} />
      </div>

      {/* Persistent Floating Bottom Navigation Bar */}
      <nav
        id="tour-target-nav-bottom"
        aria-label="Navigazione principale"
        className={`fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-2 pointer-events-none transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-y-0' : 'translate-y-24'
        }`}
      >
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-[#2B2622]/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-[#6B7C4F]/40 shadow-2xl p-1.5 flex items-center justify-around gap-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  id={item.tourId}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-[#E8802F] text-[#1A1512] shadow-md font-extrabold scale-[1.02]'
                      : 'text-[#F2E8D5]/70 hover:text-[#F2E8D5] hover:bg-[#3A332D] font-bold'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`absolute -top-1.5 -right-2.5 text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow font-display border ${
                          isActive
                            ? 'bg-[#1A1512] text-[#E8802F] border-[#E8802F]'
                            : 'bg-[#E8802F] text-[#1A1512] border-[#1A1512]'
                        }`}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs font-display mt-0.5 tracking-tight truncate max-w-full">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
