import React, { useState, useEffect } from 'react';
import { Mascot } from '../mascot/Mascot';
import { CEFRLevel, LevelTestQuestion, LevelTestResult, UserProfile, VocabItem } from '../types';
import { generateLevelTest } from '../services/gemini';
import { fetchLevelTests, saveLevelTestResult } from '../services/firebase';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';
import { playSound } from '../services/sound';

interface LevelTestProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSaveErrorVocab: (item: VocabItem) => void;
  onBack: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const LevelTest: React.FC<LevelTestProps> = ({
  userProfile,
  onUpdateProfile,
  onSaveErrorVocab,
  onBack,
  t,
}) => {
  const [questions, setQuestions] = useState<LevelTestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
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
    setCurrentIndex(0);

    try {
      const generated = await generateLevelTest(targetLang, nativeLang, targetName, nativeName);
      if (!generated || generated.length === 0) {
        throw new Error('Nessuna domanda ricevuta');
      }
      setQuestions(generated);
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

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    let totalCorrect = 0;
    const breakdown: Record<CEFRLevel, { correct: number; total: number; percent: number; passed: boolean }> = {
      A1: { correct: 0, total: 0, percent: 0, passed: false },
      A2: { correct: 0, total: 0, percent: 0, passed: false },
      B1: { correct: 0, total: 0, percent: 0, passed: false },
      B2: { correct: 0, total: 0, percent: 0, passed: false },
      C1: { correct: 0, total: 0, percent: 0, passed: false },
      C2: { correct: 0, total: 0, percent: 0, passed: false },
    };

    questions.forEach((q, idx) => {
      const userAns = (userAnswers[idx] || '').trim().toLowerCase();
      const correctAns = (q.rispostaCorretta || '').trim().toLowerCase();
      const isCorrect = userAns === correctAns;

      const lvl = q.level as CEFRLevel;
      if (breakdown[lvl]) {
        breakdown[lvl].total += 1;
        if (isCorrect) {
          breakdown[lvl].correct += 1;
          totalCorrect += 1;
        }
      }

      // Automatically add wrong test answers to vocabulary tana
      if (!isCorrect) {
        const errorVocab: VocabItem = {
          id: `level_test_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
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
    });

    // Compute percentages & passed per level
    CEFR_LEVELS.forEach((lvl) => {
      const b = breakdown[lvl];
      b.percent = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
      b.passed = b.percent >= 60;
    });

    // Determinist Algorithm for final level:
    // Start from A1: if >=60%, level reached, pass to next. Stop at first level < 60%.
    let estimatedLevel: CEFRLevel | 'Sotto A1' = 'Sotto A1';
    let passedAll = true;

    for (const lvl of CEFR_LEVELS) {
      if (breakdown[lvl].passed) {
        estimatedLevel = lvl;
      } else {
        passedAll = false;
        break;
      }
    }

    if (passedAll) {
      estimatedLevel = 'C2';
    }

    const newResult: LevelTestResult = {
      id: `test_${Date.now()}`,
      takenAt: Date.now(),
      resultLevel: estimatedLevel,
      totalCorrect,
      totalQuestions: questions.length,
      levelBreakdown: breakdown,
    };

    setTestResult(newResult);
    playSound('levelAchieved');

    // Save to history
    const updatedHistory = [newResult, ...testHistory];
    setTestHistory(updatedHistory);
    if (userProfile.userId) {
      saveLevelTestResult(userProfile.userId, newResult, userProfile.activeProfileId);
    } else {
      try {
        localStorage.setItem('raccoonary_level_test_history', JSON.stringify(updatedHistory));
      } catch (e) {
        console.error(e);
      }
    }

    // Update user profile
    onUpdateProfile({
      currentLevel: estimatedLevel,
      lastTestDate: Date.now(),
    });
  };

  const currentQ = questions[currentIndex];
  const currentAnswer = userAnswers[currentIndex] || '';

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-bold text-[#6B7C4F] font-display hover:underline cursor-pointer flex items-center gap-1"
        >
          ← Chiudi Test
        </button>
        <span className="badge-leaf">Test di Livello CEFR</span>
      </div>

      {isLoading ? (
        <div className="bento-card text-center py-12 space-y-4">
          <Mascot pose="thinking" size={130} speechBubble="Sto preparando il tuo test di livello..." />
          <p className="text-xs font-medium text-[#3A2B22]/70">
            Generazione di 35 domande a difficoltà crescente (A1 - C2)...
          </p>
        </div>
      ) : errorMsg ? (
        <div className="bento-card text-center py-8 space-y-4">
          <Mascot pose="digging" size={100} speechBubble="Oops! Qualcosa non è andato." />
          <p className="text-sm font-bold text-red-600 font-display">{errorMsg}</p>
          <button onClick={loadNewTest} className="btn-zucca py-3 px-6 text-sm">
            Riprova 🔄
          </button>
        </div>
      ) : testResult ? (
        /* Test Results Screen */
        <div className="space-y-6 animate-fade-in">
          <div className="bento-card text-center space-y-4 border-2 border-[#6B7C4F]/40 bg-[#F2E8D5]/30">
            <Mascot
              pose={testResult.resultLevel === 'Sotto A1' ? 'greeting' : 'happy'}
              size={130}
              speechBubble={
                testResult.resultLevel === 'Sotto A1'
                  ? 'Ottimo primo passo! Lavorando insieme nella tana salirai in un baleno! 🦝'
                  : `Fantastico! Il tuo livello stimato è ${testResult.resultLevel}! 🎉`
              }
            />

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B7C4F] font-display">
                Esito Test di Livello
              </span>
              <h1 className="text-3xl font-extrabold text-[#3A2B22] font-display mt-1">
                Livello CEFR: <span className="text-[#E8802F]">{testResult.resultLevel}</span>
              </h1>
              <p className="text-xs font-semibold text-[#3A2B22]/70 mt-1">
                Risposte corrette: {testResult.totalCorrect} su {testResult.totalQuestions} ({Math.round((testResult.totalCorrect / testResult.totalQuestions) * 100)}%)
              </p>
            </div>

            {/* Level breakdown cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-left">
              {CEFR_LEVELS.map((lvl) => {
                const b = testResult.levelBreakdown[lvl];
                return (
                  <div
                    key={lvl}
                    className={`p-3 rounded-2xl border-2 space-y-1 ${
                      b?.passed
                        ? 'bg-[#6B7C4F]/10 border-[#6B7C4F]'
                        : 'bg-white border-[#6B7C4F]/15'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold font-display text-sm text-[#3A2B22]">
                        {lvl}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${b?.passed ? 'bg-[#6B7C4F] text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {b?.passed ? '✓ Raggiunto' : 'Non raggiunto'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#3A2B22]/80">
                      {b?.correct || 0} / {b?.total || 0} corrette ({b?.percent || 0}%)
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button onClick={loadNewTest} className="btn-zucca flex-1 py-3.5 text-sm">
                Rifai il Test con nuove domande 🔄
              </button>
              <button onClick={onBack} className="btn-zucca-outline flex-1 py-3.5 text-sm">
                Torna alla Home 🏠
              </button>
            </div>
          </div>

          {/* Test History */}
          {testHistory.length > 1 && (
            <div className="bento-card space-y-3">
              <h3 className="font-bold font-display text-base text-[#3A2B22]">Storico dei tuoi test</h3>
              <div className="space-y-2">
                {testHistory.slice(1).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 bg-[#F2E8D5]/40 rounded-xl border border-[#6B7C4F]/20 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#3A2B22] font-display">
                        Livello: {item.resultLevel}
                      </span>
                      <span className="text-[#3A2B22]/60 ml-2 font-medium">
                        ({item.totalCorrect}/{item.totalQuestions} corrette)
                      </span>
                    </div>
                    <span className="text-[#3A2B22]/50 font-medium">
                      {new Date(item.takenAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : currentQ ? (
        /* Active Question Flow */
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold font-display text-[#3A2B22]/70">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-[#C99A3D] text-white">
                  Livello {currentQ.level}
                </span>
                <span>Domanda {currentIndex + 1} di {questions.length}</span>
              </div>
              <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
            </div>

            <div className="w-full bg-[#6B7C4F]/15 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#6B7C4F] h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Reading text if applicable */}
          {currentQ.testo_contesto && (
            <div className="bento-card bg-[#F2E8D5]/50 space-y-2 border-l-4 border-[#6B7C4F]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7C4F] font-display">
                📖 Leggi il brano seguente:
              </span>
              <p className="text-xs sm:text-sm text-[#3A2B22] leading-relaxed font-medium italic">
                "{currentQ.testo_contesto}"
              </p>
            </div>
          )}

          {/* Question Card */}
          <div className="bento-card space-y-4">
            <h2 className="text-lg font-bold font-display text-[#3A2B22]">
              {currentQ.domanda}
            </h2>

            {/* Answer Input Options */}
            {currentQ.tipo === 'multiple_choice' || currentQ.tipo === 'reading_comprehension' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(currentQ.opzioni || []).map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => setUserAnswers((prev) => ({ ...prev, [currentIndex]: opt }))}
                    className={`p-4 rounded-2xl text-left text-xs sm:text-sm font-bold font-display border-2 transition-all cursor-pointer ${
                      currentAnswer === opt
                        ? 'bg-[#6B7C4F]/10 border-[#6B7C4F] text-[#3A2B22]'
                        : 'bg-white border-[#6B7C4F]/20 hover:border-[#6B7C4F] text-[#3A2B22]'
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
                  onChange={(e) => setUserAnswers((prev) => ({ ...prev, [currentIndex]: e.target.value }))}
                  placeholder="Scrivi la tua risposta qui..."
                  className="w-full p-4 rounded-2xl bg-[#F2E8D5]/40 border-2 border-[#6B7C4F]/30 focus:border-[#6B7C4F] focus:outline-none text-base text-[#3A2B22] font-medium"
                />
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleNextQuestion}
                disabled={!currentAnswer.trim()}
                className="btn-zucca w-full py-4 text-base disabled:opacity-50"
              >
                {currentIndex < questions.length - 1 ? 'Prossima Domanda →' : 'Concludi Test e Calcola Livello 🎯'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
