import React from 'react';
import { ProgressiveText } from '../components/ProgressiveText';

interface RockySpeechBubbleProps {
  text: string;
  className?: string;
  speedMs?: number;
  onComplete?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const RockySpeechBubble: React.FC<RockySpeechBubbleProps> = ({
  text,
  className = '',
  speedMs = 80,
  onComplete,
  position = 'top',
}) => {
  if (!text) return null;

  return (
    <div
      className={`bg-[#2B2622] text-[#F2E8D5] px-4 py-2.5 rounded-2xl shadow-xl border border-[#6B7C4F]/40 text-xs sm:text-sm font-medium relative animate-fade-in text-center leading-relaxed cursor-pointer select-none ${className}`}
    >
      <ProgressiveText text={text} speedMs={speedMs} onComplete={onComplete} />

      {/* Pointer arrow based on position */}
      {position === 'top' && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-[#2B2622]" />
      )}
      {position === 'bottom' && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[7px] border-b-[#2B2622]" />
      )}
      {position === 'right' && (
        <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[7px] border-r-[#2B2622]" />
      )}
      {position === 'left' && (
        <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[7px] border-l-[#2B2622]" />
      )}
    </div>
  );
};
