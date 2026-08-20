import React, { useState } from 'react';
import { CEFRLevel, ReadingText, VocabItem, ExerciseError } from '../../types';
import { explainWordInContext } from '../../services/gemini';
import { Volume2, Star, CheckCircle2, RefreshCw, ArrowLeft, Lightbulb, Sparkles, BookOpen } from 'lucide-react';

interface ReadingSectionProps {
  readingData: ReadingText;
  targetLang?: string;
  nativeLang?: string;
  targetName?: string;
  nativeName?: string;
  currentLevel?: CEFRLevel;
  currentGenre?: string;
  isAdvanceText?: boolean;
  isConsolidation?: boolean;
  onSaveVocabItem?: (item: VocabItem) => void;
  onSaveExerciseError?: (item: ExerciseError) => void;
  onCompleteReading?: (level: CEFRLevel, score: number, total: number) => void;
  onRegenerate?: () => void;
  onChangeTopic?: () => void;
  mode?: 'standalone' | 'guided_lesson';
}

export const ReadingSection: React.FC<ReadingSectionProps> = ({
  readingData,
  targetLang = 'en',
  nativeLang = 'it',
  targetName = 'Inglese',
  nativeName = 'Italiano',
  currentLevel = 'A1',
  currentGenre = 'Sorprendimi',
  isAdvanceText = false,
  isConsolidation = false,
  onSaveVocabItem,
  onSaveExerciseError,
  onCompleteReading,
  onRegenerate,
  onChangeTopic,
  mode = 'standalone',
}) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordExplanation, setWordExplanation] = useState<{
    term: string;
    translation: string;
    explanation: string;
    exampleSource: string;
    exampleTranslation: string;
  } | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [isSavedInTana, setIsSavedInTana] = useState<boolean>(false);

  // Comprehension questions state
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});

  const paragraphs = readingData.paragraphs && readingData.paragraphs.length > 0
    ? readingData.paragraphs
    : (readingData.testo ? readingData.testo.split(/\n\n+/).filter(Boolean) : []);

  const questions = readingData.domande || readingData.questions || [];

  const handleWordTap = async (word: string) => {
    const cleanWord = word.replace(/^[^\w\s]+|[^\w\s]+$/g, '').trim();
    if (!cleanWord || cleanWord.length < 2) return;

    setSelectedWord(cleanWord);
    setIsExplaining(true);
    setWordExplanation(null);
    setIsSavedInTana(false);

    try {
      // Find sentence context if available
      const fullText = readingData.testo || paragraphs.join(' ');
      const sentences = fullText.split(/[.!?]+/).filter(Boolean);
      const matchedSentence = sentences.find((s) =>
        new RegExp(`\\b${cleanWord}\\b`, 'i').test(s)
      ) || cleanWord;

      const expl = await explainWordInContext(
        cleanWord,
        matchedSentence.trim(),
        nativeName,
        targetName
      );

      setWordExplanation(expl);
    } catch (err) {
      console.error('Errore spiegazione vocabolo:', err);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSpeak = (textToSpeak: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = targetLang === 'en' ? 'en-US' : targetLang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveToTana = () => {
    if (!wordExplanation || !onSaveVocabItem) return;

    const newItem: VocabItem = {
      id: `vocab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      term: wordExplanation.term || selectedWord || '',
      translation: wordExplanation.translation || '',
      sourceLang: (targetLang as 'it' | 'en') || 'en',
      targetLang: (nativeLang as 'it' | 'en') || 'it',
      synonyms: [],
      exampleSource: wordExplanation.exampleSource || '',
      exampleTranslation: wordExplanation.exampleTranslation || '',
      usageNote: wordExplanation.explanation || '',
      origin: 'reading_word',
      originDetail: `Lettura: ${readingData.title || currentGenre}`,
      createdAt: Date.now(),
      lastReviewedAt: null,
      box: 1,
      nextReviewAt: Date.now(),
      correctStreak: 0,
      wrongCount: 0,
    };

    onSaveVocabItem(newItem);
    setIsSavedInTana(true);
  };

  const handleVerifyQuestion = (qId: string) => {
    const q = questions.find((item) => item.id === qId);
    if (!q) return;

    const userAns = (userAnswers[qId] || '').trim();
    const correctAns = (q.rispostaCorretta || q.correctAnswer || '').trim();
    const isCorrect = userAns.toLowerCase() === correctAns.toLowerCase();

    const updated = { ...checkedQuestions, [qId]: true };
    setCheckedQuestions(updated);

    if (!isCorrect && onSaveExerciseError) {
      onSaveExerciseError({
        id: `reading_err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        domanda: q.domanda || q.question || 'Domanda di lettura',
        rispostaCorretta: correctAns,
        tipo: 'lettura',
        argomentoRiferimento: `Lettura: ${readingData.title || currentGenre}`,
        createdAt: Date.now(),
        box: 1,
        nextReviewAt: Date.now(),
        wrongCount: 1,
        lastReviewedAt: null,
        correctStreak: 0,
        opzioni: q.opzioni || q.options,
      });
    }

    // Check if all questions are completed
    if (questions.length > 0) {
      const allChecked = questions.every((question) => updated[question.id]);
      if (allChecked && onCompleteReading) {
        let score = 0;
        questions.forEach((question) => {
          const uA = (userAnswers[question.id] || '').trim().toLowerCase();
          const cA = (question.rispostaCorretta || question.correctAnswer || '').trim().toLowerCase();
          if (uA === cA) score += 1;
        });
        onCompleteReading(readingData.level || currentLevel, score, questions.length);
      }
    }
  };

  const allQuestionsChecked = questions.length > 0 && questions.every((q) => checkedQuestions[q.id]);
  const correctCount = questions.filter((q) => {
    const uA = (userAnswers[q.id] || '').trim().toLowerCase();
    const cA = (q.rispostaCorretta || q.correctAnswer || '').trim().toLowerCase();
    return uA === cA;
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Header if Standalone */}
      {mode === 'standalone' && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {onChangeTopic && (
            <button
              type="button"
              onClick={onChangeTopic}
              className="py-2 px-3.5 rounded-xl bg-[#2B2622] border border-[#6B7C4F]/35 hover:border-[#E8802F] text-xs font-bold font-display text-[#F2E8D5] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#E8802F]" />
              <span>Cosa vuoi leggere oggi?</span>
            </button>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-muschio">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{readingData.genre || currentGenre}</span>
            </span>
            <span className={`badge-leaf ${isAdvanceText ? 'bg-[#E8802F] text-[#1A1512]' : ''}`}>
              Livello {readingData.level || currentLevel}
            </span>
            {isAdvanceText ? (
              <span className="badge-zucca">
                <Sparkles className="w-3 h-3" />
                <span>Un passo avanti (i+1)</span>
              </span>
            ) : isConsolidation ? (
              <span className="badge-muschio">
                <span>🎯 Consolidamento</span>
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Main Reading Passage Bento Card */}
      <div
        className={`bento-card space-y-4 ${
          isAdvanceText
            ? 'border-2 border-[#E8802F]/60 bg-gradient-to-br from-[#2B2622] to-[#36271c]'
            : ''
        }`}
      >
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="text-xs font-bold text-[#859966] font-display flex items-center gap-1.5">
            <span>⏱</span>
            <span>Tempo stimato: ~{readingData.estimatedMinutes || 3} min</span>
          </div>

          <button
            type="button"
            onClick={() => handleSpeak(readingData.title + '. ' + (paragraphs[0] || ''))}
            className="p-2 rounded-xl bg-[#1A1512] hover:bg-[#342D28] text-[#E8802F] border border-[#6B7C4F]/30 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Ascolta brano"
          >
            <Volume2 className="w-4 h-4" />
            <span>Ascolta</span>
          </button>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#F2E8D5] tracking-tight">
            {readingData.title || readingData.titolo}
          </h2>
          {(readingData.titleTranslation || readingData.titoloTraduzione) && (
            <p className="text-xs sm:text-sm font-semibold text-[#859966] mt-1">
              {readingData.titleTranslation || readingData.titoloTraduzione}
            </p>
          )}
        </div>

        {/* Tip banner */}
        <div className="text-xs text-[#F2E8D5] bg-[#1A1512] p-3.5 rounded-2xl flex items-center gap-2.5 border border-[#6B7C4F]/35">
          <span className="text-lg">💡</span>
          <span className="font-medium text-[#F2E8D5]/90">
            Tocca qualsiasi parola nel testo per scoprirne il significato, ascoltare la pronuncia e salvarla nella tua tana!
          </span>
        </div>

        {/* Interactive Paragraphs with word tapping */}
        <div className="text-base sm:text-lg leading-relaxed text-[#F2E8D5] border-t border-[#6B7C4F]/20 pt-4 space-y-4 select-text">
          {paragraphs.map((paragraph: string, pIdx: number) => (
            <p key={pIdx} className="leading-relaxed">
              {paragraph.split(' ').map((word: string, wIdx: number) => (
                <span
                  key={wIdx}
                  onClick={() => handleWordTap(word)}
                  className="cursor-pointer hover:bg-[#E8802F]/25 hover:text-[#E8802F] rounded-md px-0.5 py-0.2 transition-all inline-block active:scale-95"
                >
                  {word}{' '}
                </span>
              ))}
            </p>
          ))}
        </div>

        {/* Action buttons (Regenerate / Change) in Standalone mode */}
        {mode === 'standalone' && (
          <div className="pt-3 border-t border-[#6B7C4F]/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="text-xs font-bold font-display text-[#E8802F] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Genera un'altra lettura su questo argomento</span>
              </button>
            )}

            {onChangeTopic && (
              <button
                type="button"
                onClick={onChangeTopic}
                className="text-xs font-bold font-display text-[#859966] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Cambia argomento o livello →</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Comprehension Questions Section */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="badge-zucca">
              <span>Domande di comprensione ({questions.length})</span>
            </span>

            {allQuestionsChecked && (
              <span className="text-xs font-bold text-[#859966] font-display">
                Punteggio: {correctCount}/{questions.length} ✨
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {questions.map((q, idx) => {
              const isChecked = !!checkedQuestions[q.id];
              const userAns = userAnswers[q.id] || '';
              const correctAns = q.rispostaCorretta || q.correctAnswer || '';
              const isCorrect = userAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
              const options = q.opzioni || q.options || [];

              return (
                <div key={q.id || idx} className="bento-card space-y-3.5">
                  <p className="font-bold text-base text-[#F2E8D5] font-display">
                    {idx + 1}. {q.domanda || q.question}
                  </p>

                  {options.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {options.map((opt, oIdx) => {
                        const isSelected = userAns === opt;
                        let btnStyle = 'bg-[#1A1512] border-[#6B7C4F]/30 hover:border-[#E8802F] text-[#F2E8D5]';

                        if (isChecked) {
                          if (opt.trim().toLowerCase() === correctAns.trim().toLowerCase()) {
                            btnStyle = 'bg-[#6B7C4F]/30 border-[#6B7C4F] text-[#9BB07A] font-black';
                          } else if (isSelected && !isCorrect) {
                            btnStyle = 'bg-amber-950/40 border-amber-500/60 text-amber-200';
                          }
                        } else if (isSelected) {
                          btnStyle = 'bg-[#E8802F]/20 border-[#E8802F] text-[#F2E8D5] font-black';
                        }

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => setUserAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                            disabled={isChecked}
                            className={`p-3.5 rounded-2xl text-left text-xs sm:text-sm font-bold font-display border-2 transition-all cursor-pointer ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={userAns}
                      onChange={(e) =>
                        setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      disabled={isChecked}
                      placeholder="Scrivi qui la tua risposta..."
                      className="input-tana"
                    />
                  )}

                  {!isChecked ? (
                    <button
                      type="button"
                      onClick={() => handleVerifyQuestion(q.id)}
                      disabled={!userAns.trim()}
                      className="btn-zucca w-full py-3 text-sm disabled:opacity-50 cursor-pointer"
                    >
                      Verifica Risposta ⚡
                    </button>
                  ) : (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs sm:text-sm ${
                        isCorrect
                          ? 'bg-[#6B7C4F]/20 border-[#6B7C4F] text-[#F2E8D5]'
                          : 'bg-amber-950/40 border-amber-500/50 text-[#F2E8D5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold font-display">
                        <span>{isCorrect ? '✨ Risposta corretta!' : '💡 Risposta corretta:'}</span>
                        {!isCorrect && (
                          <span className="text-[#E8802F]">"{correctAns}"</span>
                        )}
                      </div>
                      {(q.spiegazione || q.explanation) && (
                        <p className="text-xs text-[#F2E8D5]/80 mt-1">
                          {q.spiegazione || q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Word Explanation Modal Sheet */}
      {selectedWord && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[#2B2622] text-[#F2E8D5] rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full space-y-4 border-t-2 sm:border-2 border-[#6B7C4F]/50 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Header with Title and Close Button */}
            <div className="flex items-center justify-between border-b border-[#6B7C4F]/25 pb-3">
              <div className="flex items-center gap-2">
                <span className="badge-zucca text-xs">
                  Vocabolario
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWord(null)}
                className="w-8 h-8 rounded-full bg-[#1A1512] hover:bg-[#342D28] text-[#F2E8D5] flex items-center justify-center text-sm font-bold cursor-pointer border border-[#6B7C4F]/30"
              >
                ✕
              </button>
            </div>

            {isExplaining ? (
              <div className="py-8 text-center space-y-3">
                <div className="text-3xl animate-bounce">🦝</div>
                <p className="text-xs text-[#859966] font-display font-bold">
                  Rocky sta analizzando "{selectedWord}"...
                </p>
              </div>
            ) : wordExplanation ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold font-display text-[#F2E8D5]">
                      {wordExplanation.term || selectedWord}
                    </h3>
                    <p className="text-base font-bold text-[#E8802F] font-display">
                      {wordExplanation.translation}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSpeak(wordExplanation.term || selectedWord)}
                    className="p-3 rounded-2xl bg-[#1A1512] hover:bg-[#342D28] text-[#E8802F] border border-[#6B7C4F]/40 cursor-pointer shadow-xs"
                    title="Ascolta pronuncia"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                {wordExplanation.explanation && (
                  <div className="text-xs text-[#F2E8D5]/85 leading-relaxed bg-[#1A1512] p-3.5 rounded-2xl border border-[#6B7C4F]/25 space-y-1">
                    <span className="font-bold text-[#859966] flex items-center gap-1 text-[11px] uppercase tracking-wider">
                      <Lightbulb className="w-3 h-3" />
                      Significato & Contesto
                    </span>
                    <p>{wordExplanation.explanation}</p>
                  </div>
                )}

                {wordExplanation.exampleSource && (
                  <div className="text-xs bg-[#1A1512] p-3.5 rounded-2xl border border-[#6B7C4F]/25 space-y-1">
                    <span className="font-bold text-[#859966] text-[11px] uppercase tracking-wider">
                      Esempio
                    </span>
                    <p className="text-[#F2E8D5] font-medium italic">
                      "{wordExplanation.exampleSource}"
                    </p>
                    {wordExplanation.exampleTranslation && (
                      <p className="text-[#859966] text-[11px]">
                        "{wordExplanation.exampleTranslation}"
                      </p>
                    )}
                  </div>
                )}

                {/* Save to Tana Button */}
                {onSaveVocabItem && (
                  <button
                    type="button"
                    onClick={handleSaveToTana}
                    disabled={isSavedInTana}
                    className={`w-full py-3.5 rounded-2xl font-bold font-display text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      isSavedInTana
                        ? 'bg-[#6B7C4F]/30 text-[#9BB07A] border border-[#6B7C4F]'
                        : 'btn-zucca'
                    }`}
                  >
                    {isSavedInTana ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Salvato nella tua tana! ⭐</span>
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4 fill-current" />
                        <span>Salva nella Tana per ripassare ⭐</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#F2E8D5]/70">
                Spiegazione non disponibile al momento.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
