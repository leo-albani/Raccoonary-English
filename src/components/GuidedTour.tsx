import React, { useState, useEffect, useCallback } from 'react';
import { Mascot } from '../mascot/Mascot';
import { ProgressiveText } from './ProgressiveText';
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
    id: 'menu',
    targetId: 'tour-target-nav-hamburger',
    textKey: 'tour.step.menu',
    pose: 'thinking',
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
  t,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [balloonPos, setBalloonPos] = useState<{ top?: number; bottom?: number; left: number; isAbove: boolean }>({
    top: 100,
    left: 16,
    isAbove: false,
  });

  const tr = (key: string, params?: Record<string, string | number>) => {
    if (key === 'tour.step.menu') {
      return 'Tocca il menu in alto a sinistra per accedere rapidamente alle 3 sezioni: Tana, Traduttore e Impostazioni!';
    }
    return t ? t(key, params) : getTranslation(key, null, params);
  };

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
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1A1512]/90 hover:bg-[#1A1512] text-[#F2E8D5] text-xs font-bold border border-[#6B7C4F]/40 backdrop-blur-md shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <span>{tr('tour.skip')}</span>
          <X className="w-3.5 h-3.5 text-[#F2E8D5]/80" />
        </button>
      </div>

      {/* STEP 1-3: Spotlight + Speech Balloon */}
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
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.82)',
            }}
          >
            {/* Pulsing ring around highlighted element */}
            <div className="w-full h-full rounded-2xl border-2 border-[#E8802F] shadow-[0_0_20px_rgba(232,128,47,0.7)] animate-pulse" />
          </div>

          {/* Click blocker for backdrop area */}
          <div
            className="fixed inset-0 z-[105]"
            onClick={(e) => {
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
            <div className="bg-[#2B2622] text-[#F2E8D5] rounded-3xl p-5 shadow-2xl border-2 border-[#6B7C4F]/40 space-y-4 animate-fade-in relative">
              {/* Header Step Counter */}
              <div className="flex items-center justify-between border-b border-[#6B7C4F]/25 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#E8802F] uppercase tracking-wider font-display">
                  <Sparkles className="w-3.5 h-3.5 text-[#E8802F]" />
                  <span>{tr('tour.guideTitle')}</span>
                </div>
                <span className="text-[11px] font-bold text-[#F2E8D5]/70 px-2.5 py-0.5 bg-[#1A1512] rounded-full border border-[#6B7C4F]/30 font-display">
                  {currentStepIndex + 1} / {TOUR_STEPS.length - 1}
                </span>
              </div>

              {/* Rocky + Message Body */}
              <div className="flex items-start gap-3.5">
                <div className="shrink-0 -ml-1 -mt-1">
                  <Mascot pose={currentStep.pose} size={85} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-xs sm:text-sm text-[#F2E8D5] font-semibold leading-relaxed">
                    "<ProgressiveText text={stepText} speedMs={80} />"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#6B7C4F]/20">
                <button
                  onClick={handleNext}
                  id="btn-tour-next"
                  className="px-5 py-2.5 rounded-2xl bg-[#E8802F] hover:bg-[#d87425] text-[#1A1512] text-xs font-extrabold shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 font-display"
                >
                  <span>{tr('tour.next')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fallback if target element not found */}
      {!isFinalStep && !spotlight && (
        <div className="fixed inset-0 bg-black/80 z-[105] flex items-center justify-center p-4">
          <div className="bg-[#2B2622] text-[#F2E8D5] rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-[#6B7C4F]/40 text-center space-y-4">
            <div className="flex justify-center">
              <Mascot pose={currentStep.pose} size={100} />
            </div>
            <p className="text-sm font-semibold text-[#F2E8D5]">"<ProgressiveText text={stepText} speedMs={80} />"</p>
            <div className="flex justify-center pt-2">
              <button
                onClick={handleNext}
                id="btn-tour-next-fallback"
                className="px-6 py-2.5 rounded-2xl bg-[#E8802F] text-[#1A1512] text-xs font-extrabold shadow-md flex items-center gap-2 font-display cursor-pointer"
              >
                <span>{tr('tour.next')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Step - Centered Modal */}
      {isFinalStep && (
        <div className="fixed inset-0 bg-black/85 z-[110] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#2B2622] text-[#F2E8D5] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-[#6B7C4F]/40 text-center space-y-5">
            <div className="flex justify-center pt-1">
              <div className="relative">
                <Mascot pose="happy" size={130} />
                <span className="absolute -top-2 -right-2 text-2xl">✨</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-extrabold font-display text-[#F2E8D5]">
                {tr('tour.finalTitle')}
              </h3>
              <p className="text-sm sm:text-base text-[#F2E8D5]/80 font-medium leading-relaxed px-2">
                "{stepText}"
              </p>
            </div>

            <div className="pt-3">
              <button
                onClick={onComplete}
                id="btn-tour-finish"
                className="btn-zucca w-full py-3.5 px-6 text-base shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-[#1A1512]" />
                <span>{tr('tour.finish')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default GuidedTour;
