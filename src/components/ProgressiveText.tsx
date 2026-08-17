import React, { useState, useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface ProgressiveTextProps {
  text: string;
  speedMs?: number;
  onComplete?: () => void;
  className?: string;
  allowSkip?: boolean;
}

export const ProgressiveText: React.FC<ProgressiveTextProps> = ({
  text,
  speedMs = 80,
  onComplete,
  className = '',
  allowSkip = true,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const words = React.useMemo(() => {
    if (!text) return [];
    return text.trim().split(/\s+/);
  }, [text]);

  const [visibleCount, setVisibleCount] = useState<number>(() => {
    return prefersReducedMotion ? words.length : 0;
  });

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleCount(words.length);
      if (onCompleteRef.current) onCompleteRef.current();
      return;
    }

    setVisibleCount(1);
    if (words.length <= 1) {
      if (onCompleteRef.current) onCompleteRef.current();
      return;
    }

    let current = 1;
    const interval = setInterval(() => {
      current += 1;
      setVisibleCount(current);
      if (current >= words.length) {
        clearInterval(interval);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [text, words.length, speedMs, prefersReducedMotion]);

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allowSkip && visibleCount < words.length) {
      setVisibleCount(words.length);
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }
  };

  const isComplete = visibleCount >= words.length;
  const displayedText = React.useMemo(() => {
    if (visibleCount >= words.length) {
      return text;
    }
    return words.slice(0, visibleCount).join(' ');
  }, [visibleCount, words, text]);

  return (
    <span
      onClick={handleSkip}
      className={`inline ${allowSkip && !isComplete ? 'cursor-pointer' : ''} ${className}`}
      title={!isComplete ? 'Tocca per rivelare tutto il testo' : undefined}
    >
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-1.5 h-3 ml-1 bg-[#E8802F] rounded-xs animate-pulse align-middle" />
      )}
    </span>
  );
};
