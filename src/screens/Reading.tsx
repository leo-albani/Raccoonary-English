import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { CEFRLevel, ReadingText, UserProfile, VocabItem } from '../types';
import { generateReadingText, explainWordInContext } from '../services/gemini';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';
import { INTEREST_OPTIONS, INTEREST_ICONS } from '../data/interests';

interface ReadingProps {
  onSaveVocabItem: (item: VocabItem) => void;
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

  // Comprehension answers state
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});

  // Interactive word lookup modal
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordExplanation, setWordExplanation] = useState<{
    term: string;
    translation: string;
    explanation: string;
    exampleSource: string;
    exampleTranslation: string;
  } | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [wordSavedSuccess, setWordSavedSuccess] = useState(false);

  const handleGenerateReading = async (levelToLoad = selectedLevel, genreToLoad = selectedGenre) => {
    setIsLoading(true);
    setErrorMessage(null);
    setUserAnswers({});
    setCheckedQuestions({});
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

  const handleWordTap = async (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z']/g, '').trim();
    if (!cleanWord || cleanWord.length < 2) return;

    setSelectedWord(cleanWord);
    setIsExplaining(true);
    setWordExplanation(null);
    setWordSavedSuccess(false);

    try {
      const exp = await explainWordInContext(cleanWord, readingText?.testo || '', nativeName, targetName);
      setWordExplanation(exp);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleAddWordToTana = () => {
    if (!wordExplanation) return;

    const newVocab: VocabItem = {
      id: `reading_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      term: wordExplanation.term,
      translation: wordExplanation.translation,
      sourceLang: targetLang as any,
      targetLang: nativeLang as any,
      synonyms: [],
      exampleSource: wordExplanation.exampleSource || wordExplanation.term,
      exampleTranslation: wordExplanation.exampleTranslation || wordExplanation.translation,
      origin: 'reading_error',
      originDetail: `Lettura ${currentLevel} (${currentGenre})`,
      createdAt: Date.now(),
      lastReviewedAt: null,
      box: 1,
      nextReviewAt: Date.now(),
      correctStreak: 0,
      wrongCount: 0,
    };

    onSaveVocabItem(newVocab);
    setWordSavedSuccess(true);
  };

  const isAdvanceText = currentLevel === nextStudyLevel;
  const isConsolidation = currentLevel === activeStudyLevel;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* -------------------- 1. SETUP / CHOICE SCREEN -------------------- */}
      {!readingText && !isLoading && (
        <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
          {/* Header Card */}
          <div className="bento-card flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <Mascot pose="reading" size={90} speechBubble="Cosa ti va di leggere oggi?" />
            <div>
              <span className="badge-leaf mb-2 inline-block">📖 Comprensione del testo</span>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22]">
                Cosa vuoi leggere oggi?
              </h1>
              <p className="text-xs sm:text-sm text-[#3A2B22]/70 font-medium mt-1">
                Personalizza il livello CEFR e il genere per generare una lettura su misura per te.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Setup Card */}
          <div className="bento-card space-y-6">
            {/* Level Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#3A2B22] font-display uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Livello di lettura</span>
                </label>
                <span className="text-[11px] text-[#3A2B22]/60 font-semibold">
                  Tuo livello attivo: <span className="font-black text-[#6B7C4F]">{activeStudyLevel}</span>
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
                          ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                          : 'border-[#3A2B22]/15 bg-[#F2E8D5]/30 hover:border-[#6B7C4F]/50 text-[#3A2B22]'
                      }`}
                    >
                      <span className="text-base font-extrabold">{lvl}</span>
                      <div className="flex items-center gap-0.5">
                        {isUserActive && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                              isSelected ? 'bg-white/25 text-white' : 'bg-[#6B7C4F]/15 text-[#6B7C4F]'
                            }`}
                          >
                            Tuo
                          </span>
                        )}
                        {isNext && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                              isSelected ? 'bg-white/25 text-white' : 'bg-[#E8802F]/15 text-[#E8802F]'
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
            <div className="space-y-2.5 pt-4 border-t border-[#3A2B22]/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#3A2B22] font-display uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎨</span>
                  <span>Genere & Argomento</span>
                </label>
                <span className="text-[11px] text-[#3A2B22]/60 font-medium">
                  Seleziona un tema
                </span>
              </div>

              {/* Fixed "Sorprendimi" Option */}
              <button
                type="button"
                onClick={() => setSelectedGenre('Sorprendimi')}
                className={`w-full p-3.5 rounded-2xl border-2 font-display text-sm font-bold transition-all cursor-pointer flex items-center justify-between text-left ${
                  selectedGenre === 'Sorprendimi'
                    ? 'border-[#E8802F] bg-[#E8802F] text-white shadow-md'
                    : 'border-[#E8802F]/40 bg-[#E8802F]/10 hover:border-[#E8802F] text-[#3A2B22]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🎲</span>
                  <div>
                    <div className="font-extrabold text-sm">Sorprendimi!</div>
                    <div className={`text-[11px] font-medium ${selectedGenre === 'Sorprendimi' ? 'text-white/80' : 'text-[#3A2B22]/70'}`}>
                      Rocky sceglierà una storia varia, curiosa e intrigante per te
                    </div>
                  </div>
                </div>
                {selectedGenre === 'Sorprendimi' && (
                  <span className="text-white font-black text-base">✓</span>
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
                      className={`p-3 rounded-2xl border-2 font-display text-xs font-bold transition-all cursor-pointer flex flex-col justify-between items-start gap-1.5 text-left relative min-h-[64px] ${
                        isSelected
                          ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                          : 'border-[#3A2B22]/15 bg-white hover:border-[#6B7C4F]/50 text-[#3A2B22]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-base">{INTEREST_ICONS[genre] || '✨'}</span>
                        {isRecommended && (
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full tracking-wider ${
                              isSelected
                                ? 'bg-white text-[#6B7C4F]'
                                : 'bg-[#6B7C4F]/15 text-[#6B7C4F] border border-[#6B7C4F]/30'
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
            <h3 className="text-xl font-bold font-display text-[#3A2B22]">
              Rocky sta scrivendo per te...
            </h3>
            <p className="text-xs text-[#3A2B22]/70 font-medium">
              Stile esami Cambridge • Livello {selectedLevel} • Argomento {selectedGenre}
            </p>
          </div>
          <div className="w-8 h-8 border-3 border-[#E8802F] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {/* -------------------- 3. READING & COMPREHENSION SCREEN -------------------- */}
      {readingText && !isLoading && (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
          {/* Top Bar with Back and Change Options */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleBackToSetup}
              className="py-2 px-3.5 rounded-xl bg-white border border-[#3A2B22]/15 hover:border-[#6B7C4F] text-xs font-bold font-display text-[#3A2B22] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>←</span>
              <span>Cosa vuoi leggere oggi?</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge-leaf">
                {INTEREST_ICONS[currentGenre] || '✨'} {currentGenre}
              </span>
              <span className={`badge-leaf ${isAdvanceText ? 'bg-[#E8802F] text-white' : ''}`}>
                Livello {currentLevel}
              </span>
              {isAdvanceText ? (
                <span className="badge-leaf bg-[#E8802F]/15 text-[#E8802F]">
                  ✨ Un passo avanti (i+1)
                </span>
              ) : isConsolidation ? (
                <span className="badge-leaf bg-[#6B7C4F]/15 text-[#6B7C4F]">
                  🎯 Consolidamento
                </span>
              ) : null}
            </div>
          </div>

          {/* Reading Passage Card */}
          <div
            className={`bento-card space-y-4 ${
              isAdvanceText
                ? 'border-2 border-[#E8802F]/50 bg-gradient-to-br from-white to-[#E8802F]/5'
                : ''
            }`}
          >
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="text-xs font-bold text-[#3A2B22]/70 font-display">
                ⏱ Lettura: ~{readingText.estimatedMinutes || 3} min
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-display text-[#3A2B22]">
                {readingText.title}
              </h2>
              {/* If title translation exists */}
              {(readingText as any).titleTranslation && (
                <p className="text-xs font-bold text-[#6B7C4F] mt-0.5">
                  {(readingText as any).titleTranslation}
                </p>
              )}
            </div>

            <div className="text-xs text-[#6B7C4F] bg-[#6B7C4F]/10 p-3 rounded-2xl flex items-center gap-2 border border-[#6B7C4F]/20">
              <span className="text-lg">💡</span>
              <span className="font-medium">
                Tocca qualsiasi parola nel testo per scoprirne il significato e salvarla nella tua tana!
              </span>
            </div>

            {/* Interactive Word Text */}
            <div className="text-base sm:text-lg leading-relaxed text-[#3A2B22] border-t border-[#6B7C4F]/10 pt-4 space-y-3 font-serif">
              {((readingText as any).paragraphs || readingText.testo.split('\n')).map(
                (paragraph: string, pIdx: number) => (
                  <p key={pIdx}>
                    {paragraph.split(' ').map((word: string, wIdx: number) => (
                      <span
                        key={wIdx}
                        onClick={() => handleWordTap(word)}
                        className="cursor-pointer hover:bg-[#E8802F]/20 hover:text-[#E8802F] rounded px-0.5 py-0.2 transition-all inline-block font-sans"
                      >
                        {word}{' '}
                      </span>
                    ))}
                  </p>
                )
              )}
            </div>

            {/* Secondary Generation Controls */}
            <div className="pt-3 border-t border-[#3A2B22]/10 flex flex-col sm:flex-row items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleGenerateReading(currentLevel, currentGenre)}
                className="text-xs font-bold font-display text-[#E8802F] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>🔄 Genera un'altra lettura su questo argomento</span>
              </button>

              <button
                type="button"
                onClick={handleBackToSetup}
                className="text-xs font-bold font-display text-[#6B7C4F] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>🎨 Cambia argomento o livello →</span>
              </button>
            </div>
          </div>

          {/* Domande di comprensione */}
          {readingText.domande && readingText.domande.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="badge-leaf bg-[#C99A3D]">Domande di comprensione</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {readingText.domande.map((q, idx) => {
                  const isChecked = checkedQuestions[q.id];
                  const userAns = userAnswers[q.id] || '';
                  const isCorrect =
                    userAns.trim().toLowerCase() === q.rispostaCorretta.trim().toLowerCase();

                  return (
                    <div key={q.id} className="bento-card space-y-3">
                      <p className="font-bold text-base text-[#3A2B22] font-display">
                        {idx + 1}. {q.domanda}
                      </p>

                      {q.tipo === 'multiple_choice' && q.opzioni ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.opzioni.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => setUserAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                              disabled={isChecked}
                              className={`p-3.5 rounded-2xl text-left text-xs sm:text-sm font-bold font-display border-2 transition-all cursor-pointer ${
                                userAns === opt
                                  ? 'bg-[#6B7C4F]/10 border-[#6B7C4F] text-[#3A2B22]'
                                  : 'bg-white border-[#6B7C4F]/20 hover:border-[#6B7C4F] text-[#3A2B22]'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={userAns}
                          onChange={(e) =>
                            setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          disabled={isChecked}
                          placeholder="Scrivi qui la risposta..."
                          className="w-full p-3.5 rounded-2xl bg-[#F2E8D5]/40 border border-[#6B7C4F]/30 focus:outline-none focus:border-[#6B7C4F] text-sm text-[#3A2B22] font-medium"
                        />
                      )}

                      {!isChecked ? (
                        <button
                          onClick={() => {
                            const updated = { ...checkedQuestions, [q.id]: true };
                            setCheckedQuestions(updated);
                            if (readingText?.domande && readingText.domande.length > 0) {
                              const allChecked = readingText.domande.every(
                                (question) => updated[question.id]
                              );
                              if (allChecked && onCompleteReading) {
                                onCompleteReading(currentLevel);
                              }
                            }
                          }}
                          disabled={!userAns.trim()}
                          className="btn-zucca w-full py-3 text-sm disabled:opacity-50 cursor-pointer"
                        >
                          Verifica Risposta ⚡
                        </button>
                      ) : (
                        <div
                          className={`p-3.5 rounded-2xl border text-xs sm:text-sm ${
                            isCorrect
                              ? 'bg-[#6B7C4F]/10 border-[#6B7C4F]'
                              : 'bg-[#C99A3D]/15 border-[#C99A3D]'
                          }`}
                        >
                          <span className="font-bold font-display">
                            {isCorrect ? '✨ Esatto!' : `💡 Risposta: "${q.rispostaCorretta}"`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- Interactive Word Explanation Modal Sheet -------------------- */}
      {selectedWord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full space-y-4 border-t-2 sm:border-2 border-[#6B7C4F] animate-fade-in">
            <div className="flex justify-between items-center border-b border-[#6B7C4F]/10 pb-3">
              <span className="text-xs font-bold uppercase text-[#6B7C4F]">Dizionario Tana</span>
              <button
                onClick={() => setSelectedWord(null)}
                className="text-xs font-bold text-gray-400 hover:text-black cursor-pointer"
              >
                ✕ Chiudi
              </button>
            </div>

            {isExplaining ? (
              <div className="text-center py-6 space-y-2">
                <Mascot pose="thinking" size={80} />
                <p className="text-xs text-[#3A2B22]/70 font-medium">Sto cercando "{selectedWord}"...</p>
              </div>
            ) : wordExplanation ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-bold font-display text-[#3A2B22]">
                    {wordExplanation.term}
                  </h3>
                  <span className="text-sm font-bold text-[#E8802F]">
                    {wordExplanation.translation}
                  </span>
                </div>

                <p className="text-xs text-[#3A2B22]/80 leading-relaxed bg-[#F2E8D5]/60 p-3 rounded-2xl">
                  {wordExplanation.explanation}
                </p>

                {wordExplanation.exampleSource && (
                  <div className="text-xs italic text-[#3A2B22]/75">
                    "{wordExplanation.exampleSource}"
                    <div className="text-[11px] not-italic text-[#6B7C4F]">
                      ({wordExplanation.exampleTranslation})
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddWordToTana}
                  disabled={wordSavedSuccess}
                  className={`w-full py-3.5 rounded-2xl font-bold font-display text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    wordSavedSuccess
                      ? 'bg-[#6B7C4F] text-white'
                      : 'bg-[#E8802F] text-white hover:bg-[#E8802F]/90'
                  }`}
                >
                  <span>{wordSavedSuccess ? '✓ Salvata in tana!' : '🌰 Aggiungi in tana'}</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-red-500 text-center py-4">Impossibile spiegare la parola selezionata.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
