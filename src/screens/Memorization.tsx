import React, { useState, useMemo } from 'react';
import { Mascot } from '../mascot/Mascot';
import { VocabItem, ExerciseError, AnswerEvaluationResult } from '../types';
import { evaluateUserAnswer } from '../services/gemini';
import { calculateNextReview, filterDueItems } from '../services/leitner';
import { TanaManager } from '../components/TanaManager';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../data/languages';
import { playSound } from '../services/sound';
import { ArrowLeft, BookOpen, Target, Sparkles, CheckCircle2, XCircle, HelpCircle, Layers } from 'lucide-react';

export type ReviewMode = 'all' | 'vocab_only' | 'errors_only';

type ReviewSessionItem =
  | { kind: 'vocab'; item: VocabItem }
  | { kind: 'error'; item: ExerciseError };

interface MemorizationProps {
  vocabItems: VocabItem[];
  exerciseErrors?: ExerciseError[];
  onSaveItem: (item: VocabItem) => void;
  onSaveExerciseError?: (item: ExerciseError) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteExerciseError?: (errorId: string) => void;
  onSessionComplete: (acornsEarned: number) => void;
  onBackToHome: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Memorization: React.FC<MemorizationProps> = ({
  vocabItems,
  exerciseErrors = [],
  onSaveItem,
  onSaveExerciseError,
  onDeleteItem,
  onDeleteExerciseError,
  onSessionComplete,
  onBackToHome,
  t,
}) => {
  const [reviewMode, setReviewMode] = useState<ReviewMode>('all');
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [showTanaManager, setShowTanaManager] = useState<boolean>(false);

  // Filter due items based on mode
  const dueVocab = useMemo(() => filterDueItems(vocabItems, 20), [vocabItems]);
  const dueErrors = useMemo(() => filterDueItems(exerciseErrors, 20), [exerciseErrors]);

  const sessionPool: ReviewSessionItem[] = useMemo(() => {
    if (reviewMode === 'vocab_only') {
      return dueVocab.map((item) => ({ kind: 'vocab', item }));
    }
    if (reviewMode === 'errors_only') {
      return dueErrors.map((item) => ({ kind: 'error', item }));
    }
    // 'all': combine and shuffle
    const combined: ReviewSessionItem[] = [
      ...dueVocab.map((item) => ({ kind: 'vocab' as const, item })),
      ...dueErrors.map((item) => ({ kind: 'error' as const, item })),
    ];
    return combined.sort(() => 0.5 - Math.random()).slice(0, 20);
  }, [reviewMode, dueVocab, dueErrors]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userTypedAnswer, setUserTypedAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluationResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // If session has not started yet, show game-like session launcher
  if (!sessionStarted) {
    const totalDue = dueVocab.length + dueErrors.length;

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 max-w-xl mx-auto space-y-6 text-[#F2E8D5] animate-fade-in">
        {/* Top Exit */}
        <div className="w-full flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2B2622] border border-[#6B7C4F]/30 text-[#859966] hover:text-[#F2E8D5] font-display text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Torna alla Tana</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTanaManager(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2B2622] border border-[#6B7C4F]/30 text-[#F2E8D5]/80 hover:text-[#F2E8D5] font-display text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <span>📚 Gestisci Tana</span>
          </button>
        </div>

        <Mascot
          pose={totalDue > 0 ? 'reading' : 'happy'}
          size={130}
          speechBubble={
            totalDue > 0
              ? `Pronto per il ripasso? Abbiamo ${totalDue} elementi in scadenza oggi!`
              : 'Tana in perfetto ordine! Nessun ripasso urgente oggi.'
          }
        />

        {/* Mode Selector */}
        <div className="w-full space-y-3">
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black font-display text-[#F2E8D5] tracking-tight">
              Ripasso Leitner 🗃️
            </h2>
            <p className="text-xs sm:text-sm text-[#F2E8D5]/70 font-medium">
              Scegli cosa vuoi ripassare oggi nella tua sessione
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setReviewMode('all')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer ${
                reviewMode === 'all'
                  ? 'border-[#E8802F] bg-[#E8802F]/20 text-[#F2E8D5] shadow-md scale-[1.02]'
                  : 'border-[#6B7C4F]/30 bg-[#2B2622] text-[#F2E8D5]/70 hover:border-[#6B7C4F]'
              }`}
            >
              <span className="text-2xl">⚡</span>
              <span className="font-extrabold font-display text-sm">Tutto insieme</span>
              <span className="text-[11px] font-bold text-[#859966]">
                {dueVocab.length + dueErrors.length} elementi
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReviewMode('vocab_only')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer ${
                reviewMode === 'vocab_only'
                  ? 'border-[#6B7C4F] bg-[#6B7C4F]/25 text-[#F2E8D5] shadow-md scale-[1.02]'
                  : 'border-[#6B7C4F]/30 bg-[#2B2622] text-[#F2E8D5]/70 hover:border-[#6B7C4F]'
              }`}
            >
              <span className="text-2xl">📖</span>
              <span className="font-extrabold font-display text-sm">Solo Vocaboli</span>
              <span className="text-[11px] font-bold text-[#859966]">
                {dueVocab.length} in scadenza
              </span>
            </button>

            <button
              type="button"
              onClick={() => setReviewMode('errors_only')}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer ${
                reviewMode === 'errors_only'
                  ? 'border-purple-500 bg-purple-500/20 text-[#F2E8D5] shadow-md scale-[1.02]'
                  : 'border-[#6B7C4F]/30 bg-[#2B2622] text-[#F2E8D5]/70 hover:border-[#6B7C4F]'
              }`}
            >
              <span className="text-2xl">🎯</span>
              <span className="font-extrabold font-display text-sm">Errori Esercizio</span>
              <span className="text-[11px] font-bold text-[#859966]">
                {dueErrors.length} da rivedere
              </span>
            </button>
          </div>

          <div className="pt-3">
            {sessionPool.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setCorrectCount(0);
                  setIsFinished(false);
                  setEvaluation(null);
                  setSessionStarted(true);
                  playSound('review');
                }}
                className="btn-zucca w-full py-4 text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer font-black"
              >
                <span>Avvia Sessione di Ripasso</span>
                <span className="text-sm px-2 py-0.5 bg-black/20 rounded-full font-bold">
                  ({sessionPool.length})
                </span>
                <span>⚡</span>
              </button>
            ) : (
              <div className="text-center p-4 bg-[#2B2622] rounded-2xl border border-[#6B7C4F]/30 space-y-2">
                <p className="text-xs text-[#859966] font-bold">
                  Nessun elemento da ripassare in questa modalità!
                </p>
                <button
                  type="button"
                  onClick={() => setShowTanaManager(true)}
                  className="text-xs font-bold text-[#E8802F] hover:underline cursor-pointer"
                >
                  Apri la Tana per vedere tutti gli elementi salvati →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tana Manager Modal */}
        {showTanaManager && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto flex items-center justify-center animate-fade-in">
            <div className="w-full max-w-3xl">
              <TanaManager
                vocabItems={vocabItems}
                exerciseErrors={exerciseErrors}
                onDeleteItem={onDeleteItem}
                onDeleteExerciseError={onDeleteExerciseError}
                onClose={() => setShowTanaManager(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active review item
  const currentSessionItem = sessionPool[currentIndex];

  if (!currentSessionItem || isFinished) {
    const totalEarned = correctCount * 5;
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6 animate-fade-in text-[#F2E8D5]">
        <Mascot pose="happy" size={150} speechBubble="Grandioso! Sessione di ripasso completata con successo!" />

        <div className="bg-[#2B2622] rounded-3xl p-6 shadow-xl border-2 border-[#6B7C4F]/40 space-y-4 w-full">
          <h2 className="text-2xl font-black font-display text-[#F2E8D5]">Sessione Completata! 🎉</h2>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="bg-[#1A1512] p-4 rounded-2xl border border-[#6B7C4F]/30">
              <div className="text-2xl font-black font-display text-[#859966]">
                {correctCount} / {sessionPool.length}
              </div>
              <div className="text-xs text-[#F2E8D5]/70 font-medium mt-1">Risposte corrette</div>
            </div>

            <div className="bg-[#1A1512] p-4 rounded-2xl border border-[#E8802F]/30">
              <div className="text-2xl font-black font-display text-[#E8802F]">
                +{totalEarned} 🌰
              </div>
              <div className="text-xs text-[#F2E8D5]/70 font-medium mt-1">Ghiande guadagnate</div>
            </div>
          </div>

          <p className="text-xs text-[#F2E8D5]/75 leading-relaxed">
            Ogni ripasso rafforza le tue sinapsi e sposta i contenuti nei box Leitner più avanzati!
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToHome}
          className="w-full py-4 rounded-2xl bg-[#E8802F] text-[#1A1512] font-black font-display text-base shadow-lg hover:bg-[#E8802F]/90 active:scale-98 transition-all cursor-pointer"
        >
          Torna alla Tana 🏠
        </button>
      </div>
    );
  }

  // Handle Item Details
  const isVocab = currentSessionItem.kind === 'vocab';
  const vocab = isVocab ? currentSessionItem.item : null;
  const error = !isVocab ? currentSessionItem.item : null;

  // For Vocab: 50/50 direction
  const isTermToTranslation = Boolean(currentIndex % 2 === 0);

  const promptText = isVocab
    ? isTermToTranslation
      ? vocab!.term
      : vocab!.translation
    : error!.domanda;

  const targetAnswer = isVocab
    ? isTermToTranslation
      ? vocab!.translation
      : vocab!.term
    : error!.rispostaCorretta;

  const exampleText = isVocab
    ? isTermToTranslation
      ? vocab!.exampleSource
      : vocab!.exampleTranslation
    : error!.spiegazione;

  // Options for multiple choice (if provided in error or generated for vocab)
  const options = useMemo(() => {
    if (!isVocab && error?.opzioni && error.opzioni.length > 1) {
      return [...error.opzioni];
    }
    if (isVocab) {
      const others = vocabItems.filter((i) => i.id !== vocab!.id);
      const d1 = others[0] ? (isTermToTranslation ? others[0].translation : others[0].term) : 'casa';
      const d2 = others[1] ? (isTermToTranslation ? others[1].translation : others[1].term) : 'lavoro';
      const d3 = others[2] ? (isTermToTranslation ? others[2].translation : others[2].term) : 'tempo';
      return [targetAnswer, d1, d2, d3].sort(() => 0.5 - Math.random());
    }
    return [];
  }, [currentSessionItem, isTermToTranslation, targetAnswer]);

  const hasOptions = options.length >= 2;

  const handleSubmit = async (answerToCheck?: string) => {
    const answer = answerToCheck !== undefined ? answerToCheck : userTypedAnswer;
    if (!answer.trim() || isEvaluating) return;

    setIsEvaluating(true);
    try {
      let isCorrect = false;
      let feedbackExplanation = '';

      if (isVocab) {
        const result = await evaluateUserAnswer(
          promptText,
          targetAnswer,
          answer,
          isTermToTranslation ? vocab!.synonyms : []
        );
        isCorrect = result.corretto;
        feedbackExplanation = result.spiegazione;
      } else {
        // Direct or normalized match for exercise error
        isCorrect = answer.trim().toLowerCase() === targetAnswer.trim().toLowerCase();
        feedbackExplanation = isCorrect
          ? 'Esatto! Hai corretto l\'errore con precisione.'
          : error?.spiegazione || `La risposta corretta è "${targetAnswer}".`;
      }

      setEvaluation({
        corretto: isCorrect,
        spiegazione: feedbackExplanation,
      });

      if (isCorrect) {
        playSound('correct');
        setCorrectCount((prev) => prev + 1);
      } else {
        playSound('review');
      }

      // Update Leitner stats
      if (isVocab && vocab) {
        const { box, nextReviewAt, correctStreakChange } = calculateNextReview(vocab.box, isCorrect);
        const updatedVocab: VocabItem = {
          ...vocab,
          box,
          nextReviewAt,
          lastReviewedAt: Date.now(),
          correctStreak: Math.max(0, vocab.correctStreak + correctStreakChange),
          wrongCount: isCorrect ? vocab.wrongCount : vocab.wrongCount + 1,
        };
        onSaveItem(updatedVocab);
      } else if (!isVocab && error && onSaveExerciseError) {
        const { box, nextReviewAt, correctStreakChange } = calculateNextReview(error.box, isCorrect);
        const updatedError: ExerciseError = {
          ...error,
          box,
          nextReviewAt,
          lastReviewedAt: Date.now(),
          correctStreak: Math.max(0, (error.correctStreak || 0) + correctStreakChange),
          wrongCount: isCorrect ? error.wrongCount : error.wrongCount + 1,
        };
        onSaveExerciseError(updatedError);
      }
    } catch (e) {
      console.error('Error evaluating answer:', e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDontKnow = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    try {
      playSound('review');
      setEvaluation({
        corretto: false,
        spiegazione: `Nessun problema! "${promptText}" ➔ "${targetAnswer}". Verrà riproposto nel prossimo ripasso per fissarlo bene.`,
      });

      if (isVocab && vocab) {
        const { box, nextReviewAt } = calculateNextReview(vocab.box, false);
        const updatedVocab: VocabItem = {
          ...vocab,
          box,
          nextReviewAt,
          lastReviewedAt: Date.now(),
          correctStreak: 0,
          wrongCount: vocab.wrongCount + 1,
        };
        onSaveItem(updatedVocab);
      } else if (!isVocab && error && onSaveExerciseError) {
        const { box, nextReviewAt } = calculateNextReview(error.box, false);
        const updatedError: ExerciseError = {
          ...error,
          box,
          nextReviewAt,
          lastReviewedAt: Date.now(),
          correctStreak: 0,
          wrongCount: error.wrongCount + 1,
        };
        onSaveExerciseError(updatedError);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextItem = () => {
    setEvaluation(null);
    setUserTypedAnswer('');
    setSelectedOption(null);

    if (currentIndex + 1 < sessionPool.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      playSound('sessionComplete');
      const acornsEarned = (correctCount + (evaluation?.corretto ? 1 : 0)) * 5;
      onSessionComplete(acornsEarned);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-28 text-[#F2E8D5] animate-fade-in">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between bg-[#2B2622] p-3 px-4 rounded-2xl border border-[#6B7C4F]/30 shadow-md">
        <button
          type="button"
          onClick={() => setSessionStarted(false)}
          className="text-xs font-bold text-[#859966] hover:text-[#F2E8D5] font-display flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Esci</span>
        </button>

        <div className="flex-1 max-w-xs mx-3 bg-[#1A1512] h-2.5 rounded-full overflow-hidden border border-[#6B7C4F]/30">
          <div
            className="bg-[#6B7C4F] h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / sessionPool.length) * 100}%` }}
          />
        </div>

        <span className="text-xs font-black font-display text-[#F2E8D5]/80">
          {currentIndex + 1} / {sessionPool.length}
        </span>
      </div>

      {/* Mascot Feedback / Thinking Display */}
      <div className="flex justify-center my-1">
        {evaluation ? (
          <Mascot
            pose={evaluation.corretto ? 'happy' : 'digging'}
            size={120}
            speechBubble={evaluation.spiegazione}
          />
        ) : (
          <Mascot
            pose="thinking"
            size={105}
            speechBubble={
              isVocab
                ? `Come tradurresti "${promptText}"?`
                : `Completa o rispondi all'esercizio!`
            }
          />
        )}
      </div>

      {/* Main Review Card - High Contrast Game Layout */}
      <div className="bg-[#2B2622] rounded-3xl p-5 sm:p-6 border-2 border-[#6B7C4F]/35 shadow-xl text-center space-y-4">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="badge-leaf bg-[#C99A3D] text-[#1A1512] font-black">
            Box Leitner {isVocab ? vocab!.box : error!.box}
          </span>
          <span className="text-[11px] font-bold text-[#859966] bg-[#6B7C4F]/20 border border-[#6B7C4F]/40 px-2.5 py-0.5 rounded-full font-display uppercase">
            {isVocab
              ? 'Vocabolario'
              : `Errore Esercizio • ${error!.argomentoRiferimento}`}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#859966] font-display">
            {isVocab ? 'Termine da tradurre' : 'Domanda / Esercizio'}
          </span>
          <h3 className="text-2xl sm:text-3xl font-black font-display text-[#F2E8D5] mt-1 tracking-tight leading-snug">
            {promptText}
          </h3>
        </div>

        {exampleText && (
          <p className="text-xs sm:text-sm text-[#F2E8D5]/80 italic border-t border-[#6B7C4F]/25 pt-3 mt-2">
            "{exampleText}"
          </p>
        )}
      </div>

      {/* Interaction Controls */}
      {!evaluation ? (
        <div className="space-y-3">
          {hasOptions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedOption(opt);
                    handleSubmit(opt);
                  }}
                  disabled={isEvaluating}
                  className={`p-4 rounded-2xl text-left font-bold font-display text-sm border-2 transition-all flex items-center justify-between cursor-pointer ${
                    selectedOption === opt
                      ? 'bg-[#E8802F]/20 border-[#E8802F] text-[#E8802F]'
                      : 'bg-[#1A1512] border-[#6B7C4F]/30 hover:border-[#E8802F] text-[#F2E8D5]'
                  }`}
                >
                  <span className="pr-2">{opt}</span>
                  <span className="text-xs text-[#859966] font-display font-extrabold shrink-0">
                    Scegli
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={userTypedAnswer}
                onChange={(e) => setUserTypedAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Scrivi qui la risposta..."
                disabled={isEvaluating}
                autoFocus
                className="w-full p-4 rounded-2xl bg-[#1A1512] border-2 border-[#6B7C4F]/40 focus:border-[#E8802F] focus:outline-none text-base text-[#F2E8D5] placeholder-[#F2E8D5]/40 font-medium shadow-sm transition-all"
              />

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!userTypedAnswer.trim() || isEvaluating}
                className="btn-zucca w-full py-4 text-base disabled:opacity-50 cursor-pointer font-black"
              >
                {isEvaluating ? 'Verifico...' : 'Conferma risposta ⚡'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleDontKnow}
            disabled={isEvaluating}
            className="w-full py-3 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/30 text-[#F2E8D5]/75 hover:text-[#F2E8D5] font-bold text-xs hover:border-[#6B7C4F] transition-all text-center cursor-pointer font-display"
          >
            🤔 Non lo so / mostrami la risposta
          </button>
        </div>
      ) : (
        /* High Contrast Immediate Feedback */
        <div
          className={`rounded-3xl p-5 sm:p-6 border-2 text-center space-y-4 shadow-xl ${
            evaluation.corretto
              ? 'bg-[#2B2622] border-[#6B7C4F]'
              : 'bg-[#2B2622] border-amber-500/70'
          }`}
        >
          <div className="flex items-center justify-center gap-2 font-black font-display text-lg sm:text-xl">
            {evaluation.corretto ? (
              <span className="text-[#859966] flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                <span>Risposta Corretta!</span>
              </span>
            ) : (
              <span className="text-[#E8802F] flex items-center gap-1.5">
                <XCircle className="w-5 h-5" />
                <span>Da Rivedere Insieme</span>
              </span>
            )}
          </div>

          <div className="bg-[#1A1512] p-3.5 rounded-2xl border border-[#6B7C4F]/30 text-xs sm:text-sm font-medium text-[#F2E8D5]">
            <span className="text-[#859966] font-bold">Risposta esatta:</span>{' '}
            <span className="font-extrabold font-display text-base text-[#F2E8D5] underline decoration-[#E8802F]">
              {targetAnswer}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextItem}
            className="btn-zucca w-full py-4 text-base shadow-lg cursor-pointer font-black"
          >
            Continua →
          </button>
        </div>
      )}

      {/* Tana Manager Modal */}
      {showTanaManager && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto flex items-center justify-center animate-fade-in">
          <div className="w-full max-w-3xl">
            <TanaManager
              vocabItems={vocabItems}
              exerciseErrors={exerciseErrors}
              onDeleteItem={onDeleteItem}
              onDeleteExerciseError={onDeleteExerciseError}
              onClose={() => setShowTanaManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
