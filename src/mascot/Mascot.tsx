import React, { useState, useEffect, useRef } from 'react';
import { RaccoonPose } from '../types';
import { ProgressiveText } from '../components/ProgressiveText';
import { usePrefersReducedMotion } from '../components/usePrefersReducedMotion';

import greetingImg from '../assets/images/raccoon_greeting_1785942177114.jpg';
import happyImg from '../assets/images/raccoon_happy_1785942196675.jpg';
import thinkingImg from '../assets/images/raccoon_thinking_1785942213264.jpg';
import diggingImg from '../assets/images/raccoon_digging_1785942230819.jpg';
import sleepingImg from '../assets/images/raccoon_sleeping_1785942257003.jpg';
import readingImg from '../assets/images/raccoon_reading_1785942272591.jpg';

const POSE_IMAGES: Record<RaccoonPose, string> = {
  greeting: greetingImg,
  happy: happyImg,
  thinking: thinkingImg,
  digging: diggingImg,
  sleeping: sleepingImg,
  reading: readingImg,
};

interface MascotProps {
  pose?: RaccoonPose;
  size?: number;
  className?: string;
  speechBubble?: string;
  activeOutfit?: string;
  disableBreathing?: boolean;
  disableEntrance?: boolean;
  onSpeechComplete?: () => void;
}

export const Mascot: React.FC<MascotProps> = ({
  pose = 'greeting',
  size = 140,
  className = '',
  speechBubble,
  disableBreathing = false,
  disableEntrance = false,
  onSpeechComplete,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Pose transition state for smooth crossfading
  const [currentPose, setCurrentPose] = useState<RaccoonPose>(pose);
  const [previousPose, setPreviousPose] = useState<RaccoonPose | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pose !== currentPose) {
      if (prefersReducedMotion) {
        setCurrentPose(pose);
        setPreviousPose(null);
        setIsCrossfading(false);
        return;
      }

      setPreviousPose(currentPose);
      setCurrentPose(pose);
      setIsCrossfading(true);

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      // 250ms crossfade duration
      transitionTimerRef.current = setTimeout(() => {
        setPreviousPose(null);
        setIsCrossfading(false);
      }, 250);
    }

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [pose, currentPose, prefersReducedMotion]);

  const currentImgSrc = POSE_IMAGES[currentPose] || POSE_IMAGES.greeting;
  const previousImgSrc = previousPose ? (POSE_IMAGES[previousPose] || POSE_IMAGES.greeting) : null;

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${
        !disableEntrance ? 'raccoon-entrance' : ''
      } ${className}`}
    >
      {/* Speech Bubble with Progressive Word-by-Word Text */}
      {speechBubble && (
        <div
          className="mb-3 max-w-xs bg-[#2B2622] text-[#F2E8D5] px-4 py-2.5 rounded-2xl shadow-xl border border-[#6B7C4F]/40 text-xs sm:text-sm font-medium relative animate-fade-in text-center leading-relaxed cursor-pointer active:scale-98 transition-transform"
          title="Tocca per mostrare tutto il testo"
        >
          <ProgressiveText
            text={speechBubble}
            speedMs={80}
            onComplete={onSpeechComplete}
            allowSkip={true}
          />
          {/* Tip arrow pointing down to Rocky */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-[#2B2622]" />
        </div>
      )}

      {/* Spotlight container with gentle breathing motion & pose crossfade */}
      <div
        className={`rounded-full bg-[#2B2622] border-2 border-[#6B7C4F]/40 shadow-md p-1 flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-300 hover:scale-105 relative ${
          !disableBreathing ? 'raccoon-breathe' : ''
        }`}
        style={{ width: size, height: size }}
      >
        {/* Previous Image during crossfade */}
        {isCrossfading && previousImgSrc && (
          <img
            src={previousImgSrc}
            alt="Mascotta Raccoonary precedente"
            referrerPolicy="no-referrer"
            className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] object-cover rounded-full select-none pointer-events-none transition-opacity duration-250 opacity-0 z-0"
            style={{ transition: 'opacity 250ms ease-out' }}
          />
        )}

        {/* Current Active Pose Image */}
        <img
          src={currentImgSrc}
          alt={`Mascotta Raccoonary (${currentPose})`}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover rounded-full select-none relative z-10 transition-opacity ${
            isCrossfading ? 'duration-250 opacity-100' : 'opacity-100'
          }`}
          style={isCrossfading ? { transition: 'opacity 250ms ease-in' } : undefined}
        />
      </div>
    </div>
  );
};
export default Mascot;
