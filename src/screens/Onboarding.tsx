import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { RaccoonPose } from '../types';

interface OnboardingProps {
  onComplete: (choice: 'import' | 'home') => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showStartingChoice, setShowStartingChoice] = useState(false);
  const [notificationAsked, setNotificationAsked] = useState(false);

  const slides: { title: string; subtitle: string; pose: RaccoonPose; speech: string }[] = [
    {
      title: 'Ti aiuto a non dimenticare le parole',
      subtitle: 'Ogni parola che cerchi o sbagli finisce in tana. La ripassiamo al momento giusto con la memoria a spazio!',
      pose: 'greeting',
      speech: 'Ciao! Sono il tuo procione guida. Preparati a raccogliere un sacco di ghiande!',
    },
    {
      title: 'Ripassiamo insieme grammatica e vocaboli',
      subtitle: 'Esercizi brevi e leggeri ogni giorno, senza mai farti sentire in colpa per gli errori.',
      pose: 'happy',
      speech: 'Gli errori sono solo materiale utile per la nostra tana!',
    },
    {
      title: 'Testi di comprensione al tuo livello',
      subtitle: 'Brani su misura da A1 a C2. Puoi toccare ogni parola per scoprirne il significato al volo.',
      pose: 'reading',
      speech: 'Leggiamo insieme un bel brano in inglese?',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      setShowStartingChoice(true);
    }
  };

  const handleSkip = () => {
    setShowStartingChoice(true);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }
    setNotificationAsked(true);
  };

  const handleSelectPath = (choice: 'import' | 'home') => {
    if (!notificationAsked && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission().then(() => onComplete(choice));
    } else {
      onComplete(choice);
    }
  };

  const activeSlide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-[#F2E8D5] text-[#3A2B22] flex flex-col justify-between p-6 max-w-md mx-auto relative select-none">
      {/* Top Header */}
      {!showStartingChoice && (
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-1.5">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'w-8 bg-[#6B7C4F]' : 'w-2 bg-[#6B7C4F]/30'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="text-sm font-semibold text-[#6B7C4F] hover:text-[#3A2B22] transition-colors"
          >
            Salta
          </button>
        </div>
      )}

      {/* Main Content */}
      {!showStartingChoice ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center my-8">
          <div className="mb-6">
            <Mascot pose={activeSlide.pose} size={150} speechBubble={activeSlide.speech} />
          </div>

          <h2 className="text-2xl font-bold font-display text-[#3A2B22] mb-3 px-4">
            {activeSlide.title}
          </h2>

          <p className="text-sm text-[#3A2B22]/80 leading-relaxed px-6">
            {activeSlide.subtitle}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center my-8">
          <div className="mb-6">
            <Mascot pose="happy" size={140} speechBubble="Da dove vogliamo iniziare la nostra avventura?" />
          </div>

          <h2 className="text-2xl font-bold font-display text-[#3A2B22] mb-2">
            Scegli il tuo punto di partenza
          </h2>
          <p className="text-sm text-[#3A2B22]/80 mb-8 px-4">
            Puoi importare le tue parole oppure iniziare subito con le lezioni base.
          </p>

          <div className="w-full space-y-4 px-2">
            <button
              onClick={() => handleSelectPath('import')}
              className="w-full py-4 px-6 rounded-2xl bg-[#E8802F] text-white font-bold font-display text-base shadow-md hover:bg-[#E8802F]/90 active:scale-98 transition-all flex items-center justify-center gap-3"
            >
              <span className="text-xl">📥</span>
              <span>Ho un file di parole da importare</span>
            </button>

            <button
              onClick={() => handleSelectPath('home')}
              className="w-full py-4 px-6 rounded-2xl bg-[#6B7C4F] text-white font-bold font-display text-base shadow-md hover:bg-[#6B7C4F]/90 active:scale-98 transition-all flex items-center justify-center gap-3"
            >
              <span className="text-xl">🚀</span>
              <span>Parto da zero</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      {!showStartingChoice && (
        <div className="pb-4">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl bg-[#E8802F] text-white font-bold font-display text-lg shadow-md hover:bg-[#E8802F]/90 active:scale-98 transition-all"
          >
            {currentSlide === slides.length - 1 ? 'Iniziamo!' : 'Continua'}
          </button>
        </div>
      )}
    </div>
  );
};
