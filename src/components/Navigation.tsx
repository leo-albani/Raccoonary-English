import React from 'react';

export type NavTab =
  | 'home'
  | 'translator'
  | 'trail'
  | 'settings'
  | 'memorize'
  | 'grammar'
  | 'pronunciation'
  | 'reading'
  | 'import'
  | 'wardrobe';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  dueCount?: number;
  t?: (key: string) => string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  dueCount = 0,
  t,
}) => {
  // 4 Primary Macro-Areas in the bottom navigation
  const tabs: { id: NavTab; label: string; icon: string; badge?: number; matchTabs?: NavTab[] }[] = [
    {
      id: 'home',
      label: t ? t('nav.home') : 'Tana',
      icon: '🏠',
      matchTabs: ['home', 'wardrobe', 'import'],
    },
    {
      id: 'translator',
      label: 'Traduttore',
      icon: '🔤',
      matchTabs: ['translator'],
    },
    {
      id: 'trail',
      label: 'Sentiero',
      icon: '🧭',
      badge: dueCount,
      matchTabs: ['trail', 'memorize', 'grammar', 'pronunciation', 'reading'],
    },
    {
      id: 'settings',
      label: t ? t('nav.profile') : 'Impostazioni',
      icon: '⚙️',
      matchTabs: ['settings'],
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#6B7C4F]/20 px-2 sm:px-6 pt-2 pb-safe pb-3 z-40 shadow-xl select-none">
      <div className="max-w-xl mx-auto grid grid-cols-4 items-center gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = tab.matchTabs ? tab.matchTabs.includes(currentTab) : currentTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tour-target-nav-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`min-h-[46px] w-full flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all relative cursor-pointer ${
                isActive
                  ? 'bg-[#E8802F]/15 text-[#E8802F] font-bold shadow-2xs'
                  : 'text-[#3A2B22]/65 hover:text-[#3A2B22] hover:bg-gray-100/60'
              }`}
            >
              <span className="text-2xl leading-none">{tab.icon}</span>
              <span className="text-[11px] sm:text-xs mt-1 font-display leading-tight truncate max-w-full font-bold">
                {tab.label}
              </span>

              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 right-2 sm:right-4 bg-[#E8802F] text-white text-[9px] font-bold rounded-full h-4.5 min-w-[18px] px-1 flex items-center justify-center shadow-xs border-2 border-white">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
