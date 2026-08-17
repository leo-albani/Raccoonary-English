import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { RaccoonPose } from '../types';
import { AmbientForestBackground } from '../components/AmbientForestBackground';

interface OnboardingProps {
  onComplete: (choice: 'import' | 'home' | 'level_test') => void;
  skipSlides?: boolean;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, skipSlides = false, t }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showStartingChoice, setShowStartingChoice] = useState(skipSlides);
  const [notificationAsked, setNotificationAsked] = useState(false);

  const slides: { title: string; subtitle: string; pose: RaccoonPose; speech: string }[] = [
    {
      title: t ? t('onboarding.slide1.title') : 'Non perdi più una parola',
      subtitle: t ? t('onboarding.slide1.subtitle') : 'Quello che cerchi o sbagli finisce in tana. Te lo ripropongo al momento giusto.',
      pose: 'greeting',
      speech: t ? t('onboarding.slide1.speech') : 'Ciao, sono il tuo procione. Le parole che ti sfuggono le tengo io.',
    },
    {
      title: t ? t('onboarding.slide2.title') : 'Grammatica senza il tono da scuola',
      subtitle: t ? t('onboarding.slide2.subtitle') : 'Argomenti, phrasal verbs, falsi amici. Un po\' alla volta, con esercizi che rinnovi quando vuoi.',
      pose: 'happy',
      speech: t ? t('onboarding.slide2.speech') : 'Eserciti solo quello che ti serve davvero.',
    },
    {
      title: t ? t('onboarding.slide3.title') : 'Testi al tuo livello',
      subtitle: t ? t('onboarding.slide3.subtitle') : 'Da A1 a C2, in stile esame ufficiale. Quello che non torna finisce comunque in tana.',
      pose: 'reading',
      speech: t ? t('onboarding.slide3.speech') : 'Letture interattive con traduzioni a portata di tap.',
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

  const handleSelectPath = (choice: 'import' | 'home' | 'level_test') => {
    if (!notificationAsked && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission().then(() => onComplete(choice));
    } else {
      onComplete(choice);
    }
  };

  const activeSlide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-[#1A1512] text-[#F2E8D5] flex flex-col justify-between p-6 sm:p-8 max-w-xl mx-auto relative select-none overflow-hidden">
      <AmbientForestBackground />

      {/* Top Header */}
      {!showStartingChoice ? (
        <header className="flex justify-between items-center pt-2 relative z-10">
          <div className="flex gap-2 items-center">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-3 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'w-10 bg-[#E8802F]' : 'w-3 bg-[#6B7C4F]/35'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs sm:text-sm font-bold text-[#859966] hover:text-[#E8802F] font-display transition-colors cursor-pointer"
          >
            Salta →
          </button>
        </header>
      ) : (
        <div className="pt-2 text-center relative z-10">
          <span className="badge-leaf">Pronti a partire</span>
        </div>
      )}

      {/* Main Content */}
      {!showStartingChoice ? (
        <main className="flex-1 flex flex-col items-center justify-center text-center my-8 space-y-6 animate-fade-in relative z-10">
          <div className="relative">
            <Mascot pose={activeSlide.pose} size={175} speechBubble={activeSlide.speech} />
          </div>

          <div className="space-y-3 px-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-[#F2E8D5] leading-tight">
              {activeSlide.title}
            </h2>

            <p className="text-sm sm:text-base text-[#F2E8D5]/80 leading-relaxed max-w-md mx-auto font-medium">
              {activeSlide.subtitle}
            </p>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center text-center my-8 space-y-6 animate-fade-in relative z-10">
          <div className="relative">
            <Mascot pose="happy" size={165} speechBubble="Da dove iniziamo la nostra avventura?" />
          </div>

          <div className="space-y-2 px-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-[#F2E8D5] leading-tight">
              Scegli il tuo punto di partenza
            </h2>
            <p className="text-xs sm:text-sm text-[#F2E8D5]/80 max-w-md mx-auto font-medium">
              Scopri subito il tuo livello esatto con un test adattivo oppure entra direttamente in tana.
            </p>
          </div>

          <div className="w-full max-w-md space-y-4 px-2 pt-2">
            <button
              type="button"
              onClick={() => handleSelectPath('level_test')}
              className="btn-zucca w-full py-4 text-base sm:text-lg flex items-center justify-center gap-3 cursor-pointer shadow-lg"
            >
              <span className="text-2xl">🎯</span>
              <span>Scopri il mio livello con un test</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPath('home')}
              className="btn-secondary w-full py-3.5 text-sm sm:text-base flex items-center justify-center gap-3 cursor-pointer"
            >
              <span className="text-xl">🏠</span>
              <span>Parto da zero / Entra in tana</span>
            </button>
          </div>
        </main>
      )}

      {/* Footer Navigation */}
      {!showStartingChoice && (
        <footer className="pb-4 max-w-md mx-auto w-full relative z-10">
          <button
            type="button"
            onClick={handleNext}
            className="btn-zucca w-full py-4 text-base sm:text-lg cursor-pointer shadow-lg"
          >
            {currentSlide === slides.length - 1 ? 'Iniziamo 🚀' : 'Continua →'}
          </button>
        </footer>
      )}
    </div>
  );
};
export default Onboarding;
