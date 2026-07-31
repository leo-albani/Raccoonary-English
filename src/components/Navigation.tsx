import React from 'react';

export type NavTab = 'home' | 'memorize' | 'grammar' | 'reading' | 'import' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  dueCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  dueCount = 0,
}) => {
  const tabs: { id: NavTab; label: string; icon: string; badge?: number }[] = [
    { id: 'home', label: 'Tana', icon: '🏠' },
    { id: 'memorize', label: 'Ripasso', icon: '⚡', badge: dueCount },
    { id: 'grammar', label: 'Grammatica', icon: '🌲' },
    { id: 'reading', label: 'Lettura', icon: '📚' },
    { id: 'import', label: 'Importa', icon: '📥' },
    { id: 'settings', label: 'Opzioni', icon: '⚙️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#6B7C4F]/20 px-3 py-2 z-40 shadow-lg select-none">
      <div className="max-w-2xl mx-auto flex items-center justify-around gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative cursor-pointer ${
                isActive
                  ? 'bg-[#E8802F]/10 text-[#E8802F] font-bold scale-105'
                  : 'text-[#3A2B22]/60 hover:text-[#3A2B22] hover:bg-gray-100/60'
              }`}
            >
              <span className="text-xl sm:text-2xl leading-none">{tab.icon}</span>
              <span className="text-[10px] sm:text-xs mt-1 font-display leading-tight">{tab.label}</span>

              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-0 bg-[#E8802F] text-white text-[9px] font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center shadow-xs border-2 border-white">
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
