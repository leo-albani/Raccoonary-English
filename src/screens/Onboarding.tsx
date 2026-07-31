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
      title: 'Non perdi più una parola',
      subtitle: 'Quello che cerchi o sbagli finisce in tana. Te lo ripropongo al momento giusto.',
      pose: 'greeting',
      speech: 'Ciao, sono il tuo procione. Le parole che ti sfuggono le tengo io.',
    },
    {
      title: 'Grammatica senza il tono da scuola',
      subtitle: 'Argomenti, phrasal verbs, falsi amici. Un po\' alla volta, con esercizi che rinnovi quando vuoi.',
      pose: 'happy',
      speech: 'Eserciti solo quello che ti serve davvero.',
    },
    {
      title: 'Testi al tuo livello',
      subtitle: 'Da A1 a C2, in stile Cambridge. Quello che non torna finisce comunque in tana.',
      pose: 'reading',
      speech: 'Letture interattive con traduzioni a portata di tap.',
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
    <div className="min-h-screen bg-[#F2E8D5] text-[#3A2B22] flex flex-col justify-between p-6 max-w-lg mx-auto relative select-none">
      {/* Top Header */}
      {!showStartingChoice && (
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
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
            className="text-sm font-semibold text-[#6B7C4F] hover:text-[#3A2B22] transition-colors cursor-pointer"
          >
            Salta
          </button>
        </div>
      )}

      {/* Main Content */}
      {!showStartingChoice ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center my-8 space-y-4">
          <div className="mb-2">
            <Mascot pose={activeSlide.pose} size={160} speechBubble={activeSlide.speech} />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22] px-4">
            {activeSlide.title}
          </h2>

          <p className="text-sm sm:text-base text-[#3A2B22]/80 leading-relaxed max-w-md px-4 font-medium">
            {activeSlide.subtitle}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center my-8 space-y-4">
          <div className="mb-2">
            <Mascot pose="happy" size={150} speechBubble="Da dove iniziamo?" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22] mb-1">
            Scegli il tuo punto di partenza
          </h2>
          <p className="text-sm text-[#3A2B22]/80 max-w-md px-4 font-medium mb-6">
            Puoi importare un tuo file di parole oppure esplorare subito la tana.
          </p>

          <div className="w-full max-w-md space-y-4 px-2">
            <button
              onClick={() => handleSelectPath('import')}
              className="btn-zucca w-full py-4 text-base flex items-center justify-center gap-3"
            >
              <span className="text-xl">📥</span>
              <span>Ho un file di parole da importare</span>
            </button>

            <button
              onClick={() => handleSelectPath('home')}
              className="w-full py-4 px-6 rounded-2xl bg-[#6B7C4F] text-white font-bold font-display text-base shadow-md hover:bg-[#6B7C4F]/90 cursor-pointer transition-all flex items-center justify-center gap-3"
            >
              <span className="text-xl">🏠</span>
              <span>Entra in tana</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      {!showStartingChoice && (
        <div className="pb-4 max-w-md mx-auto w-full">
          <button
            onClick={handleNext}
            className="btn-zucca w-full py-4 text-lg"
          >
            {currentSlide === slides.length - 1 ? 'Iniziamo' : 'Continua'}
          </button>
        </div>
      )}
    </div>
  );
};
