import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { CEFRLevel, ReadingText, UserProfile, VocabItem, ExerciseError } from '../types';
import { generateReadingText } from '../services/gemini';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';
import { INTEREST_OPTIONS, INTEREST_ICONS } from '../data/interests';
import { ReadingSection } from '../components/reading/ReadingSection';

interface ReadingProps {
  onSaveVocabItem: (item: VocabItem) => void;
  onSaveExerciseError?: (item: ExerciseError) => void;
  onCompleteReading?: (level: CEFRLevel) => void;
  userProfile?: UserProfile;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const getNextLevel = (lvl: CEFRLevel): CEFRLevel | null => {
  const idx = CEFR_LEVELS.indexOf(lvl);
  return idx >= 0 && idx < CEFR_LEVELS.length - 1 ? CEFR_LEVELS[idx + 1] : null;
};

export const Reading: React.FC<ReadingProps> = ({
  onSaveVocabItem,
  onSaveExerciseError,
  onCompleteReading,
  userProfile,
}) => {
  const activeStudyLevel = (userProfile?.livelloStudioAttivo || userProfile?.currentLevel || 'A1') as CEFRLevel;
  const nextStudyLevel = getNextLevel(activeStudyLevel);
  const userInterests = userProfile?.interessi || [];

  // Setup / Selector state
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>(activeStudyLevel);
  const [selectedGenre, setSelectedGenre] = useState<string>('Sorprendimi');

  // Reading state
  const [readingText, setReadingText] = useState<ReadingText | null>(null);
  const [currentGenre, setCurrentGenre] = useState<string>('Sorprendimi');
  const [currentLevel, setCurrentLevel] = useState<CEFRLevel>(activeStudyLevel);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetLang = userProfile?.activeProfileId || 'en';
  const nativeLang = userProfile?.nativeLanguage || 'it';
  const targetName = TARGET_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang.toUpperCase();
  const nativeName = NATIVE_LANGUAGES.find((l) => l.code === nativeLang)?.name || nativeLang.toUpperCase();

  const handleGenerateReading = async (levelToLoad = selectedLevel, genreToLoad = selectedGenre) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentLevel(levelToLoad);
    setCurrentGenre(genreToLoad);

    try {
      const data = await generateReadingText(
        levelToLoad,
        genreToLoad,
        targetLang,
        nativeLang,
        targetName,
        nativeName
      );
      setReadingText(data);
    } catch (e: any) {
      console.error('Error generating reading:', e);
      setErrorMessage(e.message || 'Errore durante la generazione della lettura. Riprova tra poco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSetup = () => {
    setReadingText(null);
    setErrorMessage(null);
  };

  const isAdvanceText = currentLevel === nextStudyLevel;
  const isConsolidation = currentLevel === activeStudyLevel;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* -------------------- 1. SETUP / CHOICE SCREEN -------------------- */}
      {!readingText && !isLoading && (
        <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
          {/* Header Bento Card */}
          <div className="bento-card flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <Mascot pose="reading" size={90} speechBubble="Cosa ti va di leggere oggi?" />
            <div>
              <span className="badge-muschio mb-2 inline-flex">📖 Comprensione del testo</span>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#F2E8D5]">
                Cosa vuoi leggere oggi?
              </h1>
              <p className="text-xs sm:text-sm text-[#F2E8D5]/80 font-medium mt-1">
                Personalizza il livello CEFR e il genere per generare una lettura su misura per te.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Setup Form Bento Card */}
          <div className="bento-card space-y-6">
            {/* Level Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F2E8D5] font-display uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Livello di lettura</span>
                </label>
                <span className="text-[11px] text-[#F2E8D5]/70 font-semibold">
                  Tuo livello attivo: <span className="font-black text-[#859966]">{activeStudyLevel}</span>
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CEFR_LEVELS.map((lvl) => {
                  const isSelected = selectedLevel === lvl;
                  const isUserActive = lvl === activeStudyLevel;
                  const isNext = lvl === nextStudyLevel;

                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      className={`p-3 rounded-2xl border-2 font-display text-sm font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 relative ${
                        isSelected
                          ? 'border-[#E8802F] bg-[#E8802F] text-[#1A1512] shadow-md'
                          : 'border-[#6B7C4F]/30 bg-[#1A1512] hover:border-[#6B7C4F] text-[#F2E8D5]'
                      }`}
                    >
                      <span className="text-base font-extrabold">{lvl}</span>
                      <div className="flex items-center gap-0.5">
                        {isUserActive && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                              isSelected ? 'bg-[#1A1512]/30 text-[#1A1512]' : 'bg-[#6B7C4F]/25 text-[#9BB07A]'
                            }`}
                          >
                            Tuo
                          </span>
                        )}
                        {isNext && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                              isSelected ? 'bg-[#1A1512]/30 text-[#1A1512]' : 'bg-[#E8802F]/20 text-[#E8802F]'
                            }`}
                          >
                            i+1
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Genre Selector */}
            <div className="space-y-2.5 pt-4 border-t border-[#6B7C4F]/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F2E8D5] font-display uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎨</span>
                  <span>Genere & Argomento</span>
                </label>
                <span className="text-[11px] text-[#F2E8D5]/70 font-medium">
                  Seleziona un tema
                </span>
              </div>

              {/* Fixed "Sorprendimi" Option */}
              <button
                type="button"
                onClick={() => setSelectedGenre('Sorprendimi')}
                className={`w-full p-4 rounded-2xl border-2 font-display text-sm font-bold transition-all cursor-pointer flex items-center justify-between text-left ${
                  selectedGenre === 'Sorprendimi'
                    ? 'border-[#E8802F] bg-[#E8802F] text-[#1A1512] shadow-md'
                    : 'border-[#E8802F]/40 bg-[#1A1512] hover:border-[#E8802F] text-[#F2E8D5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎲</span>
                  <div>
                    <div className="font-extrabold text-sm sm:text-base">Sorprendimi!</div>
                    <div className={`text-xs font-medium ${selectedGenre === 'Sorprendimi' ? 'text-[#1A1512]/80' : 'text-[#F2E8D5]/70'}`}>
                      Rocky sceglierà una storia varia, curiosa e intrigante per te
                    </div>
                  </div>
                </div>
                {selectedGenre === 'Sorprendimi' && (
                  <span className="text-[#1A1512] font-black text-base">✓</span>
                )}
              </button>

              {/* Interests / Topics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {INTEREST_OPTIONS.map((genre) => {
                  const isSelected = selectedGenre === genre;
                  const isRecommended = userInterests.includes(genre);

                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => setSelectedGenre(genre)}
                      className={`p-3.5 rounded-2xl border-2 font-display text-xs font-bold transition-all cursor-pointer flex flex-col justify-between items-start gap-1.5 text-left relative min-h-[70px] ${
                        isSelected
                          ? 'border-[#E8802F] bg-[#E8802F] text-[#1A1512] shadow-md'
                          : 'border-[#6B7C4F]/30 bg-[#1A1512] hover:border-[#6B7C4F] text-[#F2E8D5]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-lg">{INTEREST_ICONS[genre] || '✨'}</span>
                        {isRecommended && (
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full tracking-wider ${
                              isSelected
                                ? 'bg-[#1A1512]/30 text-[#1A1512]'
                                : 'bg-[#6B7C4F]/25 text-[#9BB07A] border border-[#6B7C4F]/30'
                            }`}
                          >
                            Consigliato
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-xs leading-snug">{genre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleGenerateReading(selectedLevel, selectedGenre)}
                className="btn-zucca w-full py-4 text-base shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Genera lettura</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 2. LOADING SCREEN -------------------- */}
      {isLoading && (
        <div className="bento-card text-center py-16 space-y-4 max-w-2xl mx-auto animate-fade-in">
          <Mascot
            pose="reading"
            size={140}
            speechBubble={`Sto scrivendo un brano di livello ${selectedLevel} sul tema "${selectedGenre}"...`}
          />
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-display text-[#F2E8D5]">
              Rocky sta scrivendo per te...
            </h3>
            <p className="text-xs text-[#859966] font-medium">
              Stile esami Cambridge • Livello {selectedLevel} • Argomento {selectedGenre}
            </p>
          </div>
          <div className="w-8 h-8 border-3 border-[#E8802F] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {/* -------------------- 3. READING & COMPREHENSION SCREEN (REUSABLE SECTION) -------------------- */}
      {readingText && !isLoading && (
        <div className="max-w-3xl mx-auto animate-fade-in">
          <ReadingSection
            readingData={readingText}
            targetLang={targetLang}
            nativeLang={nativeLang}
            targetName={targetName}
            nativeName={nativeName}
            currentLevel={currentLevel}
            currentGenre={currentGenre}
            isAdvanceText={isAdvanceText}
            isConsolidation={isConsolidation}
            onSaveVocabItem={onSaveVocabItem}
            onSaveExerciseError={onSaveExerciseError}
            onCompleteReading={(lvl) => {
              if (onCompleteReading) {
                onCompleteReading(lvl);
              }
            }}
            onRegenerate={() => handleGenerateReading(currentLevel, currentGenre)}
            onChangeTopic={handleBackToSetup}
            mode="standalone"
          />
        </div>
      )}
    </div>
  );
};
