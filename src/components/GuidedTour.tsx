import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mascot } from '../mascot/Mascot';
import { RaccoonPose } from '../types';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { getTranslation } from '../i18n/translations';

export interface TourStep {
  id: string;
  targetId: string | null;
  textKey: string;
  pose: RaccoonPose;
  titleKey?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'streak',
    targetId: 'tour-target-streak',
    textKey: 'tour.step.streak',
    pose: 'greeting',
  },
  {
    id: 'review',
    targetId: 'tour-target-word-burrow',
    textKey: 'tour.step.review',
    pose: 'happy',
  },
  {
    id: 'translator',
    targetId: 'tour-target-nav-translator',
    textKey: 'tour.step.translator',
    pose: 'thinking',
  },
  {
    id: 'trail',
    targetId: 'tour-target-nav-trail',
    textKey: 'tour.step.grammar',
    pose: 'reading',
  },
  {
    id: 'settings',
    targetId: 'tour-target-nav-settings',
    textKey: 'tour.step.settings',
    pose: 'greeting',
  },
  {
    id: 'final',
    targetId: null,
    titleKey: 'tour.finalTitle',
    textKey: 'tour.step.final',
    pose: 'happy',
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  activeOutfit?: string;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isOpen,
  onComplete,
  onSkip,
  activeOutfit = 'base',
  t,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [balloonPos, setBalloonPos] = useState<{ top?: number; bottom?: number; left: number; isAbove: boolean }>({
    top: 100,
    left: 16,
    isAbove: false,
  });

  const tr = (key: string, params?: Record<string, string | number>) =>
    t ? t(key, params) : getTranslation(key, null, params);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const stepText = currentStep ? tr(currentStep.textKey) : '';

  // Function to calculate and update spotlight rect
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep || !currentStep.targetId) {
      setSpotlight(null);
      return;
    }

    const element = document.getElementById(currentStep.targetId);
    if (!element) {
      setSpotlight(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 8;
    const top = Math.max(0, rect.top - padding);
    const left = Math.max(0, rect.left - padding);
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;

    setSpotlight({ top, left, width, height });

    // Calculate balloon position
    const isLowerHalf = top + height / 2 > window.innerHeight / 2;
    const cardWidth = Math.min(window.innerWidth - 32, 380);
    let targetLeft = left + width / 2 - cardWidth / 2;
    targetLeft = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, targetLeft));

    if (isLowerHalf) {
      const bottom = window.innerHeight - top + 12;
      setBalloonPos({ bottom, left: targetLeft, isAbove: true });
    } else {
      const balloonTop = top + height + 12;
      setBalloonPos({ top: balloonTop, left: targetLeft, isAbove: false });
    }
  }, [isOpen, currentStepIndex]);

  // Scroll target element into view and update rect
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep && currentStep.targetId) {
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }

    // Delay slightly to allow scroll animation to settle
    const timer = setTimeout(() => {
      updateTargetRect();
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, currentStepIndex, updateTargetRect]);

  // Event listeners for window resize & scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      requestAnimationFrame(updateTargetRect);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, updateTargetRect]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const isFinalStep = currentStep.targetId === null;

  return (
    <div className="fixed inset-0 z-[100] select-none overflow-hidden font-sans">
      {/* Top right "Salta tour" button */}
      <div className="fixed top-4 right-4 z-[120]">
        <button
          onClick={handleSkip}
          id="btn-tour-skip"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-bold border border-white/30 backdrop-blur-md shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <span>{tr('tour.skip')}</span>
          <X className="w-3.5 h-3.5 text-white/80" />
        </button>
      </div>

      {/* STEP 1-7: Spotlight + Speech Balloon */}
      {!isFinalStep && spotlight && (
        <>
          {/* Dark Overlay with Spotlight Cutout using box-shadow */}
          <div
            className="fixed transition-all duration-300 ease-out pointer-events-none rounded-2xl"
            style={{
              top: `${spotlight.top}px`,
              left: `${spotlight.left}px`,
              width: `${spotlight.width}px`,
              height: `${spotlight.height}px`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
            }}
          >
            {/* Pulsing ring around highlighted element */}
            <div className="w-full h-full rounded-2xl border-2 border-[#E8802F] shadow-[0_0_20px_rgba(232,128,47,0.7)] animate-pulse" />
          </div>

          {/* Click blocker for backdrop area */}
          <div
            className="fixed inset-0 z-[105]"
            onClick={(e) => {
              // Clicking anywhere outside advances step or keeps focus
              e.stopPropagation();
            }}
          />

          {/* Speech Balloon Card */}
          <div
            className="fixed z-[110] transition-all duration-300 ease-out w-[calc(100vw-32px)] sm:w-[380px]"
            style={{
              left: `${balloonPos.left}px`,
              ...(balloonPos.isAbove
                ? { bottom: `${balloonPos.bottom}px` }
                : { top: `${balloonPos.top}px` }),
            }}
          >
            <div className="bg-white rounded-3xl p-5 shadow-2xl border-2 border-[#6B7C4F]/30 space-y-4 animate-fade-in relative">
              {/* Header Step Counter */}
              <div className="flex items-center justify-between border-b border-[#6B7C4F]/15 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#E8802F] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[#E8802F]" />
                  <span>{tr('tour.guideTitle')}</span>
                </div>
                <span className="text-[11px] font-bold text-[#3A2B22]/60 px-2 py-0.5 bg-[#F2E8D5] rounded-full">
                  {currentStepIndex + 1} / {TOUR_STEPS.length - 1}
                </span>
              </div>

              {/* Rocky + Message Body */}
              <div className="flex items-start gap-3.5">
                <div className="shrink-0 -ml-1 -mt-1">
                  <Mascot pose={currentStep.pose} activeOutfit={activeOutfit} size={85} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-xs sm:text-sm text-[#3A2B22] font-semibold leading-relaxed">
                    "{stepText}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                <button
                  onClick={handleNext}
                  id="btn-tour-next"
                  className="px-5 py-2.5 rounded-2xl bg-[#6B7C4F] hover:bg-[#54633E] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <span>{tr('tour.next')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fallback if target element not found on steps 1-7 (e.g. mobile rendering delay) */}
      {!isFinalStep && !spotlight && (
        <div className="fixed inset-0 bg-black/75 z-[105] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-[#6B7C4F]/30 text-center space-y-4">
            <div className="flex justify-center">
              <Mascot pose={currentStep.pose} activeOutfit={activeOutfit} size={100} />
            </div>
            <p className="text-sm font-semibold text-[#3A2B22]">"{stepText}"</p>
            <div className="flex justify-center pt-2">
              <button
                onClick={handleNext}
                id="btn-tour-next-fallback"
                className="px-6 py-2.5 rounded-2xl bg-[#6B7C4F] text-white text-xs font-bold shadow-md flex items-center gap-2"
              >
                <span>{tr('tour.next')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 8: Final Step - Centered Modal */}
      {isFinalStep && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-[#6B7C4F]/40 text-center space-y-5">
            <div className="flex justify-center pt-1">
              <div className="relative">
                <Mascot pose="happy" activeOutfit={activeOutfit} size={130} />
                <span className="absolute -top-2 -right-2 text-2xl">✨</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold font-display text-[#3A2B22]">
                {tr('tour.finalTitle')}
              </h3>
              <p className="text-sm sm:text-base text-[#3A2B22]/80 font-medium leading-relaxed px-2">
                "{stepText}"
              </p>
            </div>

            <div className="pt-3">
              <button
                onClick={onComplete}
                id="btn-tour-finish"
                className="w-full py-3.5 px-6 rounded-2xl bg-[#E8802F] hover:bg-[#D47023] text-white font-bold font-display text-base shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-amber-200" />
                <span>{tr('tour.finish')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
