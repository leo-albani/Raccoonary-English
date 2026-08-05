import React, { useState, useEffect } from 'react';
import { Mascot } from '../mascot/Mascot';
import { CEFRLevel, ReadingText, UserProfile, VocabItem } from '../types';
import { generateReadingText, explainWordInContext } from '../services/gemini';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';

interface ReadingProps {
  onSaveVocabItem: (item: VocabItem) => void;
  userProfile?: UserProfile;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Reading: React.FC<ReadingProps> = ({ onSaveVocabItem, userProfile, t }) => {
  const [currentLevel, setCurrentLevel] = useState<CEFRLevel>('A1');
  const [readingText, setReadingText] = useState<ReadingText | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const loadText = async (level: CEFRLevel) => {
    setIsLoading(true);
    setReadingText(null);
    setUserAnswers({});
    setCheckedQuestions({});
    try {
      const data = await generateReadingText(level, targetLang, nativeLang, targetName, nativeName);
      setReadingText(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadText(currentLevel);
  }, [currentLevel, targetLang]);

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
      sourceLang: targetLang,
      targetLang: nativeLang,
      synonyms: [],
      exampleSource: wordExplanation.exampleSource || wordExplanation.term,
      exampleTranslation: wordExplanation.exampleTranslation || wordExplanation.translation,
      origin: 'reading_error',
      originDetail: `Brano ${currentLevel}`,
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

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* Level Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-[#6B7C4F]/20 flex overflow-x-auto no-scrollbar shadow-xs max-w-lg mx-auto">
        {levels.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setCurrentLevel(lvl)}
            className={`flex-1 py-2 px-3 rounded-xl font-bold font-display text-xs transition-all whitespace-nowrap cursor-pointer ${
              currentLevel === lvl
                ? 'bg-[#6B7C4F] text-white shadow-xs'
                : 'text-[#3A2B22]/70 hover:text-[#3A2B22] hover:bg-gray-100/50'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bento-card text-center py-12 space-y-3 max-w-2xl mx-auto">
          <Mascot pose="reading" size={130} speechBubble={`Sto scrivendo un brano di livello ${currentLevel} per te...`} />
          <p className="text-xs text-[#3A2B22]/70 font-medium">Un momento di lettura in arrivo...</p>
        </div>
      ) : readingText ? (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
          {/* Header & Reading Bento Card */}
          <div className="bento-card space-y-4">
            <div className="flex justify-between items-center">
              <span className="badge-leaf">
                Livello {currentLevel}
              </span>
              <span className="text-xs font-bold text-[#3A2B22]/70 font-display">
                ⏱ Lettura: ~{readingText.estimatedMinutes} min
              </span>
            </div>

            <h2 className="text-2xl font-bold font-display text-[#3A2B22]">
              {readingText.title}
            </h2>

            <div className="text-xs text-[#6B7C4F] bg-[#6B7C4F]/10 p-3 rounded-2xl flex items-center gap-2 border border-[#6B7C4F]/20">
              <span className="text-lg">💡</span>
              <span className="font-medium">Tocca qualsiasi parola nel testo per scoprirne il significato e aggiungerla in tana!</span>
            </div>

            {/* Interactive Word Text */}
            <div className="text-base sm:text-lg leading-relaxed text-[#3A2B22] border-t border-[#6B7C4F]/10 pt-4 space-y-3 font-serif">
              {readingText.testo.split('\n').map((paragraph, pIdx) => (
                <p key={pIdx}>
                  {paragraph.split(' ').map((word, wIdx) => (
                    <span
                      key={wIdx}
                      onClick={() => handleWordTap(word)}
                      className="cursor-pointer hover:bg-[#E8802F]/20 hover:text-[#E8802F] rounded px-0.5 py-0.2 transition-all inline-block font-sans"
                    >
                      {word}{' '}
                    </span>
                  ))}
                </p>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => loadText(currentLevel)}
                className="text-xs font-bold font-display text-[#E8802F] hover:underline flex items-center gap-1 cursor-pointer"
              >
                🔄 Genera un altro testo ({currentLevel})
              </button>
            </div>
          </div>

          {/* Domande di comprensione */}
          {readingText.domande && readingText.domande.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="badge-leaf bg-[#C99A3D]">Comprensione del testo</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {readingText.domande.map((q, idx) => {
                  const isChecked = checkedQuestions[q.id];
                  const userAns = userAnswers[q.id] || '';
                  const isCorrect = userAns.trim().toLowerCase() === q.rispostaCorretta.trim().toLowerCase();

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
                          onChange={(e) => setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          disabled={isChecked}
                          placeholder="Scrivi qui la risposta..."
                          className="w-full p-3.5 rounded-2xl bg-[#F2E8D5]/40 border border-[#6B7C4F]/30 focus:outline-none focus:border-[#6B7C4F] text-sm text-[#3A2B22] font-medium"
                        />
                      )}

                      {!isChecked ? (
                        <button
                          onClick={() => setCheckedQuestions((prev) => ({ ...prev, [q.id]: true }))}
                          disabled={!userAns.trim()}
                          className="btn-zucca w-full py-3 text-sm disabled:opacity-50"
                        >
                          Verifica Risposta ⚡
                        </button>
                      ) : (
                        <div
                          className={`p-3.5 rounded-2xl border text-xs sm:text-sm ${
                            isCorrect ? 'bg-[#6B7C4F]/10 border-[#6B7C4F]' : 'bg-[#C99A3D]/15 border-[#C99A3D]'
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
      ) : null}

      {/* Interactive Word Explanation Modal Sheet */}
      {selectedWord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full space-y-4 border-t-2 sm:border-2 border-[#6B7C4F] animate-fade-in">
            <div className="flex justify-between items-center border-b border-[#6B7C4F]/10 pb-3">
              <span className="text-xs font-bold uppercase text-[#6B7C4F]">Dizionario Tana</span>
              <button
                onClick={() => setSelectedWord(null)}
                className="text-xs font-bold text-gray-400 hover:text-black"
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
                  className={`w-full py-3.5 rounded-2xl font-bold font-display text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
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
