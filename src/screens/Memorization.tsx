import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { VocabItem, AnswerEvaluationResult } from '../types';
import { evaluateUserAnswer } from '../services/gemini';
import { calculateNextReview, filterDueItems } from '../services/leitner';
import { TanaManager } from '../components/TanaManager';

interface MemorizationProps {
  vocabItems: VocabItem[];
  onSaveItem: (item: VocabItem) => void;
  onDeleteItem: (itemId: string) => void;
  onSessionComplete: (acornsEarned: number) => void;
  onBackToHome: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Memorization: React.FC<MemorizationProps> = ({
  vocabItems,
  onSaveItem,
  onDeleteItem,
  onSessionComplete,
  onBackToHome,
  t,
}) => {
  const sessionPool = filterDueItems(vocabItems, 20);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userTypedAnswer, setUserTypedAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluationResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showTanaManager, setShowTanaManager] = useState(false);

  if (sessionPool.length === 0) {
    return (
      <div className="p-6 text-center max-w-2xl mx-auto space-y-6 pt-12">
        <Mascot pose="happy" size={140} speechBubble="Non ci sono parole in scadenza per il ripasso oggi! Ottimo lavoro!" />
        <div className="bento-card space-y-4">
          <span className="badge-leaf">Tana in Ordine</span>
          <h2 className="text-2xl font-bold font-display text-[#3A2B22]">Nessun ripasso in sospeso</h2>
          <p className="text-sm text-[#3A2B22]/75">
            Hai completato tutti i ripassi previsti per oggi. Torna domani o gestisci le parole già presenti in tana!
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowTanaManager(true)}
              className="btn-verde flex-1 py-3.5 text-sm"
            >
              📚 Gestisci la tana ({vocabItems.length})
            </button>
            <button
              onClick={onBackToHome}
              className="btn-zucca flex-1 py-3.5 text-sm"
            >
              Torna alla tana 🏠
            </button>
          </div>
        </div>

        {showTanaManager && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto flex items-center justify-center">
            <div className="w-full max-w-3xl">
              <TanaManager
                vocabItems={vocabItems}
                onDeleteItem={onDeleteItem}
                onClose={() => setShowTanaManager(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentItem = sessionPool[currentIndex];

  // Random 50/50 direction choice per item occurrence
  // Direction A (true): Term -> Translation
  // Direction B (false): Translation -> Term
  const isTermToTranslation = React.useMemo(() => Math.random() < 0.5, [currentIndex, currentItem.id]);

  const promptText = isTermToTranslation ? currentItem.term : currentItem.translation;
  const targetAnswer = isTermToTranslation ? currentItem.translation : currentItem.term;
  const exampleText = isTermToTranslation ? currentItem.exampleSource : currentItem.exampleTranslation;

  // Prepare multiple choice options if applicable
  const otherItems = vocabItems.filter((i) => i.id !== currentItem.id);
  const distractor1 = otherItems[0] ? (isTermToTranslation ? otherItems[0].translation : otherItems[0].term) : (isTermToTranslation ? 'gatto' : 'cat');
  const distractor2 = otherItems[1] ? (isTermToTranslation ? otherItems[1].translation : otherItems[1].term) : (isTermToTranslation ? 'albero' : 'tree');
  const distractor3 = otherItems[2] ? (isTermToTranslation ? otherItems[2].translation : otherItems[2].term) : (isTermToTranslation ? 'casa' : 'house');
  const rawOptions = [targetAnswer, distractor1, distractor2, distractor3];

  // Stable pseudo-random shuffle per item index and direction
  const options = React.useMemo(() => {
    return [...rawOptions].sort((a, b) => a.length - b.length || a.localeCompare(b));
  }, [currentItem.id, isTermToTranslation]);

  const handleSubmit = async (answerToCheck?: string) => {
    const answer = answerToCheck !== undefined ? answerToCheck : userTypedAnswer;
    if (!answer.trim() || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const result = await evaluateUserAnswer(
        promptText,
        targetAnswer,
        answer,
        isTermToTranslation ? currentItem.synonyms : []
      );
      setEvaluation(result);

      // Update Leitner stats
      const { box, nextReviewAt, correctStreakChange } = calculateNextReview(
        currentItem.box,
        result.corretto
      );

      const updatedItem: VocabItem = {
        ...currentItem,
        box,
        nextReviewAt,
        lastReviewedAt: Date.now(),
        correctStreak: Math.max(0, currentItem.correctStreak + correctStreakChange),
        wrongCount: result.corretto ? currentItem.wrongCount : currentItem.wrongCount + 1,
      };

      onSaveItem(updatedItem);

      if (result.corretto) {
        setCorrectCount((prev) => prev + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDontKnow = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    try {
      const { box, nextReviewAt } = calculateNextReview(currentItem.box, false);
      const updatedItem: VocabItem = {
        ...currentItem,
        box,
        nextReviewAt,
        lastReviewedAt: Date.now(),
        correctStreak: 0,
        wrongCount: currentItem.wrongCount + 1,
      };
      onSaveItem(updatedItem);

      setEvaluation({
        corretto: false,
        spiegazione: `Nessun problema! "${promptText}" significa "${targetAnswer}". Te la tengo qui buona per il prossimo ripasso.`,
      });
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
      const acornsEarned = (correctCount + (evaluation?.corretto ? 1 : 0)) * 5;
      onSessionComplete(acornsEarned);
    }
  };

  // End of Session summary
  if (isFinished) {
    const totalEarned = correctCount * 5;
    return (
      <div className="p-6 text-center max-w-md mx-auto space-y-6 pt-10 animate-fade-in">
        <Mascot pose="happy" size={150} speechBubble="Bella sessione! Abbiamo arricchito la nostra tana!" />

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#6B7C4F]/20 space-y-4">
          <h2 className="text-2xl font-bold font-display text-[#3A2B22]">Sessione Completata! 🎉</h2>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="bg-[#6B7C4F]/10 p-4 rounded-2xl">
              <div className="text-2xl font-bold font-display text-[#6B7C4F]">
                {correctCount} / {sessionPool.length}
              </div>
              <div className="text-xs text-[#3A2B22]/70 font-medium mt-1">Parole corrette</div>
            </div>

            <div className="bg-[#E8802F]/10 p-4 rounded-2xl">
              <div className="text-2xl font-bold font-display text-[#E8802F]">
                +{totalEarned} 🌰
              </div>
              <div className="text-xs text-[#3A2B22]/70 font-medium mt-1">Ghiande guadagnate</div>
            </div>
          </div>

          <p className="text-xs text-[#3A2B22]/75 leading-relaxed">
            Ogni parola ripassata ti aiuta a fissarla nella memoria a lungo termine. Ci vediamo al prossimo ripasso!
          </p>
        </div>

        <button
          onClick={onBackToHome}
          className="w-full py-4 rounded-2xl bg-[#E8802F] text-white font-bold font-display text-base shadow-md hover:bg-[#E8802F]/90 active:scale-98 transition-all"
        >
          Torna alla tana 🏠
        </button>
      </div>
    );
  }

  const isMultipleChoice = currentIndex % 3 === 1 && options.length >= 3;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-28">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between bg-white/60 p-3 px-4 rounded-2xl border border-[#6B7C4F]/20">
        <button
          onClick={onBackToHome}
          className="text-xs font-bold text-[#6B7C4F] font-display flex items-center gap-1 hover:underline cursor-pointer"
        >
          ← Esci
        </button>

        <div className="flex-1 max-w-xs mx-3 bg-gray-200 h-3 rounded-full overflow-hidden border border-gray-300">
          <div
            className="bg-[#6B7C4F] h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / sessionPool.length) * 100}%` }}
          />
        </div>

        <button
          onClick={() => setShowTanaManager(true)}
          className="text-xs font-bold text-[#3A2B22] bg-[#FAF5EB] hover:bg-[#F2E8D5] px-2.5 py-1.5 rounded-xl border border-[#3A2B22]/15 font-display transition-all cursor-pointer flex items-center gap-1"
        >
          <span>📚 Tana ({vocabItems.length})</span>
        </button>
      </div>

      {/* Mascot Feedback Display */}
      <div className="flex justify-center my-2">
        {evaluation ? (
          <Mascot
            pose={evaluation.corretto ? 'happy' : 'digging'}
            size={130}
            speechBubble={evaluation.spiegazione}
          />
        ) : (
          <Mascot
            pose="thinking"
            size={110}
            speechBubble={
              isTermToTranslation
                ? `Come si dice "${promptText}" in italiano?`
                : `Come si dice "${promptText}" in inglese?`
            }
          />
        )}
      </div>

      {/* Term Bento Card */}
      <div className="bento-card text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span className="badge-leaf bg-[#C99A3D]">
            Box Leitner {currentItem.box}
          </span>
          <span className="text-[11px] font-bold text-[#6B7C4F] bg-[#6B7C4F]/10 px-2 py-0.5 rounded-full font-display uppercase">
            {isTermToTranslation ? 'EN ➔ IT' : 'IT ➔ EN'}
          </span>
        </div>
        <h3 className="text-3xl font-bold font-display text-[#3A2B22]">
          {promptText}
        </h3>
        {currentItem.usageNote && (
          <p className="text-xs text-[#C99A3D] font-semibold bg-[#FAF5EB] p-2 rounded-xl border border-[#C99A3D]/20">
            💡 Nota d'uso: {currentItem.usageNote}
          </p>
        )}
        {exampleText && (
          <p className="text-xs text-[#3A2B22]/75 italic border-t border-[#6B7C4F]/10 pt-3 mt-3">
            "{exampleText}"
          </p>
        )}
      </div>

      {/* Answer Inputs or Evaluation Screen */}
      {!evaluation ? (
        <div className="space-y-4">
          {isMultipleChoice ? (
            /* Multiple Choice options */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedOption(opt);
                    handleSubmit(opt);
                  }}
                  disabled={isEvaluating}
                  className={`p-4 rounded-2xl text-left font-bold font-display text-sm border-2 transition-all flex items-center justify-between cursor-pointer ${
                    selectedOption === opt
                      ? 'bg-[#6B7C4F]/10 border-[#6B7C4F] text-[#3A2B22]'
                      : 'bg-white border-[#6B7C4F]/20 hover:border-[#6B7C4F] text-[#3A2B22]'
                  }`}
                >
                  <span>{opt}</span>
                  <span className="text-xs text-[#6B7C4F]">Scegli</span>
                </button>
              ))}
            </div>
          ) : (
            /* Free Typed Answer */
            <div className="space-y-3">
              <input
                type="text"
                value={userTypedAnswer}
                onChange={(e) => setUserTypedAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Scrivi qui la traduzione..."
                disabled={isEvaluating}
                autoFocus
                className="w-full p-4 rounded-2xl bg-white border-2 border-[#6B7C4F]/30 focus:border-[#E8802F] focus:outline-none text-base text-[#3A2B22] font-medium shadow-xs transition-all"
              />

              <button
                onClick={() => handleSubmit()}
                disabled={!userTypedAnswer.trim() || isEvaluating}
                className="btn-zucca w-full py-4 text-base disabled:opacity-50"
              >
                {isEvaluating ? 'Verifico...' : 'Conferma risposta ⚡'}
              </button>
            </div>
          )}

          {/* Always Available "Non lo so" button */}
          <button
            onClick={handleDontKnow}
            disabled={isEvaluating}
            className="w-full py-3 rounded-2xl bg-white/70 border border-[#3A2B22]/20 text-[#3A2B22]/75 font-bold text-xs hover:bg-white transition-all text-center cursor-pointer font-display"
          >
            🤔 Non lo so / spiegamelo
          </button>
        </div>
      ) : (
        /* Immediate Feedback Action Card */
        <div className="bento-card text-center space-y-4">
          <div className="flex items-center justify-center gap-2 font-bold font-display text-lg">
            <span>{evaluation.corretto ? '✨ Risposta Corretta!' : '💡 Da Rivedere Insieme'}</span>
          </div>

          <button
            onClick={handleNextItem}
            className="btn-zucca w-full py-4 text-base"
          >
            Continua →
          </button>
        </div>
      )}

      {/* Tana Manager Overlay */}
      {showTanaManager && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <TanaManager
              vocabItems={vocabItems}
              onDeleteItem={onDeleteItem}
              onClose={() => setShowTanaManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
