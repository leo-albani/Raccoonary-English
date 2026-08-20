import React, { useState, useEffect } from 'react';
import { Mascot } from '../mascot/Mascot';
import { CEFRLevel, LevelTestQuestion, LevelTestResult, UserProfile, VocabItem, ExerciseError } from '../types';
import { generateLevelTest } from '../services/gemini';
import { fetchLevelTests, saveLevelTestResult, resetLessonPath } from '../services/firebase';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';
import { playSound } from '../services/sound';

interface LevelTestProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSaveErrorVocab?: (item: VocabItem) => void;
  onSaveExerciseError?: (item: ExerciseError) => void;
  onBack: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const LevelTest: React.FC<LevelTestProps> = ({
  userProfile,
  onUpdateProfile,
  onSaveErrorVocab,
  onSaveExerciseError,
  onBack,
}) => {
  const [questionsByLevel, setQuestionsByLevel] = useState<Record<CEFRLevel, LevelTestQuestion[]>>({
    A1: [],
    A2: [],
    B1: [],
    B2: [],
    C1: [],
    C2: [],
  });
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [currentQuestionInLevel, setCurrentQuestionInLevel] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const targetLang = userProfile.activeProfileId || 'en';
  const nativeLang = userProfile.nativeLanguage || 'it';
  const targetInfo = TARGET_LANGUAGES.find((l) => l.code === targetLang);
  const nativeInfo = NATIVE_LANGUAGES.find((l) => l.code === nativeLang);
  const targetName = targetInfo ? targetInfo.name : targetLang.toUpperCase();
  const nativeName = nativeInfo ? nativeInfo.name : nativeLang.toUpperCase();

  // Results state
  const [testResult, setTestResult] = useState<LevelTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<LevelTestResult[]>(() => {
    try {
      const saved = localStorage.getItem(`raccoonary_level_test_history_${targetLang}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const loadNewTest = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setTestResult(null);
    setUserAnswers({});
    setCurrentLevelIndex(0);
    setCurrentQuestionInLevel(0);

    try {
      const generated = await generateLevelTest(targetLang, nativeLang, targetName, nativeName);
      if (!generated || generated.length === 0) {
        throw new Error('Nessuna domanda ricevuta');
      }

      const grouped: Record<CEFRLevel, LevelTestQuestion[]> = {
        A1: [],
        A2: [],
        B1: [],
        B2: [],
        C1: [],
        C2: [],
      };

      generated.forEach((q) => {
        const lvl = (q.level || 'A1') as CEFRLevel;
        if (grouped[lvl]) {
          grouped[lvl].push(q);
        }
      });

      setQuestionsByLevel(grouped);
    } catch (err: any) {
      console.error('Error starting level test:', err);
      setErrorMsg('Impossibile caricare le domande del test al momento. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNewTest();
    if (userProfile.userId) {
      fetchLevelTests(userProfile.userId, userProfile.activeProfileId).then((history) => {
        if (history && history.length > 0) {
          setTestHistory(history);
        }
      });
    }
  }, [userProfile.userId, userProfile.activeProfileId]);

  const finishTest = (lastLevelIndex: number, lastLevelPassed: boolean, latestAnswers: Record<string, string>) => {
    const breakdown: Record<CEFRLevel, { correct: number; total: number; percent: number; passed: boolean }> = {
      A1: { correct: 0, total: 0, percent: 0, passed: false },
      A2: { correct: 0, total: 0, percent: 0, passed: false },
      B1: { correct: 0, total: 0, percent: 0, passed: false },
      B2: { correct: 0, total: 0, percent: 0, passed: false },
      C1: { correct: 0, total: 0, percent: 0, passed: false },
      C2: { correct: 0, total: 0, percent: 0, passed: false },
    };

    let totalCorrect = 0;
    let totalAdministered = 0;

    for (let i = 0; i <= lastLevelIndex; i++) {
      const lvl = CEFR_LEVELS[i];
      const lvlQuestions = questionsByLevel[lvl] || [];
      let lvlCorrect = 0;

      lvlQuestions.forEach((q, idx) => {
        const userAns = (latestAnswers[q.id] || '').trim().toLowerCase();
        const correctAns = (q.rispostaCorretta || '').trim().toLowerCase();
        const isCorrect = userAns === correctAns;

        totalAdministered += 1;
        if (isCorrect) {
          lvlCorrect += 1;
          totalCorrect += 1;
        } else {
          if (onSaveExerciseError) {
            const errorItem: ExerciseError = {
              id: `level_test_${Date.now()}_${lvl}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
              domanda: q.domanda,
              rispostaCorretta: q.rispostaCorretta,
              tipo: 'test_livello',
              argomentoRiferimento: `Test di Livello (${q.level})`,
              createdAt: Date.now(),
              box: 1,
              nextReviewAt: Date.now(),
              wrongCount: 1,
              lastReviewedAt: null,
              correctStreak: 0,
              spiegazione: q.testo_contesto ? `Contesto: ${q.testo_contesto}` : undefined,
              opzioni: q.opzioni,
            };
            onSaveExerciseError(errorItem);
          } else if (onSaveErrorVocab) {
            const errorVocab: VocabItem = {
              id: `level_test_${Date.now()}_${lvl}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
              term: q.domanda,
              translation: q.rispostaCorretta,
              sourceLang: targetLang,
              targetLang: nativeLang,
              synonyms: [],
              exampleSource: q.testo_contesto || q.domanda,
              exampleTranslation: `Risposta corretta del test: ${q.rispostaCorretta}`,
              origin: 'level_test_error',
              originDetail: `Livello ${q.level}`,
              createdAt: Date.now(),
              lastReviewedAt: null,
              box: 1,
              nextReviewAt: Date.now(),
              correctStreak: 0,
              wrongCount: 1,
            };
            onSaveErrorVocab(errorVocab);
          }
        }
      });

      const isPassed = i < lastLevelIndex ? true : lastLevelPassed;
      breakdown[lvl] = {
        correct: lvlCorrect,
        total: lvlQuestions.length,
        percent: lvlQuestions.length > 0 ? Math.round((lvlCorrect / lvlQuestions.length) * 100) : 0,
        passed: isPassed,
      };
    }

    let estimatedLevel: CEFRLevel | 'Sotto A1' = 'Sotto A1';
    for (const lvl of CEFR_LEVELS) {
      if (breakdown[lvl]?.passed) {
        estimatedLevel = lvl;
      } else {
        break;
      }
    }

    const newResult: LevelTestResult = {
      id: `test_${Date.now()}`,
      takenAt: Date.now(),
      resultLevel: estimatedLevel,
      totalCorrect,
      totalQuestions: totalAdministered,
      levelBreakdown: breakdown,
    };

    setTestResult(newResult);
    playSound('levelAchieved');

    const updatedHistory = [newResult, ...testHistory];
    setTestHistory(updatedHistory);
    if (userProfile.userId) {
      saveLevelTestResult(userProfile.userId, newResult, userProfile.activeProfileId);
      resetLessonPath(userProfile.userId, userProfile.activeProfileId || targetLang).catch(console.warn);
    } else {
      try {
        localStorage.setItem(`raccoonary_level_test_history_${targetLang}`, JSON.stringify(updatedHistory));
        resetLessonPath('local_user_test', targetLang).catch(console.warn);
      } catch (e) {
        console.error(e);
      }
    }

    onUpdateProfile({
      currentLevel: estimatedLevel,
      lastTestDate: Date.now(),
    });
  };

  const handleNextQuestion = () => {
    const currentLevel = CEFR_LEVELS[currentLevelIndex];
    const currentLevelQuestions = questionsByLevel[currentLevel] || [];

    if (currentQuestionInLevel < currentLevelQuestions.length - 1) {
      setCurrentQuestionInLevel((prev) => prev + 1);
    } else {
      let blockCorrect = 0;
      currentLevelQuestions.forEach((q) => {
        const userAns = (userAnswers[q.id] || '').trim().toLowerCase();
        const correctAns = (q.rispostaCorretta || '').trim().toLowerCase();
        if (userAns === correctAns) {
          blockCorrect += 1;
        }
      });

      const totalInBlock = currentLevelQuestions.length;
      const blockPercent = totalInBlock > 0 ? (blockCorrect / totalInBlock) * 100 : 0;

      // 1. Solid pass (>= 70%) to proceed to the next difficulty level
      const canProceedToNext = blockPercent >= 70;

      // 2. Pass/credit current level (>= 50%) as achieved outcome
      const isCurrentLevelPassed = blockPercent >= 50;

      if (canProceedToNext && currentLevelIndex < CEFR_LEVELS.length - 1) {
        playSound('correct');
        setCurrentLevelIndex((prev) => prev + 1);
        setCurrentQuestionInLevel(0);
      } else {
        finishTest(currentLevelIndex, isCurrentLevelPassed, userAnswers);
      }
    }
  };

  const currentLevel = CEFR_LEVELS[currentLevelIndex];
  const currentLevelQuestions = questionsByLevel[currentLevel] || [];
  const currentQ = currentLevelQuestions[currentQuestionInLevel];
  const currentAnswer = currentQ ? (userAnswers[currentQ.id] || '') : '';

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-8 pb-28 select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs sm:text-sm font-extrabold text-[#6B7C4F] font-display hover:underline cursor-pointer flex items-center gap-1.5"
        >
          ← Chiudi Test
        </button>
        <span className="badge-leaf">Test di Livello Adattivo</span>
      </header>

      {isLoading ? (
        <div className="bento-card text-center py-16 space-y-6">
          <Mascot pose="thinking" size={150} speechBubble="Sto preparando il tuo test di livello personalizzato..." />
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-[#F2E8D5] font-display">
              Generazione domande in corso
            </h3>
            <p className="text-xs sm:text-sm font-medium text-[#F2E8D5]/70 max-w-sm mx-auto">
              Difficoltà progressiva da A1 a C2 per individuare esattamente dove ti trovi.
            </p>
          </div>
        </div>
      ) : errorMsg ? (
        <div className="bento-card text-center py-12 space-y-6">
          <Mascot pose="digging" size={130} speechBubble="Oops! Qualcosa non è andato." />
          <div className="space-y-2">
            <p className="text-base font-extrabold text-red-400 font-display">{errorMsg}</p>
          </div>
          <button type="button" onClick={loadNewTest} className="btn-zucca py-3 px-8 text-sm">
            Riprova 🔄
          </button>
        </div>
      ) : testResult ? (
        /* IMMERSIVE CELEBRATIVE RESULTS SCREEN */
        <div className="space-y-8 animate-fade-in text-center">
          {/* Main Hero Card with Rocky protagonist */}
          <div className="bento-card p-6 sm:p-8 space-y-6 border-2 border-[#6B7C4F]/40 bg-[#2B2622]">
            <div className="relative">
              <Mascot
                pose={testResult.resultLevel === 'Sotto A1' ? 'greeting' : 'happy'}
                size={160}
                speechBubble={
                  testResult.resultLevel === 'Sotto A1'
                    ? 'Ottimo inizio! Con il nostro percorso saliremo di livello in un lampo! 🦝'
                    : `Fantastico traguardo! Il tuo livello stimato è ${testResult.resultLevel}! 🎉`
                }
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#859966] font-display">
                Esito Test di Livello Adattivo
              </span>
              
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl sm:text-5xl font-black text-[#E8802F] font-display">
                  {testResult.resultLevel}
                </span>
              </div>

              <p className="text-sm font-bold text-[#F2E8D5]/90 font-display">
                {testResult.totalCorrect} risposte corrette su {testResult.totalQuestions} ({testResult.totalQuestions > 0 ? Math.round((testResult.totalCorrect / testResult.totalQuestions) * 100) : 0}%)
              </p>
            </div>

            {/* Level breakdown cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-left">
              {CEFR_LEVELS.map((lvl) => {
                const b = testResult.levelBreakdown[lvl];
                const wasAdministered = b && b.total > 0;
                return (
                  <div
                    key={lvl}
                    className={`p-4 rounded-2xl border-2 space-y-2 transition-all ${
                      !wasAdministered
                        ? 'bg-[#1A1512]/40 border-dashed border-[#6B7C4F]/20 opacity-50'
                        : b.passed
                        ? 'bg-[#1A1512] border-[#6B7C4F] shadow-2xs'
                        : 'bg-[#1A1512] border-amber-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold font-display text-base text-[#F2E8D5]">
                        {lvl}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          !wasAdministered
                            ? 'bg-[#2B2622] text-gray-400'
                            : b.passed
                            ? 'bg-[#6B7C4F] text-[#1A1512]'
                            : 'bg-amber-500 text-[#1A1512]'
                        }`}
                      >
                        {!wasAdministered ? 'Non affrontato' : b.passed ? '✓ Superato' : 'Da rivedere'}
                      </span>
                    </div>

                    {/* Progress track */}
                    {wasAdministered && (
                      <div className="progress-track h-2.5">
                        <div
                          className={`progress-fill ${b.passed ? 'progress-fill-muschio' : 'progress-fill-ocra'}`}
                          style={{ width: `${b.percent}%` }}
                        />
                      </div>
                    )}

                    <p className="text-[11px] font-bold text-[#F2E8D5]/75">
                      {!wasAdministered
                        ? 'Interrotto prima'
                        : `${b.correct}/${b.total} corrette (${b.percent}%)`}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  const chosenLevel: CEFRLevel =
                    testResult.resultLevel === 'Sotto A1' ? 'A1' : (testResult.resultLevel as CEFRLevel);
                  onUpdateProfile({
                    livelloStudioAttivo: chosenLevel,
                    currentLevel: testResult.resultLevel,
                    lastTestDate: testResult.takenAt,
                  });
                  onBack();
                }}
                className="btn-zucca flex-1 py-4 text-base cursor-pointer shadow-md"
              >
                Imposta piano di studi su {testResult.resultLevel === 'Sotto A1' ? 'A1' : testResult.resultLevel} 🎯
              </button>
              <button
                type="button"
                onClick={loadNewTest}
                className="btn-secondary flex-1 py-3.5 text-sm cursor-pointer"
              >
                Rifai il test con nuove domande 🔄
              </button>
            </div>
          </div>

          {/* Test History List */}
          {testHistory.length > 1 && (
            <div className="bento-card space-y-3 text-left">
              <h3 className="font-extrabold font-display text-base text-[#F2E8D5]">Storico dei tuoi test</h3>
              <div className="space-y-2">
                {testHistory.slice(1).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 bg-[#1A1512] rounded-2xl border border-[#6B7C4F]/30 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#F2E8D5] font-display text-sm">
                        Livello {item.resultLevel}
                      </span>
                      <span className="text-[#F2E8D5]/70 ml-2 font-semibold">
                        ({item.totalCorrect}/{item.totalQuestions} corrette)
                      </span>
                    </div>
                    <span className="text-[#E8802F] font-bold">
                      {new Date(item.takenAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : currentQ ? (
        /* ACTIVE QUESTION FLOW */
        <div className="space-y-6">
          {/* Header Level & Progress Bar */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs font-extrabold font-display text-[#F2E8D5]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black px-3 py-0.5 rounded-full bg-[#E8802F] text-[#1A1512]">
                  Livello {currentLevel}
                </span>
                <span>
                  Domanda {currentQuestionInLevel + 1} di {currentLevelQuestions.length || 6}
                </span>
              </div>
              <span className="text-[#E8802F]">
                {Math.round(((currentQuestionInLevel + 1) / (currentLevelQuestions.length || 6)) * 100)}%
              </span>
            </div>

            {/* Thick Progress Track */}
            <div className="progress-track h-3.5">
              <div
                className="progress-fill progress-fill-muschio"
                style={{
                  width: `${((currentQuestionInLevel + 1) / (currentLevelQuestions.length || 6)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Reading Context if applicable */}
          {currentQ.testo_contesto && (
            <div className="bento-card bg-[#1A1512] space-y-2 border-l-6 border-[#6B7C4F]">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#859966] font-display">
                📖 Leggi il brano seguente:
              </span>
              <p className="text-xs sm:text-sm text-[#F2E8D5] leading-relaxed font-medium italic">
                "{currentQ.testo_contesto}"
              </p>
            </div>
          )}

          {/* Question Card */}
          <div className="bento-card p-6 sm:p-7 space-y-6">
            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-[#F2E8D5] leading-tight">
              {currentQ.domanda}
            </h2>

            {/* Answer Input Options */}
            {currentQ.tipo === 'multiple_choice' || currentQ.tipo === 'reading_comprehension' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(currentQ.opzioni || []).map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => setUserAnswers((prev) => ({ ...prev, [currentQ.id]: opt }))}
                    className={`p-4 sm:p-5 rounded-2xl text-left text-xs sm:text-sm font-extrabold font-display border-2 transition-all cursor-pointer ${
                      currentAnswer === opt
                        ? 'bg-[#E8802F] border-[#E8802F] ring-4 ring-[#E8802F]/30 text-[#1A1512] shadow-sm'
                        : 'bg-[#1A1512] border-[#6B7C4F]/30 hover:border-[#E8802F] text-[#F2E8D5]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={currentAnswer}
                  onChange={(e) => setUserAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                  placeholder="Scrivi la tua risposta qui..."
                  className="w-full p-4 rounded-2xl bg-[#1A1512] border-2 border-[#6B7C4F]/40 focus:border-[#E8802F] focus:outline-none text-base text-[#F2E8D5] font-bold"
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={!currentAnswer.trim()}
                className="btn-zucca w-full py-4 text-base disabled:opacity-50 cursor-pointer"
              >
                {currentQuestionInLevel < currentLevelQuestions.length - 1
                  ? 'Prossima Domanda →'
                  : currentLevelIndex < CEFR_LEVELS.length - 1
                  ? 'Verifica Livello e Continua →'
                  : 'Concludi Test e Calcola Livello 🎯'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
