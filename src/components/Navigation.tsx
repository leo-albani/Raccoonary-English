import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';
import {
  Home,
  Languages,
  Settings as SettingsIcon,
  X,
  Zap,
  TreePine,
  BookOpen,
  Mic,
  Drama,
  Upload,
  ChevronRight,
  Menu,
  Compass,
} from 'lucide-react';
import { Mascot } from '../mascot/Mascot';
import { TARGET_LANGUAGES } from '../data/languages';
import { playSound } from '../services/sound';

export type NavTab =
  | 'home'
  | 'translator'
  | 'settings'
  | 'memorize'
  | 'grammar'
  | 'pronunciation'
  | 'reading'
  | 'scenarios'
  | 'import'
  | 'pathway';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  dueCount?: number;
  user?: UserProfile;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

const PRIMARY_TABS: NavTab[] = ['home', 'translator', 'settings'];
const DRAWER_WIDTH = 320;

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  dueCount = 0,
  user,
  t,
}) => {
  // If not on one of the 3 primary screens, navigation bar, button and gestures are completely disabled
  const isPrimary = PRIMARY_TABS.includes(currentTab);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null); // px offset from left (0 to DRAWER_WIDTH)

  // Gesture tracking refs
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);

  // Pointer & touch drag handling for edge swipe & drawer drag
  const handlePointerDown = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const isNearEdge = e.clientX <= Math.max(80, window.innerWidth * 0.25);
      if (!isDrawerOpen && !isNearEdge) return;

      isDraggingRef.current = true;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startTimeRef.current = Date.now();
    },
    [isDrawerOpen]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - startXRef.current;
      const dy = Math.abs(e.clientY - startYRef.current);

      // If vertical scroll dominates, cancel horizontal drag
      if (dy > 80 && Math.abs(dx) < 25 && dragProgress === null) {
        isDraggingRef.current = false;
        return;
      }

      if (!isDrawerOpen) {
        if (dx > 5) {
          const currentOffset = Math.min(DRAWER_WIDTH, Math.max(0, dx));
          setDragProgress(currentOffset);
        }
      } else {
        if (dx < 0) {
          const currentOffset = Math.min(DRAWER_WIDTH, Math.max(0, DRAWER_WIDTH + dx));
          setDragProgress(currentOffset);
        }
      }
    },
    [isDrawerOpen, dragProgress]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const dx = e.clientX - startXRef.current;
      const dt = Date.now() - startTimeRef.current;
      const isFlick = dt < 300 && Math.abs(dx) > 30;

      if (!isDrawerOpen) {
        if (dx > 70 || (isFlick && dx > 25)) {
          setIsDrawerOpen(true);
          playSound('acorn');
        }
      } else {
        if (dx < -70 || (isFlick && dx < -25)) {
          setIsDrawerOpen(false);
        }
      }

      setDragProgress(null);
    },
    [isDrawerOpen]
  );

  // Global window listeners for pointer gestures
  useEffect(() => {
    if (!isPrimary) return;

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isPrimary, handlePointerMove, handlePointerUp]);

  // Touch listener fallback for mobile webviews
  useEffect(() => {
    if (!isPrimary) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (touch.clientX <= Math.max(80, window.innerWidth * 0.25) || isDrawerOpen) {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = Math.abs(touch.clientY - touchStartY);
      const dt = Date.now() - touchStartTime;

      if (dy < 90 && dt < 600) {
        if (!isDrawerOpen && dx > 45) {
          setIsDrawerOpen(true);
          playSound('acorn');
        } else if (isDrawerOpen && dx < -45) {
          setIsDrawerOpen(false);
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isPrimary, isDrawerOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  if (!isPrimary) {
    return null;
  }

  const activeLang = TARGET_LANGUAGES.find((l) => l.code === (user?.activeProfileId || 'en')) || {
    code: 'en',
    name: 'Inglese',
    flag: '🇬🇧',
  };

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

  const activityItems = [
    { id: 'pathway' as NavTab, label: 'Il tuo Percorso', icon: Compass, color: 'text-[#E8802F]' },
    { id: 'memorize' as NavTab, label: 'Ripasso Vocaboli', icon: Zap, color: 'text-[#E8802F]', badge: dueCount },
    { id: 'grammar' as NavTab, label: 'Grammatica', icon: TreePine, color: 'text-[#859966]' },
    { id: 'reading' as NavTab, label: 'Letture', icon: BookOpen, color: 'text-[#C99A3D]' },
    { id: 'pronunciation' as NavTab, label: 'Pronuncia', icon: Mic, color: 'text-[#E8802F]' },
    { id: 'scenarios' as NavTab, label: 'Scenari', icon: Drama, color: 'text-[#D88A3D]' },
    { id: 'import' as NavTab, label: 'Importa Vocaboli', icon: Upload, color: 'text-[#859966]' },
  ];

  // Compute live drawer transform during drag or open state
  const isInteracting = dragProgress !== null;
  const currentTranslateX = isInteracting
    ? `${dragProgress! - DRAWER_WIDTH}px`
    : isDrawerOpen
    ? '0px'
    : `-${DRAWER_WIDTH}px`;

  const backdropOpacity = isInteracting
    ? (dragProgress! / DRAWER_WIDTH) * 0.7
    : isDrawerOpen
    ? 0.7
    : 0;

  const isDrawerVisible = isDrawerOpen || isInteracting;

  return (
    <>
      {/* Left Edge Hot-Zone (for initiating swipe drag from left screen border) */}
      <div
        onPointerDown={handlePointerDown}
        className="fixed top-0 bottom-0 left-0 w-6 sm:w-8 z-30 touch-none pointer-events-auto cursor-ew-resize"
        title="Trascina verso destra per aprire il menu"
      />

      {/* Single Fixed Hamburger Button (Position: fixed in top-left corner, only on primary screens) */}
      <button
        type="button"
        id="tour-target-nav-hamburger"
        onClick={() => {
          setIsDrawerOpen(true);
          playSound('acorn');
        }}
        aria-label="Apri menu di navigazione"
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-40 w-11 h-11 rounded-2xl bg-[#2B2622]/95 hover:bg-[#38312B] active:scale-95 border-2 border-[#6B7C4F]/50 hover:border-[#E8802F] text-[#F2E8D5] flex items-center justify-center shadow-2xl backdrop-blur-md transition-all cursor-pointer select-none group"
        title="Menu di navigazione (☰)"
      >
        <Menu className="w-5 h-5 text-[#859966] group-hover:text-[#E8802F] transition-colors stroke-[2.5]" />
        {dueCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8802F] text-[#1A1512] text-[10px] font-black flex items-center justify-center shadow font-display border border-[#1A1512]">
            {dueCount > 9 ? '9+' : dueCount}
          </span>
        )}
      </button>

      {/* Slide-In Navigation Drawer */}
      <div
        className={`fixed inset-0 z-50 ${
          isDrawerVisible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{
          visibility: isDrawerVisible ? 'visible' : 'hidden',
        }}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black backdrop-blur-xs transition-opacity duration-200"
          style={{
            opacity: backdropOpacity,
          }}
          onClick={() => setIsDrawerOpen(false)}
        />

        {/* Drawer Content with interactive translation */}
        <aside
          aria-label="Menu di navigazione"
          style={{
            transform: `translateX(${currentTranslateX})`,
            transition: isInteracting ? 'none' : 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
            width: `${DRAWER_WIDTH}px`,
          }}
          className="relative max-w-[85vw] bg-[#2B2622] text-[#F2E8D5] h-full shadow-2xl border-r-2 border-[#6B7C4F]/40 flex flex-col justify-between z-10 select-none"
        >
          {/* Drawer Header */}
          <div className="p-5 border-b border-[#6B7C4F]/30 bg-[#1E1916] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                <Mascot pose="happy" size={44} activeOutfit={user?.activeOutfit} />
              </div>
              <div>
                <h2 className="font-black font-display text-base text-[#F2E8D5] leading-tight">
                  Raccoonary
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs">{activeLang.flag}</span>
                  <span className="text-xs font-bold text-[#859966] font-display">
                    {activeLang.name}
                  </span>
                  {user?.livelloStudioAttivo && (
                    <span className="px-1.5 py-0.2 rounded bg-[#6B7C4F] text-[#1A1512] text-[10px] font-black font-display">
                      {user.livelloStudioAttivo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Chiudi menu"
              className="w-8 h-8 rounded-xl bg-[#2B2622] hover:bg-[#342D28] border border-[#6B7C4F]/40 text-[#F2E8D5]/70 hover:text-[#F2E8D5] flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Lists */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* Main Screens */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-[#859966] font-display block mb-1.5">
                Schermate Principali
              </span>
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold font-display text-sm transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#E8802F] text-[#1A1512] shadow-md font-black'
                        : 'text-[#F2E8D5] hover:bg-[#1A1512] hover:text-[#E8802F]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-xs font-black rounded-full px-2 py-0.5 ${
                          isActive ? 'bg-[#1A1512] text-[#E8802F]' : 'bg-[#E8802F] text-[#1A1512]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Study Activities Section */}
            <div className="pt-2 border-t border-[#6B7C4F]/20 space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-[#859966] font-display block mb-1.5">
                Attività di Studio
              </span>
              {activityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setIsDrawerOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold font-display text-[#F2E8D5] hover:bg-[#1A1512] hover:text-[#E8802F] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${item.color} group-hover:scale-110 transition-transform`} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#F2E8D5]/30 group-hover:text-[#E8802F] group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#6B7C4F]/30 bg-[#1E1916] text-xs text-[#F2E8D5]/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span title="Notti consecutive">🌙 {user?.streakCount || 0}</span>
              <span title="Ghiande totali">🌰 {user?.totalAcorns || 0}</span>
            </div>
            <span className="text-[11px] font-display font-medium text-[#859966]">
              ← Trascina per chiudere
            </span>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Navigation;
