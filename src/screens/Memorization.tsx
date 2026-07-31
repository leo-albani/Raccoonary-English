import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { VocabItem, AnswerEvaluationResult } from '../types';
import { evaluateUserAnswer } from '../services/gemini';
import { calculateNextReview, filterDueItems } from '../services/leitner';

interface MemorizationProps {
  vocabItems: VocabItem[];
  onSaveItem: (item: VocabItem) => void;
  onSessionComplete: (acornsEarned: number) => void;
  onBackToHome: () => void;
}

export const Memorization: React.FC<MemorizationProps> = ({
  vocabItems,
  onSaveItem,
  onSessionComplete,
  onBackToHome,
}) => {
  const sessionPool = filterDueItems(vocabItems, 20);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userTypedAnswer, setUserTypedAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluationResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (sessionPool.length === 0) {
    return (
      <div className="p-6 text-center max-w-2xl mx-auto space-y-6 pt-12">
        <Mascot pose="happy" size={140} speechBubble="Non ci sono parole in scadenza per il ripasso oggi! Ottimo lavoro!" />
        <div className="bento-card space-y-4">
          <span className="badge-leaf">Tana in Ordine</span>
          <h2 className="text-2xl font-bold font-display text-[#3A2B22]">Nessun ripasso in sospeso</h2>
          <p className="text-sm text-[#3A2B22]/75">
            Hai completato tutti i ripassi previsti per oggi. Torna domani o importa nuove parole per continuare!
          </p>
          <div className="pt-2">
            <button
              onClick={onBackToHome}
              className="btn-zucca w-full py-4 text-base"
            >
              Torna alla tana 🏠
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = sessionPool[currentIndex];

  // Prepare multiple choice options if applicable
  const otherItems = vocabItems.filter((i) => i.id !== currentItem.id);
  const distractor1 = otherItems[0]?.translation || 'gatto';
  const distractor2 = otherItems[1]?.translation || 'albero';
  const distractor3 = otherItems[2]?.translation || 'casa';
  const rawOptions = [currentItem.translation, distractor1, distractor2, distractor3];
  // Stable pseudo-random shuffle per item index
  const options = React.useMemo(() => {
    return [...rawOptions].sort((a, b) => a.length - b.length || a.localeCompare(b));
  }, [currentItem.id]);

  const handleSubmit = async (answerToCheck?: string) => {
    const answer = answerToCheck !== undefined ? answerToCheck : userTypedAnswer;
    if (!answer.trim() || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const result = await evaluateUserAnswer(
        currentItem.term,
        currentItem.translation,
        answer,
        currentItem.synonyms
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
        spiegazione: `Nessun problema! "${currentItem.term}" significa "${currentItem.translation}". Te la tengo qui buona per il prossimo ripasso.`,
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

        <span className="text-xs font-bold text-[#3A2B22]/70 font-display">
          {currentIndex + 1} / {sessionPool.length}
        </span>
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
            speechBubble={`Come si dice "${currentItem.term}" in italiano?`}
          />
        )}
      </div>

      {/* Term Bento Card */}
      <div className="bento-card text-center space-y-3">
        <div>
          <span className="badge-leaf bg-[#C99A3D]">
            Box Leitner {currentItem.box}
          </span>
        </div>
        <h3 className="text-3xl font-bold font-display text-[#3A2B22]">
          {currentItem.term}
        </h3>
        {currentItem.exampleSource && (
          <p className="text-xs text-[#3A2B22]/75 italic border-t border-[#6B7C4F]/10 pt-3 mt-3">
            "{currentItem.exampleSource}"
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
    </div>
  );
};
