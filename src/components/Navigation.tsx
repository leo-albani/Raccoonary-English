import React from 'react';

export type NavTab = 'home' | 'memorize' | 'grammar' | 'pronunciation' | 'reading' | 'import' | 'settings' | 'wardrobe';

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
  const tabs: { id: NavTab; label: string; icon: string; badge?: number }[] = [
    { id: 'home', label: t ? t('nav.home') : 'Tana', icon: '🏠' },
    { id: 'memorize', label: t ? t('nav.memorize') : 'Ripasso', icon: '⚡', badge: dueCount },
    { id: 'pronunciation', label: 'Pronuncia', icon: '🎙️' },
    { id: 'grammar', label: t ? t('nav.grammar') : 'Grammatica', icon: '✏️' },
    { id: 'reading', label: t ? t('nav.reading') : 'Lettura', icon: '📚' },
    { id: 'import', label: 'Importa', icon: '📥' },
    { id: 'settings', label: t ? t('nav.profile') : 'Opzioni', icon: '⚙️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#6B7C4F]/20 px-1 sm:px-4 pt-2 pb-safe pb-3 z-40 shadow-xl select-none">
      <div className="max-w-2xl mx-auto grid grid-cols-7 items-center gap-0.5 sm:gap-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`min-h-[44px] min-w-[44px] w-full flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all relative cursor-pointer ${
                isActive
                  ? 'bg-[#E8802F]/15 text-[#E8802F] font-bold scale-105'
                  : 'text-[#3A2B22]/65 hover:text-[#3A2B22] hover:bg-gray-100/60'
              }`}
            >
              <span className="text-xl sm:text-2xl leading-none">{tab.icon}</span>
              <span className="text-[10px] sm:text-xs mt-1 font-display leading-tight truncate max-w-full">
                {tab.label}
              </span>

              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 right-1 bg-[#E8802F] text-white text-[9px] font-bold rounded-full h-4.5 min-w-[18px] px-1 flex items-center justify-center shadow-xs border-2 border-white">
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

