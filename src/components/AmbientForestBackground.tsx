import React from 'react';

interface AmbientForestBackgroundProps {
  variant?: 'subtle' | 'forest' | 'home' | 'login';
}

export const AmbientForestBackground: React.FC<AmbientForestBackgroundProps> = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* Top-Right Forest Canopy Silhouettes */}
      <svg
        className="absolute -top-10 -right-10 w-72 sm:w-96 h-72 sm:h-96 text-[#6B7C4F] opacity-[0.07] transition-opacity duration-700"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        {/* Pine trees & leaves silhouette */}
        <path d="M100 20 L120 50 L110 50 L130 80 L118 80 L140 115 L95 115 L95 130 L105 130 L105 135 L90 135 L90 130 L95 130 L95 115 L60 115 L82 80 L70 80 L90 50 L80 50 Z" />
        <path d="M150 45 L165 70 L158 70 L172 95 L162 95 L180 125 L145 125 L145 135 L140 135 L140 125 L120 125 L138 95 L128 95 L142 70 L135 70 Z" />
        {/* Oak leaf */}
        <path d="M40 70 C45 60 60 65 65 75 C70 85 60 95 55 100 C50 95 45 90 40 85 C35 80 35 75 40 70 Z" />
      </svg>

      {/* Bottom-Left Burrow Silhouettes & Raccoon Paw Prints */}
      <svg
        className="absolute -bottom-8 -left-8 w-64 sm:w-80 h-64 sm:h-80 text-[#C99A3D] opacity-[0.06]"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        {/* Cozy burrow mound */}
        <path d="M0 200 C30 160 80 140 130 150 C170 160 190 180 200 200 Z" />
        {/* Acorn */}
        <g transform="translate(110, 110) scale(0.6)">
          <path d="M30 10 C20 10 10 18 10 28 C10 32 12 35 15 38 L30 55 L45 38 C48 35 50 32 50 28 C50 18 40 10 30 10 Z" />
          <path d="M8 20 C8 15 15 10 30 10 C45 10 52 15 52 20 C52 23 45 25 30 25 C15 25 8 23 8 20 Z" opacity="0.8" />
          <line x1="30" y1="5" x2="30" y2="10" stroke="currentColor" strokeWidth="3" />
        </g>
        {/* Raccoon Paw prints */}
        <g transform="translate(45, 90) rotate(-20) scale(0.5)">
          <ellipse cx="25" cy="35" rx="12" ry="10" />
          <ellipse cx="12" cy="15" rx="3.5" ry="6" />
          <ellipse cx="20" cy="10" rx="3.5" ry="7" />
          <ellipse cx="29" cy="10" rx="3.5" ry="7" />
          <ellipse cx="37" cy="15" rx="3.5" ry="6" />
        </g>
        <g transform="translate(85, 60) rotate(10) scale(0.4)">
          <ellipse cx="25" cy="35" rx="12" ry="10" />
          <ellipse cx="12" cy="15" rx="3.5" ry="6" />
          <ellipse cx="20" cy="10" rx="3.5" ry="7" />
          <ellipse cx="29" cy="10" rx="3.5" ry="7" />
          <ellipse cx="37" cy="15" rx="3.5" ry="6" />
        </g>
      </svg>

      {/* Subtle Warm Radial Glow from Cozy Den */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#E8802F]/[0.025] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[400px] bg-[#6B7C4F]/[0.03] rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
