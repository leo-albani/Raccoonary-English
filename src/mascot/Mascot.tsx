import React from 'react';
import { RaccoonPose } from '../types';

interface MascotProps {
  pose?: RaccoonPose;
  size?: number;
  className?: string;
  speechBubble?: string;
}

export const Mascot: React.FC<MascotProps> = ({
  pose = 'greeting',
  size = 120,
  className = '',
  speechBubble,
}) => {
  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {speechBubble && (
        <div className="mb-2 max-w-xs bg-white text-[#3A2B22] p-3 rounded-2xl shadow-md border-2 border-[#6B7C4F]/30 text-xs sm:text-sm font-medium relative animate-fade-in text-center leading-relaxed">
          {speechBubble}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white" />
        </div>
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm select-none transition-all duration-300"
      >
        {/* Tail - striped raccoon tail */}
        <g id="tail">
          <path
            d="M 25 80 Q 5 70 12 92 Q 22 108 42 98 C 45 92 38 82 25 80 Z"
            fill="#6E6760"
          />
          <path
            d="M 16 75 Q 8 82 14 90 Q 22 84 26 78 Z"
            fill="#2B2622"
          />
          <path
            d="M 22 88 Q 18 97 28 100 Q 34 94 30 87 Z"
            fill="#2B2622"
          />
        </g>

        {/* Body */}
        <ellipse cx="60" cy="82" rx="28" ry="24" fill="#7D756D" />
        <ellipse cx="60" cy="84" rx="18" ry="16" fill="#F2E8D5" />

        {/* Ears */}
        <path d="M 38 36 Q 30 18 48 26 Z" fill="#6E6760" />
        <path d="M 40 34 Q 34 22 46 28 Z" fill="#F2E8D5" />

        <path d="M 82 36 Q 90 18 72 26 Z" fill="#6E6760" />
        <path d="M 80 34 Q 86 22 74 28 Z" fill="#F2E8D5" />

        {/* Head */}
        <ellipse cx="60" cy="48" rx="30" ry="24" fill="#7D756D" />
        {/* Inner face patch */}
        <path
          d="M 36 50 C 36 38, 84 38, 84 50 C 84 62, 36 62, 36 50 Z"
          fill="#F2E8D5"
        />

        {/* Raccoon Mask (Bandit Eyes) */}
        <path
          d="M 35 48 C 42 42, 54 44, 60 49 C 66 44, 78 42, 85 48 C 88 54, 75 58, 60 54 C 45 58, 32 54, 35 48 Z"
          fill="#2B2622"
        />

        {/* Nose */}
        <ellipse cx="60" cy="54" rx="4" ry="3" fill="#1F1A17" />
        <ellipse cx="59" cy="53" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.6" />

        {/* Eyes & Mouth depending on Pose */}
        {pose === 'sleeping' ? (
          <>
            {/* Sleeping Eyes */}
            <path d="M 45 48 Q 49 52 53 48" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 67 48 Q 71 52 75 48" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            {/* Small smile */}
            <path d="M 57 58 Q 60 60 63 58" stroke="#2B2622" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Zzz */}
            <text x="82" y="30" fill="#E8802F" fontSize="12" fontWeight="bold">Z</text>
            <text x="92" y="20" fill="#E8802F" fontSize="10" fontWeight="bold">z</text>
            <text x="98" y="12" fill="#E8802F" fontSize="8" fontWeight="bold">z</text>
          </>
        ) : pose === 'happy' ? (
          <>
            {/* Happy Eyes (closed inverted arches) */}
            <path d="M 44 48 Q 49 43 54 48" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 66 48 Q 71 43 76 48" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Big Joyful Open Mouth */}
            <path d="M 54 58 Q 60 67 66 58 Z" fill="#C99A3D" />
            {/* Arms up celebrating */}
            <path d="M 36 76 C 24 64 20 54 26 50" stroke="#7D756D" strokeWidth="6" strokeLinecap="round" />
            <path d="M 84 76 C 96 64 100 54 94 50" stroke="#7D756D" strokeWidth="6" strokeLinecap="round" />
            {/* Sparkles */}
            <circle cx="20" cy="30" r="3" fill="#E8802F" />
            <circle cx="100" cy="32" r="2.5" fill="#C99A3D" />
            <path d="M 15 25 L 18 20 L 23 23 L 18 26 Z" fill="#C99A3D" />
          </>
        ) : pose === 'thinking' ? (
          <>
            {/* Curious eyes looking up right */}
            <circle cx="49" cy="47" r="4.5" fill="#FFFFFF" />
            <circle cx="51" cy="45" r="2.5" fill="#1F1A17" />

            <circle cx="71" cy="47" r="4.5" fill="#FFFFFF" />
            <circle cx="73" cy="45" r="2.5" fill="#1F1A17" />

            {/* Hand on chin */}
            <path d="M 72 78 C 76 68, 68 60, 64 60" stroke="#7D756D" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 56 60 Q 60 62 64 60" stroke="#2B2622" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Thought bubbles */}
            <circle cx="85" cy="30" r="3" fill="#C99A3D" opacity="0.8" />
            <circle cx="93" cy="20" r="5" fill="#C99A3D" opacity="0.9" />
          </>
        ) : pose === 'digging' ? (
          <>
            {/* Focused hardworking eyes looking down */}
            <ellipse cx="49" cy="49" rx="3.5" ry="4.5" fill="#FFFFFF" />
            <circle cx="49" cy="51" r="2" fill="#1F1A17" />

            <ellipse cx="71" cy="49" rx="3.5" ry="4.5" fill="#FFFFFF" />
            <circle cx="71" cy="51" r="2" fill="#1F1A17" />

            {/* Concentrated mouth line */}
            <path d="M 56 59 Q 60 57 64 59" stroke="#2B2622" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Arms digging down with leaf/soil */}
            <path d="M 38 78 C 36 90, 48 95, 50 92" stroke="#7D756D" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 82 78 C 84 90, 72 95, 70 92" stroke="#7D756D" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Leaves / dirt pile */}
            <path d="M 40 98 Q 60 88 80 98 Z" fill="#6B7C4F" />
            <circle cx="45" cy="94" r="2" fill="#C99A3D" />
            <circle cx="74" cy="95" r="3" fill="#3A2B22" />
          </>
        ) : pose === 'reading' ? (
          <>
            {/* Reading Eyes looking down */}
            <circle cx="49" cy="48" r="4" fill="#FFFFFF" />
            <circle cx="49" cy="49" r="2" fill="#1F1A17" />

            <circle cx="71" cy="48" r="4" fill="#FFFFFF" />
            <circle cx="71" cy="49" r="2" fill="#1F1A17" />

            {/* Cute Glasses */}
            <circle cx="49" cy="48" r="7" stroke="#E8802F" strokeWidth="2" fill="none" />
            <circle cx="71" cy="48" r="7" stroke="#E8802F" strokeWidth="2" fill="none" />
            <line x1="56" y1="48" x2="64" y2="48" stroke="#E8802F" strokeWidth="2" />

            {/* Open book held in hands */}
            <path d="M 36 75 L 60 82 L 84 75 L 84 92 L 60 97 L 36 92 Z" fill="#F2E8D5" stroke="#3A2B22" strokeWidth="1.5" />
            <line x1="60" y1="82" x2="60" y2="97" stroke="#3A2B22" strokeWidth="1.5" />
            {/* Book cover */}
            <path d="M 34 77 L 60 84 L 86 77" stroke="#6B7C4F" strokeWidth="3" fill="none" />
          </>
        ) : (
          /* Greeting Pose (default) */
          <>
            {/* Friendly open eyes */}
            <circle cx="48" cy="47" r="4" fill="#FFFFFF" />
            <circle cx="48" cy="47" r="2" fill="#1F1A17" />
            <circle cx="47" cy="46" r="0.8" fill="#FFFFFF" />

            <circle cx="72" cy="47" r="4" fill="#FFFFFF" />
            <circle cx="72" cy="47" r="2" fill="#1F1A17" />
            <circle cx="71" cy="46" r="0.8" fill="#FFFFFF" />

            {/* Friendly smile */}
            <path d="M 54 58 Q 60 63 66 58" stroke="#2B2622" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Right hand waving hello */}
            <path d="M 82 76 C 96 68 102 54 96 46" stroke="#7D756D" strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="96" cy="45" r="4" fill="#7D756D" />
            {/* Left arm resting */}
            <path d="M 38 78 C 28 82 24 88 28 92" stroke="#7D756D" strokeWidth="6" strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
    </div>
  );
};
