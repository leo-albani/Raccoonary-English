import React from 'react';
import { RaccoonPose } from '../types';
import { getOutfitById } from '../data/outfits';

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
}

export const Mascot: React.FC<MascotProps> = ({
  pose = 'greeting',
  size = 140,
  className = '',
  speechBubble,
  activeOutfit = 'base',
}) => {
  let imgSrc = POSE_IMAGES[pose] || POSE_IMAGES.greeting;

  // Use outfit avatar image for neutral/greeting pose if non-base outfit active
  if ((pose === 'greeting' || !pose) && activeOutfit && activeOutfit !== 'base') {
    const outfit = getOutfitById(activeOutfit);
    if (outfit && outfit.image) {
      imgSrc = outfit.image;
    }
  }

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {speechBubble && (
        <div className="mb-3 max-w-xs bg-white text-[#3A2B22] px-4 py-2.5 rounded-2xl shadow-sm border border-[#6B7C4F]/25 text-xs sm:text-sm font-medium relative animate-fade-in text-center leading-relaxed">
          {speechBubble}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-white" />
        </div>
      )}

      {/* Spotlight container matching background color #F2E8D5 */}
      <div
        className="rounded-full bg-[#F2E8D5] border-2 border-[#6B7C4F]/25 shadow-sm p-1 flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-300 hover:scale-105"
        style={{ width: size, height: size }}
      >
        <img
          src={imgSrc}
          alt={`Mascotta Raccoonary (${pose})`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-full select-none"
        />
      </div>
    </div>
  );
};

