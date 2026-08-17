import React, { useState, useEffect } from 'react';
import { Mascot } from '../mascot/Mascot';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';
import { INTEREST_OPTIONS, INTEREST_ICONS } from '../data/interests';
import { createUserAccountAndProfile, checkUserHasLegacyData } from '../services/firebase';
import { Gender, RaccoonPose } from '../types';
import { AmbientForestBackground } from '../components/AmbientForestBackground';

interface ProfileSetupProps {
  userId: string;
  onComplete: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ userId, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 6;

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<Gender>('undisclosed');
  const [interessi, setInteressi] = useState<string[]>([]);
  const [nativeLanguage, setNativeLanguage] = useState('it');
  const [targetLanguage, setTargetLanguage] = useState('en');
  
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nativeSearch, setNativeSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkLegacy() {
      try {
        const hasLegacy = await checkUserHasLegacyData(userId);
        if (hasLegacy) {
          setHasLegacyData(true);
          setTargetLanguage('en');
        }
      } catch (e) {
        console.warn('Error checking legacy data:', e);
      }
    }
    checkLegacy();
  }, [userId]);

  const toggleInterest = (interest: string) => {
    setInteressi((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const filteredNativeLanguages = NATIVE_LANGUAGES.filter((lang) =>
    lang.name.toLowerCase().includes(nativeSearch.toLowerCase()) ||
    lang.code.toLowerCase().includes(nativeSearch.toLowerCase())
  );

  // Validation per step
  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Name & Surname
        return firstName.trim().length > 0 && lastName.trim().length > 0;
      case 1: // Username
        return username.trim().length > 0;
      case 2: // Gender
        return true;
      case 3: // Interests (optional, always valid)
        return true;
      case 4: // Native Language
        return nativeLanguage.trim().length > 0;
      case 5: // Target Language
        return targetLanguage.trim().length > 0;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (!isStepValid()) return;
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createUserAccountAndProfile(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        nativeLanguage,
        targetLanguage,
        gender,
        interessi,
      });
      onComplete();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMessage('Impossibile salvare il profilo in questo momento. Riprova più tardi.');
      setIsSubmitting(false);
    }
  };

  // Step Mascot & Speech details
  const stepConfigs: { pose: RaccoonPose; speech: string; title: string; subtitle: string }[] = [
    {
      pose: 'happy',
      speech: 'Piacere di conoscerti! Come posso chiamarti in tana?',
      title: 'Come ti chiami?',
      subtitle: 'Il tuo nome reale serve per personalizzare i tuoi attestati e le comunicazioni.',
    },
    {
      pose: 'greeting',
      speech: 'Scegli un soprannome o username unico per farti riconoscere!',
      title: 'Scegli il tuo nome utente',
      subtitle: 'Sarà il tuo identificativo pubblico tra gli esploratori della tana.',
    },
    {
      pose: 'thinking',
      speech: 'Serve per adattare la grammatica e gli accordi nei testi!',
      title: 'Come preferisci identificarti?',
      subtitle: 'Questo ci aiuta ad accordare correttamente aggettivi e forme verbali.',
    },
    {
      pose: 'reading',
      speech: 'Cosa ti appassiona? Ti proporrò letture ed esempi a tema!',
      title: 'I tuoi interessi',
      subtitle: 'Seleziona uno o più temi per ricevere suggerimenti su misura.',
    },
    {
      pose: 'greeting',
      speech: 'Qual è la lingua con cui pensi ogni giorno?',
      title: 'Che lingua parli?',
      subtitle: 'Sarà la tua lingua di riferimento per spiegazioni e traduzioni.',
    },
    {
      pose: 'happy',
      speech: 'Tutto pronto! Quale lingua vuoi iniziare a esplorare per prima?',
      title: 'Cosa vuoi imparare?',
      subtitle: 'Potrai sempre aggiungere altre lingue in seguito dal menu della tana.',
    },
  ];

  const currentConfig = stepConfigs[currentStep];

  return (
    <div className="min-h-screen bg-[#1A1512] text-[#F2E8D5] flex flex-col justify-between p-4 sm:p-6 select-none max-w-xl mx-auto relative overflow-hidden">
      <AmbientForestBackground />

      {/* Top Header: Step Counter & Progress Bar */}
      <header className="pt-2 space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="text-xs sm:text-sm font-bold text-[#859966] hover:text-[#E8802F] font-display flex items-center gap-1 cursor-pointer transition-colors"
            >
              ← Indietro
            </button>
          ) : (
            <span className="text-xs font-bold text-[#859966] font-display">
              Benvenuto in Raccoonary 🦝
            </span>
          )}

          <span className="text-xs font-extrabold text-[#F2E8D5]/70 font-display">
            Passo {currentStep + 1} di {totalSteps}
          </span>
        </div>

        {/* Thick Progress Track */}
        <div className="progress-track h-3 bg-[#2B2622] border border-[#6B7C4F]/30">
          <div
            className="progress-fill progress-fill-zucca"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Immersive Question Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center my-6 space-y-6 animate-fade-in text-center w-full relative z-10">
        {/* Mascot Center Stage */}
        <div className="relative">
          <Mascot
            pose={currentConfig.pose}
            size={135}
            speechBubble={currentConfig.speech}
          />
        </div>

        {/* Question Titles */}
        <div className="space-y-1.5 px-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F2E8D5] font-display">
            {currentConfig.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#F2E8D5]/75 font-medium max-w-md mx-auto leading-relaxed">
            {currentConfig.subtitle}
          </p>
        </div>

        {errorMessage && (
          <div className="w-full p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 font-medium text-left">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Step-specific Input Content */}
        <div className="w-full">
          {/* STEP 0: First Name & Last Name */}
          {currentStep === 0 && (
            <div className="bento-card p-6 sm:p-7 space-y-4 text-left border-2 border-[#6B7C4F]/30 bg-[#2B2622] text-[#F2E8D5]">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#F2E8D5] font-display uppercase tracking-wider">
                  Nome *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Es. Leonardo"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && isStepValid() && handleNextStep()}
                  className="w-full p-4 rounded-2xl bg-[#1A1512] border-2 border-[#6B7C4F]/30 focus:border-[#E8802F] focus:outline-none font-bold text-base text-[#F2E8D5] transition-all placeholder-[#F2E8D5]/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#F2E8D5] font-display uppercase tracking-wider">
                  Cognome *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Es. Rossi"
                  onKeyDown={(e) => e.key === 'Enter' && isStepValid() && handleNextStep()}
                  className="w-full p-4 rounded-2xl bg-[#1A1512] border-2 border-[#6B7C4F]/30 focus:border-[#E8802F] focus:outline-none font-bold text-base text-[#F2E8D5] transition-all placeholder-[#F2E8D5]/30"
                />
              </div>
            </div>
          )}

          {/* STEP 1: Username */}
          {currentStep === 1 && (
            <div className="bento-card p-6 sm:p-7 space-y-4 text-left border-2 border-[#6B7C4F]/30 bg-[#2B2622] text-[#F2E8D5]">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#F2E8D5] font-display uppercase tracking-wider">
                  Nome utente (@username) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-[#E8802F]">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="leoraccoon"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && isStepValid() && handleNextStep()}
                    className="w-full p-4 pl-9 rounded-2xl bg-[#1A1512] border-2 border-[#6B7C4F]/30 focus:border-[#E8802F] focus:outline-none font-bold text-base text-[#F2E8D5] transition-all placeholder-[#F2E8D5]/30"
                  />
                </div>
                <p className="text-[11px] text-[#F2E8D5]/60 font-medium">
                  Lettere minuscole, numeri e trattini.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Gender */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'M' as Gender, label: 'Uomo (Maschile)', icon: '🧔‍♂️', sub: 'Accordi maschili' },
                { id: 'F' as Gender, label: 'Donna (Femminile)', icon: '👩', sub: 'Accordi femminili' },
                { id: 'undisclosed' as Gender, label: 'Preferisco non dirlo', icon: '✨', sub: 'Accordi standard' },
              ].map((item) => {
                const isSelected = gender === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGender(item.id)}
                    className={`bento-card p-5 text-center flex flex-col items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#E8802F] bg-[#352D26] ring-4 ring-[#E8802F]/25 shadow-md scale-102'
                        : 'border-[#6B7C4F]/30 hover:border-[#6B7C4F]/70 bg-[#2B2622] text-[#F2E8D5]'
                    }`}
                  >
                    <span className="text-3xl">{item.icon}</span>
                    <span className="font-extrabold font-display text-sm text-[#F2E8D5]">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-[#F2E8D5]/65 font-medium">
                      {item.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 3: Interests */}
          {currentStep === 3 && (
            <div className="bento-card p-5 sm:p-6 space-y-3 text-left border-2 border-[#6B7C4F]/30 bg-[#2B2622] max-h-72 overflow-y-auto">
              <div className="flex flex-wrap gap-2.5">
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = interessi.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`py-2.5 px-4 rounded-2xl border-2 font-display text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'border-[#E8802F] bg-[#E8802F] text-[#1A1512] shadow-sm scale-102 font-black'
                          : 'border-[#6B7C4F]/30 bg-[#1A1512] hover:border-[#6B7C4F] text-[#F2E8D5]'
                      }`}
                    >
                      <span className="text-base">{INTEREST_ICONS[interest] || '✨'}</span>
                      <span>{interest}</span>
                      {isSelected && <span className="font-black text-xs ml-0.5">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Native Language */}
          {currentStep === 4 && (
            <div className="bento-card p-5 sm:p-6 space-y-3 text-left border-2 border-[#6B7C4F]/30 bg-[#2B2622]">
              <input
                type="text"
                value={nativeSearch}
                onChange={(e) => setNativeSearch(e.target.value)}
                placeholder="🔍 Cerca lingua madre..."
                className="w-full p-3.5 rounded-2xl bg-[#1A1512] border-2 border-[#6B7C4F]/30 focus:border-[#E8802F] focus:outline-none text-xs sm:text-sm font-bold text-[#F2E8D5] placeholder-[#F2E8D5]/35"
              />

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {filteredNativeLanguages.map((lang) => {
                  const isSelected = nativeLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setNativeLanguage(lang.code)}
                      className={`w-full p-3 rounded-2xl text-left text-xs sm:text-sm font-bold font-display flex items-center justify-between border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#E8802F] bg-[#E8802F] text-[#1A1512] shadow-sm'
                          : 'border-transparent bg-[#1A1512] hover:bg-[#342D28] text-[#F2E8D5]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-xl">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                      <span className="text-[10px] uppercase font-mono opacity-70">{lang.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Target Language */}
          {currentStep === 5 && (
            <div className="space-y-3 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TARGET_LANGUAGES.map((lang) => {
                  const isSelected = targetLanguage === lang.code;
                  const isDisabled = hasLegacyData && lang.code !== 'en';

                  return (
                    <button
                      key={lang.code}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setTargetLanguage(lang.code)}
                      className={`bento-card p-4 sm:p-5 border-2 flex items-center gap-3.5 transition-all text-left ${
                        isDisabled
                          ? 'opacity-40 border-[#3A2B22]/30 bg-[#1A1512] cursor-not-allowed'
                          : isSelected
                          ? 'border-[#E8802F] bg-[#352D26] ring-4 ring-[#E8802F]/25 shadow-md scale-102 cursor-pointer'
                          : 'border-[#6B7C4F]/30 bg-[#2B2622] hover:border-[#6B7C4F] text-[#F2E8D5] cursor-pointer'
                      }`}
                    >
                      <span className="text-3xl">{lang.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold font-display text-sm sm:text-base text-[#F2E8D5] truncate">
                          {lang.name}
                        </p>
                        <p className="text-[11px] text-[#F2E8D5]/60 font-medium">
                          {lang.code.toUpperCase()} • Tana e sentiero dedicati
                        </p>
                      </div>
                      {isSelected && <span className="text-[#E8802F] font-black text-lg">✓</span>}
                    </button>
                  );
                })}
              </div>

              {hasLegacyData && (
                <div className="p-3.5 rounded-2xl bg-[#C99A3D]/20 border border-[#C99A3D]/40 text-xs text-[#F2E8D5] font-bold flex items-center gap-2">
                  <span>🦝</span>
                  <span>I tuoi progressi salvati per la lingua selezionata verranno recuperati automaticamente.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer Navigation Button */}
      <footer className="pb-4 pt-2 relative z-10">
        <button
          type="button"
          onClick={handleNextStep}
          disabled={!isStepValid() || isSubmitting}
          className="btn-zucca w-full py-4 text-base sm:text-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-[#1A1512] border-t-transparent rounded-full animate-spin" />
              <span>Creazione tana in corso...</span>
            </div>
          ) : currentStep === totalSteps - 1 ? (
            <span>Entra in tana 🦝</span>
          ) : (
            <span>Continua →</span>
          )}
        </button>
      </footer>
    </div>
  );
};
export default ProfileSetup;
