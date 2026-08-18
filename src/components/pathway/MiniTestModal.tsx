import React, { useState, useEffect } from 'react';
import { X, Trophy, Sparkles, Target, RotateCcw } from 'lucide-react';
import { Mascot } from '../../mascot/Mascot';
import { UserProfile, CheckpointQuestion, ExerciseError } from '../../types';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../../data/languages';
import { generateMiniTestQuestions } from '../../services/gemini';
import { playSound } from '../../services/sound';

interface MiniTestModalProps {
  currentLevel: string;
  nextLevel: string;
  user: UserProfile;
  onComplete: (passed: boolean, score: number) => void;
  onClose: () => void;
  onOpenRealLevelTest: () => void;
  onReinforce: () => void;
  onSaveExerciseError?: (item: ExerciseError) => void;
}

export const MiniTestModal: React.FC<MiniTestModalProps> = ({
  currentLevel,
  nextLevel,
  user,
  onComplete,
  onClose,
  onOpenRealLevelTest,
  onReinforce,
  onSaveExerciseError,
}) => {
  const targetLang = user.activeProfileId || 'en';
  const nativeLang = user.nativeLanguage || 'it';
  const targetName = TARGET_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang.toUpperCase();
  const nativeName = NATIVE_LANGUAGES.find((l) => l.code === nativeLang)?.name || nativeLang.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<CheckpointQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadQuestions() {
      setLoading(true);
      try {
        const list = await generateMiniTestQuestions(
          currentLevel,
          nextLevel,
          targetLang,
          nativeLang,
          targetName,
          nativeName
        );
        if (isMounted) {
          setQuestions(list.slice(0, 10));
        }
      } catch (e) {
        console.error('Error fetching mini test:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [currentLevel, nextLevel, targetLang, nativeLang]);

  const currentQ = questions[currentIdx];
  const totalQ = questions.length || 10;

  const handleSelectOption = (opt: string) => {
    if (isChecked) return;
    setSelectedOption(opt);
  };

  const handleVerify = () => {
    if (!selectedOption || !currentQ || isChecked) return;
    const isCorrect = selectedOption.trim().toLowerCase() === currentQ.rispostaCorretta.trim().toLowerCase();
    if (isCorrect) {
      playSound('correct');
      setScore((prev) => prev + 1);
    } else {
      playSound('review');
      if (onSaveExerciseError) {
        onSaveExerciseError({
          id: `minitest_err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          domanda: currentQ.domanda,
          rispostaCorretta: currentQ.rispostaCorretta,
          tipo: 'test_livello',
          argomentoRiferimento: `Mini-Test: ${currentQ.argomento || `${currentLevel} → ${nextLevel}`}`,
          createdAt: Date.now(),
          box: 1,
          nextReviewAt: Date.now(),
          wrongCount: 1,
          lastReviewedAt: null,
          correctStreak: 0,
          spiegazione: currentQ.spiegazione,
          opzioni: currentQ.opzioni,
        });
      }
    }
    setIsChecked(true);
  };

  const handleNext = () => {
    setIsChecked(false);
    setSelectedOption(null);
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      const finalScore = score;
      const passed = finalScore >= 6;
      if (passed) {
        playSound('levelAchieved');
      } else {
        playSound('sessionComplete');
      }
      setIsFinished(true);
      onComplete(passed, finalScore);
    }
  };

  const isPassed = score >= 6;

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-[#2B2622] text-[#F2E8D5] border-2 border-[#E8802F]/40 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#6B7C4F]/25 flex items-center justify-between bg-[#1A1512]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#E8802F] text-[#1A1512] flex items-center justify-center font-black font-display text-sm">
              🎯
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E8802F] font-display">
                  Mini-Test Salto di Livello
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#6B7C4F]/30 text-[#859966] text-[10px] font-black">
                  Verso {nextLevel}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold font-display text-[#F2E8D5]">
                Anteprima Livello {nextLevel} (10 Domande)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1A1512] border border-[#6B7C4F]/30 text-[#F2E8D5]/70 hover:text-[#F2E8D5] hover:border-[#E8802F] flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="py-12 text-center space-y-4">
              <Mascot pose="thinking" size={120} speechBubble={`Preparo 10 domande per testare il livello ${nextLevel}...`} />
              <p className="text-sm font-extrabold font-display text-[#F2E8D5]">Generazione Mini-Test in corso...</p>
            </div>
          ) : isFinished ? (
            /* Result Screen */
            <div className="py-6 text-center space-y-6 animate-fade-in">
              <Mascot
                pose={isPassed ? 'happy' : 'reading'}
                size={140}
                speechBubble={
                  isPassed
                    ? `Eccellente! Hai superato il mini-test per il livello ${nextLevel}! 🎉`
                    : `Bel tentativo! Ti consiglio ancora un po' di pratica con il livello ${currentLevel}.`
                }
              />

              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#859966] font-display">
                  Esito Mini-Test
                </span>
                <h2 className="text-2xl sm:text-3xl font-black font-display text-[#F2E8D5]">
                  {score} / {totalQ} Corrette ({Math.round((score / totalQ) * 100)}%)
                </h2>
                <p className="text-xs sm:text-sm font-medium text-[#F2E8D5]/75 max-w-sm mx-auto">
                  {isPassed
                    ? `Hai dimostrato un'ottima padronanza! Ti consiglio vivamente di fare il Test di Livello completo per ufficializzare il passaggio a ${nextLevel}.`
                    : `Il livello ${nextLevel} richiede ancora qualche piccolo passo. Puoi rinforzare le tue conoscenze con un nuovo percorso guidato.`}
                </p>
              </div>

              {isPassed ? (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRealLevelTest();
                    }}
                    className="btn-zucca w-full py-4 text-sm font-black shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    <span>Fai il Test di Livello Ufficiale 🎯</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary w-full py-3 text-xs font-bold"
                  >
                    Torna al Sentiero
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onReinforce();
                    }}
                    className="btn-zucca w-full py-4 text-sm font-black shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Rinforza (Nuovo Percorso Livello {currentLevel}) 🔄</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary w-full py-3 text-xs font-bold"
                  >
                    Chiudi
                  </button>
                </div>
              )}
            </div>
          ) : currentQ ? (
            /* Quiz Questions */
            <div className="space-y-5 animate-fade-in">
              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-[#859966] font-display">
                  <span>Domanda {currentIdx + 1} di {totalQ}</span>
                  <span className="capitalize">Livello {nextLevel}</span>
                </div>
                <div className="progress-track h-2 bg-[#1A1512] border border-[#6B7C4F]/25">
                  <div
                    className="progress-fill progress-fill-zucca"
                    style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-[#1A1512] p-5 rounded-3xl border border-[#6B7C4F]/30 space-y-2 shadow-md">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#859966] font-display">
                  Argomento: {currentQ.argomento || 'Mini-Test'}
                </span>
                <h3 className="text-base sm:text-lg font-bold font-display text-[#F2E8D5] leading-relaxed">
                  {currentQ.domanda}
                </h3>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2.5">
                {currentQ.opzioni.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  const isCorrectOpt = opt.trim().toLowerCase() === currentQ.rispostaCorretta.trim().toLowerCase();
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isChecked}
                      onClick={() => handleSelectOption(opt)}
                      className={`p-4 rounded-2xl border-2 font-display text-sm font-bold text-left transition-all cursor-pointer ${
                        isChecked
                          ? isCorrectOpt
                            ? 'bg-[#6B7C4F]/30 border-[#6B7C4F] text-[#859966]'
                            : isSelected
                            ? 'bg-red-950/40 border-red-500 text-red-300'
                            : 'bg-[#1A1512] border-white/5 opacity-40'
                          : isSelected
                          ? 'bg-[#E8802F]/20 border-[#E8802F] text-[#E8802F]'
                          : 'bg-[#1A1512] border-[#6B7C4F]/20 hover:border-[#6B7C4F] text-[#F2E8D5]'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Action / Feedback */}
              {!isChecked ? (
                <button
                  type="button"
                  disabled={!selectedOption}
                  onClick={handleVerify}
                  className="btn-zucca w-full py-3.5 text-xs font-black shadow-lg cursor-pointer disabled:opacity-40"
                >
                  Verifica risposta
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/30 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F2E8D5]">
                      {selectedOption?.trim().toLowerCase() === currentQ.rispostaCorretta.trim().toLowerCase()
                        ? '✅ Risposta Esatta!'
                        : '💡 Spiegazione:'}
                    </span>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn-zucca py-1.5 px-4 text-xs font-black"
                    >
                      {currentIdx + 1 < totalQ ? 'Prossima →' : 'Vedi Risultato 🏁'}
                    </button>
                  </div>
                  <p className="text-xs text-[#F2E8D5]/70 font-medium">
                    {currentQ.spiegazione || `La risposta corretta è "${currentQ.rispostaCorretta}".`}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
