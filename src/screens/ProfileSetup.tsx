import React, { useState, useEffect } from 'react';
import { Mascot } from '../mascot/Mascot';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';
import { INTEREST_OPTIONS, INTEREST_ICONS } from '../data/interests';
import { createUserAccountAndProfile, checkUserHasLegacyData } from '../services/firebase';
import { Gender } from '../types';

interface ProfileSetupProps {
  userId: string;
  onComplete: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ userId, onComplete }) => {
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
  const [isNativeOpen, setIsNativeOpen] = useState(false);
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

  const selectedNativeObj = NATIVE_LANGUAGES.find((l) => l.code === nativeLanguage) || NATIVE_LANGUAGES[0];

  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    username.trim().length > 0 &&
    nativeLanguage !== '' &&
    targetLanguage !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2E8D5] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-6 animate-fade-in my-8">
        {/* Mascot & Greeting */}
        <div className="text-center space-y-3">
          <Mascot
            pose="happy"
            size={120}
            speechBubble="Piacere di conoscerti! Raccontami qualcosa di te prima di entrare in tana. 🦝"
          />
          <span className="badge-leaf">Configurazione Profilo</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3A2B22] font-display">
            Crea il tuo profilo
          </h1>
          <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium max-w-md mx-auto">
            Personalizza la tua esperienza per imparare al tuo ritmo.
          </p>
        </div>

        {/* Profile Form Card */}
        <form onSubmit={handleSubmit} className="bento-card p-6 sm:p-8 space-y-5 bg-white/90 border-2 border-[#6B7C4F]/30 backdrop-blur-xs">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium leading-relaxed">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#3A2B22] font-display uppercase tracking-wider">
                Nome *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Es. Leonardo"
                required
                className="w-full p-3.5 rounded-2xl bg-[#F2E8D5]/40 border-2 border-[#3A2B22]/15 focus:border-[#6B7C4F] focus:bg-white focus:outline-none font-medium text-sm text-[#3A2B22] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#3A2B22] font-display uppercase tracking-wider">
                Cognome *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Es. Rossi"
                required
                className="w-full p-3.5 rounded-2xl bg-[#F2E8D5]/40 border-2 border-[#3A2B22]/15 focus:border-[#6B7C4F] focus:bg-white focus:outline-none font-medium text-sm text-[#3A2B22] transition-all"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#3A2B22] font-display uppercase tracking-wider">
              Nome utente *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Es. leoraccoon"
              required
              className="w-full p-3.5 rounded-2xl bg-[#F2E8D5]/40 border-2 border-[#3A2B22]/15 focus:border-[#6B7C4F] focus:bg-white focus:outline-none font-medium text-sm text-[#3A2B22] transition-all"
            />
          </div>

          {/* Sesso (Gender Selector) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#3A2B22] font-display uppercase tracking-wider">
              Sesso
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGender('M')}
                className={`py-3 px-2 rounded-2xl border-2 font-display text-xs font-bold transition-all cursor-pointer text-center ${
                  gender === 'M'
                    ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                    : 'border-[#3A2B22]/15 bg-[#F2E8D5]/40 hover:border-[#6B7C4F]/50 text-[#3A2B22]'
                }`}
              >
                M
              </button>
              <button
                type="button"
                onClick={() => setGender('F')}
                className={`py-3 px-2 rounded-2xl border-2 font-display text-xs font-bold transition-all cursor-pointer text-center ${
                  gender === 'F'
                    ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                    : 'border-[#3A2B22]/15 bg-[#F2E8D5]/40 hover:border-[#6B7C4F]/50 text-[#3A2B22]'
                }`}
              >
                F
              </button>
              <button
                type="button"
                onClick={() => setGender('undisclosed')}
                className={`py-3 px-2 rounded-2xl border-2 font-display text-xs font-bold transition-all cursor-pointer text-center ${
                  gender === 'undisclosed'
                    ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                    : 'border-[#3A2B22]/15 bg-[#F2E8D5]/40 hover:border-[#6B7C4F]/50 text-[#3A2B22]'
                }`}
              >
                Preferisco non dirlo
              </button>
            </div>
          </div>

          {/* I tuoi interessi (Interests Selector - Multiple) */}
          <div className="space-y-2 pt-2 border-t border-[#3A2B22]/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#3A2B22] font-display uppercase tracking-wider">
                I tuoi interessi
              </label>
              <span className="text-[11px] text-[#3A2B22]/60 font-medium">
                {interessi.length > 0 ? `${interessi.length} selezionat${interessi.length === 1 ? 'o' : 'i'}` : 'Opzionale'}
              </span>
            </div>
            <p className="text-[12px] text-[#3A2B22]/70 leading-tight">
              Scegli i temi che ami per suggerimenti di lettura su misura per te.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = interessi.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`py-2 px-3 rounded-xl border-2 font-display text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                        : 'border-[#3A2B22]/15 bg-[#F2E8D5]/40 hover:border-[#6B7C4F]/50 text-[#3A2B22]'
                    }`}
                  >
                    <span>{INTEREST_ICONS[interest] || '✨'}</span>
                    <span>{interest}</span>
                    {isSelected && <span className="text-[11px] font-black ml-0.5">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Native Language (Searchable dropdown) */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-[#3A2B22] font-display uppercase tracking-wider">
              Lingua parlata *
            </label>
            
            <button
              type="button"
              onClick={() => setIsNativeOpen(!isNativeOpen)}
              className="w-full p-3.5 rounded-2xl bg-[#F2E8D5]/40 border-2 border-[#3A2B22]/15 focus:border-[#6B7C4F] font-medium text-sm text-[#3A2B22] transition-all flex items-center justify-between cursor-pointer text-left"
            >
              <span className="flex items-center gap-2">
                <span>{selectedNativeObj.flag}</span>
                <span>{selectedNativeObj.name} ({selectedNativeObj.code.toUpperCase()})</span>
              </span>
              <span className="text-xs text-[#3A2B22]/50">▼</span>
            </button>

            {isNativeOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-2 border-[#6B7C4F] shadow-xl z-30 p-3 space-y-2 max-h-60 overflow-y-auto">
                <input
                  type="text"
                  value={nativeSearch}
                  onChange={(e) => setNativeSearch(e.target.value)}
                  placeholder="Cerca lingua madre..."
                  className="w-full p-2.5 rounded-xl bg-[#F2E8D5]/30 border border-[#3A2B22]/15 focus:outline-none text-xs font-medium text-[#3A2B22]"
                  autoFocus
                />
                <div className="space-y-1">
                  {filteredNativeLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setNativeLanguage(lang.code);
                        setIsNativeOpen(false);
                        setNativeSearch('');
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold font-display flex items-center justify-between transition-all cursor-pointer ${
                        nativeLanguage === lang.code
                          ? 'bg-[#6B7C4F] text-white'
                          : 'hover:bg-[#F2E8D5]/50 text-[#3A2B22]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                      <span className="opacity-60 text-[10px] uppercase font-mono">{lang.code}</span>
                    </button>
                  ))}
                  {filteredNativeLanguages.length === 0 && (
                    <div className="p-3 text-center text-xs text-[#3A2B22]/50 font-medium">
                      Nessuna lingua trovata
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Target Language Selection */}
          <div className="space-y-2 pt-2 border-t border-[#3A2B22]/10">
            <label className="text-xs font-bold text-[#3A2B22] font-display uppercase tracking-wider flex items-center justify-between">
              <span>Prima lingua da imparare *</span>
              {hasLegacyData && (
                <span className="text-[10px] text-[#C99A3D] font-extrabold uppercase">
                  🔒 Bloccato (Dati Esistenti)
                </span>
              )}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TARGET_LANGUAGES.map((lang) => {
                const isSelected = targetLanguage === lang.code;
                const isDisabled = hasLegacyData && lang.code !== 'en';

                return (
                  <button
                    key={lang.code}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setTargetLanguage(lang.code)}
                    className={`p-3 rounded-2xl border-2 font-display text-xs sm:text-sm font-bold flex items-center gap-3 transition-all text-left ${
                      isDisabled
                        ? 'opacity-40 border-gray-200 bg-gray-50 cursor-not-allowed'
                        : isSelected
                        ? 'border-[#6B7C4F] bg-[#6B7C4F]/10 text-[#3A2B22] shadow-xs'
                        : 'border-[#3A2B22]/15 bg-white hover:border-[#6B7C4F]/50 text-[#3A2B22] cursor-pointer'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="flex-1 font-bold">{lang.name}</span>
                    {isSelected && <span className="text-[#6B7C4F] font-black text-sm">✓</span>}
                  </button>
                );
              })}
            </div>

            {hasLegacyData && (
              <p className="text-xs text-[#C99A3D] font-bold bg-[#C99A3D]/10 p-3 rounded-2xl border border-[#C99A3D]/30 flex items-center gap-2 mt-2">
                <span>🦝</span>
                <span>Hai già progressi salvati per la lingua selezionata, li ritroverai qui.</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full py-4 px-6 rounded-2xl bg-[#E8802F] text-white font-extrabold font-display text-base shadow-md hover:bg-[#d97223] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Salvataggio...</span>
              </div>
            ) : (
              <span>Continua →</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
