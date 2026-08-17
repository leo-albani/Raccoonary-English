import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Sparkles,
  Star,
  Volume2,
  RotateCcw,
  ArrowRight,
  BookOpen,
  MessageSquare,
  HelpCircle,
  Trophy,
  Loader2,
  Lightbulb,
  Share2,
  Compass,
} from 'lucide-react';
import { Mascot } from '../mascot/Mascot';
import {
  CEFRLevel,
  Exercise,
  ScenarioContent,
  ScenarioRecord,
  ScenarioVocabItem,
  UserProfile,
  VocabItem,
} from '../types';
import { PREDEFINED_SCENARIOS, SEED_SCENARIOS } from '../data/scenarioSeeds';
import { generateScenarioContent, getWordDeepDive } from '../services/gemini';
import { fetchScenarios, saveScenarioRecord } from '../services/firebase';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../data/languages';

interface ScenariosProps {
  userProfile?: UserProfile;
  vocabItems: VocabItem[];
  onSaveVocabItem: (item: VocabItem) => void;
  onBackToHome: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

type Stage = 'select' | 'vocab' | 'exercises' | 'situation' | 'summary';

export const Scenarios: React.FC<ScenariosProps> = ({
  userProfile,
  vocabItems,
  onSaveVocabItem,
  onBackToHome,
}) => {
  const userId = userProfile?.id || 'local_user';
  const profileId = userProfile?.activeProfileId || 'en';
  const activeLevel = (userProfile?.livelloStudioAttivo || userProfile?.currentLevel || 'A2') as CEFRLevel;

  const targetLang = userProfile?.activeProfileId || 'en';
  const nativeLang = userProfile?.nativeLanguage || 'it';
  const targetName = TARGET_LANGUAGES.find((l) => l.code === targetLang)?.name || 'Inglese';
  const nativeName = NATIVE_LANGUAGES.find((l) => l.code === nativeLang)?.name || 'Italiano';

  // Persistence state
  const [scenarioRecords, setScenarioRecords] = useState<Record<string, ScenarioRecord>>({});
  const [customInput, setCustomInput] = useState('');

  // Active scenario flow
  const [currentStage, setCurrentStage] = useState<Stage>('select');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('travel');
  const [selectedContextName, setSelectedContextName] = useState<string>('Viaggio e vacanze');
  const [scenarioData, setScenarioData] = useState<ScenarioContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stage 1 Vocab saved tracking
  const [savedTerms, setSavedTerms] = useState<Set<string>>(new Set());

  // Stage 2 Exercises state
  const [currentExIndex, setCurrentExIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showFeedback, setShowFeedback] = useState<Record<number, boolean>>({});
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);

  // Stage 3 Dialogue state
  const [dialogueAnswers, setDialogueAnswers] = useState<Record<string, string>>({});
  const [dialogueChecked, setDialogueChecked] = useState<Record<string, boolean>>({});

  // Deep dive modal state
  const [activeDeepDiveWord, setActiveDeepDiveWord] = useState<string | null>(null);
  const [deepDiveData, setDeepDiveData] = useState<any | null>(null);
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);

  // Load scenarios from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    fetchScenarios(userId, profileId).then((records) => {
      if (isMounted && records) {
        setScenarioRecords(records);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userId, profileId]);

  // Audio helper
  const handleSpeak = (text: string, lang = targetLang) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'en' ? 'en-US' : lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  };

  // Check if a word is already in burrow
  const isWordInBurrow = (term: string) => {
    const clean = term.trim().toLowerCase();
    return savedTerms.has(clean) || vocabItems.some((v) => v.term.trim().toLowerCase() === clean);
  };

  // Save word to burrow
  const handleSaveWord = (term: string, translation: string, example = '', contextTitle?: string) => {
    const title = contextTitle || scenarioData?.scenarioTitle || selectedContextName;
    const cleanTerm = term.trim();
    if (!cleanTerm) return;

    const newVocab: VocabItem = {
      id: `vocab_scen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      term: cleanTerm,
      translation: translation || cleanTerm,
      sourceLang: nativeLang as 'it' | 'en',
      targetLang: targetLang as 'it' | 'en',
      synonyms: [],
      exampleSource: example || '',
      exampleTranslation: '',
      usageNote: `Scenario: ${title}`,
      origin: 'context_practice',
      originDetail: title,
      createdAt: Date.now(),
      lastReviewedAt: null,
      box: 1,
      nextReviewAt: Date.now(),
      correctStreak: 0,
      wrongCount: 0,
    };

    onSaveVocabItem(newVocab);
    setSavedTerms((prev) => new Set([...prev, cleanTerm.toLowerCase()]));
  };

  // Open deep dive
  const handleOpenDeepDive = async (word: string, contextSentence = '') => {
    setActiveDeepDiveWord(word);
    setIsDeepDiveLoading(true);
    setDeepDiveData(null);
    try {
      const data = await getWordDeepDive(word, contextSentence);
      setDeepDiveData(data);
    } catch (e) {
      console.warn('Deep dive load failed:', e);
    } finally {
      setIsDeepDiveLoading(false);
    }
  };

  // Start a scenario
  const handleStartScenario = async (scenId: string, contextName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedScenarioId(scenId);
    setSelectedContextName(contextName);
    setCurrentExIndex(0);
    setUserAnswers({});
    setShowFeedback({});
    setCorrectAnswersCount(0);
    setDialogueAnswers({});
    setDialogueChecked({});
    setSavedTerms(new Set());

    // Mark as in_corso in DB
    saveScenarioRecord(userId, scenId, {
      nome: contextName,
      status: 'in_corso',
      ultimaPraticaIl: Date.now(),
    }, profileId).then((updated) => setScenarioRecords(updated));

    try {
      const content = await generateScenarioContent(
        contextName,
        scenId,
        activeLevel,
        nativeLang,
        targetLang,
        nativeName,
        targetName
      );
      setScenarioData(content);
      setCurrentStage('vocab');
    } catch (e: any) {
      console.error('Error generating scenario:', e);
      if (SEED_SCENARIOS[scenId]) {
        setScenarioData(SEED_SCENARIOS[scenId]);
        setCurrentStage('vocab');
      } else {
        setErrorMessage(e.message || 'Impossibile caricare lo scenario. Riprova tra poco.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Finish and save completion
  const handleFinishScenario = async () => {
    if (scenarioData) {
      const updated = await saveScenarioRecord(
        userId,
        selectedScenarioId,
        {
          nome: scenarioData.scenarioTitle || selectedContextName,
          status: 'completato',
          ultimaPraticaIl: Date.now(),
        },
        profileId
      );
      setScenarioRecords(updated);
    }
    setCurrentStage('summary');
  };

  // Helper to get status badge for selection screen
  const getScenarioStatus = (scenId: string) => {
    const rec = scenarioRecords[scenId];
    if (!rec) return { status: 'mai_provato', label: 'Mai provato', count: 0 };
    if (rec.status === 'completato') {
      return { status: 'completato', label: 'Completato', count: rec.volteCompletato || 1 };
    }
    return { status: 'in_corso', label: 'In corso', count: 0 };
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* -------------------- TOP BAR -------------------- */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => {
            if (currentStage === 'select') {
              onBackToHome();
            } else {
              setCurrentStage('select');
            }
          }}
          className="btn-secondary !py-2 !px-3.5 flex items-center gap-2 text-xs font-bold text-[#E5D7C7] hover:text-[#FAF4ED]"
        >
          <ArrowLeft className="w-4 h-4 text-[#D88A3D]" />
          <span>{currentStage === 'select' ? 'Torna alla Home' : 'Cambia scenario'}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#332A24] text-[#E5D7C7] border border-[#483B32]">
            🎭 <span className="text-[#D88A3D] font-black">{activeLevel}</span>
          </span>
        </div>
      </div>

      {/* -------------------- STEPPER (if in active scenario) -------------------- */}
      {currentStage !== 'select' && scenarioData && (
        <div className="bento-card !py-3 flex items-center justify-between overflow-x-auto gap-2 text-xs font-bold">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${currentStage === 'vocab' ? 'bg-[#D88A3D] text-[#241C16]' : 'text-[#A89887]'}`}>
            <span>1. Vocabolario</span>
          </div>
          <span className="text-[#5A4B40]">→</span>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${currentStage === 'exercises' ? 'bg-[#D88A3D] text-[#241C16]' : 'text-[#A89887]'}`}>
            <span>2. Esercizi ({currentExIndex + 1}/{scenarioData.exercises.length || 8})</span>
          </div>
          <span className="text-[#5A4B40]">→</span>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${currentStage === 'situation' ? 'bg-[#D88A3D] text-[#241C16]' : 'text-[#A89887]'}`}>
            <span>3. Situazione</span>
          </div>
          <span className="text-[#5A4B40]">→</span>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${currentStage === 'summary' ? 'bg-[#6B7C4F] text-[#FAF4ED]' : 'text-[#A89887]'}`}>
            <span>4. Riepilogo</span>
          </div>
        </div>
      )}

      {/* -------------------- LOADING SCREEN -------------------- */}
      {isLoading && (
        <div className="bento-card text-center py-16 space-y-6 animate-fade-in">
          <Mascot pose="thinking" size={110} speechBubble={`Sto allestendo la palestra per "${selectedContextName}" con frasi ed esercizi realistici...`} />
          <div className="flex items-center justify-center gap-3 text-[#D88A3D] font-bold text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generazione scenario in corso...</span>
          </div>
        </div>
      )}

      {/* -------------------- ERROR MESSAGE -------------------- */}
      {errorMessage && !isLoading && (
        <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => handleStartScenario(selectedScenarioId, selectedContextName)}
            className="btn-secondary !py-1 !px-3 text-xs"
          >
            Riprova
          </button>
        </div>
      )}

      {/* -------------------- 0. SELECTION SCREEN -------------------- */}
      {currentStage === 'select' && !isLoading && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner */}
          <div className="bento-card flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <Mascot
              pose="reading"
              size={96}
              speechBubble="Scegli un contesto reale per allenarti! Vocaboli mirati, 8 esercizi pratici e una mini-situazione. Tutto ciò che impari va dritto nella tua tana!"
            />
            <div className="space-y-1.5">
              <span className="badge-amber inline-flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>Palestra Pratica a Scenari</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#FAF4ED]">
                In quale situazione vuoi allenarti?
              </h1>
              <p className="text-xs sm:text-sm text-[#A89887] font-medium leading-relaxed">
                Nessun esame o punteggio rigido: esplora il linguaggio vivo di viaggi, lavoro, cene e imprevisti.
              </p>
            </div>
          </div>

          {/* Predefined Scenarios Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PREDEFINED_SCENARIOS.map((scen) => {
              const statusInfo = getScenarioStatus(scen.id);
              const isCompleted = statusInfo.status === 'completato';
              const isInProgress = statusInfo.status === 'in_corso';

              return (
                <button
                  key={scen.id}
                  onClick={() => handleStartScenario(scen.id, scen.name)}
                  className="bento-card text-left p-5 flex flex-col justify-between hover:border-[#D88A3D]/70 transition-all group relative overflow-hidden active:scale-[0.99]"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-3xl p-2.5 rounded-2xl bg-[#332A24] border border-[#483B32] inline-block group-hover:scale-110 transition-transform">
                        {scen.icon}
                      </span>
                      {isCompleted ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#6B7C4F]/20 text-[#8FA36E] border border-[#6B7C4F]/40 flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#8FA36E]" />
                          <span>Completato {statusInfo.count > 1 ? `(${statusInfo.count}x)` : ''}</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#D88A3D]/20 text-[#D88A3D] border border-[#D88A3D]/40">
                          In corso
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#332A24] text-[#A89887] border border-[#483B32]">
                          Mai provato
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#FAF4ED] group-hover:text-[#D88A3D] transition-colors">
                        {scen.name}
                      </h3>
                      <p className="text-xs text-[#A89887] line-clamp-2 mt-1">
                        {scen.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#3A2E26] flex items-center justify-between text-xs font-bold text-[#D88A3D]">
                    <span>Inizia allenamento</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Context Field */}
          <div className="bento-card space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#FAF4ED]">
              <Sparkles className="w-4 h-4 text-[#D88A3D]" />
              <span>Hai in mente un contesto specifico?</span>
            </div>
            <p className="text-xs text-[#A89887]">
              Scrivi qualsiasi situazione libera: Rocky creerà un mini-modulo personalizzato sul momento.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Es. Noleggiare una canoa in Canada, Ordinare un cocktail in un rooftop bar..."
                className="flex-1 bg-[#1C1612] border border-[#483B32] rounded-2xl px-4 py-3 text-sm text-[#FAF4ED] placeholder-[#736357] focus:outline-none focus:border-[#D88A3D]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInput.trim()) {
                    handleStartScenario(`custom_${Date.now()}`, customInput.trim());
                  }
                }}
              />
              <button
                disabled={!customInput.trim()}
                onClick={() => handleStartScenario(`custom_${Date.now()}`, customInput.trim())}
                className="btn-primary !py-3 !px-5 whitespace-nowrap text-xs font-bold disabled:opacity-50"
              >
                Avvia scenario personalizzato ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 1. TAPPA 1: VOCABOLARIO CHIAVE -------------------- */}
      {currentStage === 'vocab' && scenarioData && (
        <div className="space-y-6 animate-fade-in">
          <div className="bento-card flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <Mascot
              pose="encouraging"
              size={90}
              speechBubble={`Ecco le parole ed espressioni fondamentali per "${scenarioData.scenarioTitle}". Tocca l'audio per ascoltarle o la stella per salvarle nella tana!`}
            />
            <div className="space-y-1">
              <span className="badge-amber">Tappa 1 / 4 • Vocabolario chiave</span>
              <h2 className="text-2xl font-bold font-display text-[#FAF4ED]">
                {scenarioData.scenarioTitle}
              </h2>
              <p className="text-xs text-[#A89887]">
                {scenarioData.vocabulary.length} termini selezionati per il livello {activeLevel}.
              </p>
            </div>
          </div>

          {/* Vocab Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {scenarioData.vocabulary.map((item, idx) => {
              const inBurrow = isWordInBurrow(item.termine);
              return (
                <div
                  key={idx}
                  className="bento-card !p-4 flex flex-col justify-between space-y-3 hover:border-[#D88A3D]/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#FAF4ED]">
                          {item.termine}
                        </span>
                        <button
                          onClick={() => handleSpeak(item.termine)}
                          className="p-1 rounded-lg bg-[#332A24] text-[#D88A3D] hover:bg-[#D88A3D] hover:text-[#241C16] transition-colors"
                          title="Ascolta pronuncia"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs font-semibold text-[#8FA36E]">
                        {item.traduzione}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSaveWord(item.termine, item.traduzione, item.esempio)}
                      className={`p-2 rounded-xl transition-all ${
                        inBurrow
                          ? 'bg-[#D88A3D]/20 text-[#D88A3D] border border-[#D88A3D]/40'
                          : 'bg-[#332A24] text-[#A89887] hover:text-[#D88A3D] border border-[#483B32]'
                      }`}
                      title={inBurrow ? 'Salvata in tana' : 'Salva in tana'}
                    >
                      <Star className={`w-4 h-4 ${inBurrow ? 'fill-[#D88A3D]' : ''}`} />
                    </button>
                  </div>

                  {item.esempio && (
                    <div className="p-2.5 rounded-xl bg-[#1C1612] border border-[#3A2E26] text-xs text-[#E5D7C7]/90 space-y-1">
                      <p className="italic">"{item.esempio}"</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      onClick={() => handleOpenDeepDive(item.termine, item.esempio)}
                      className="text-[#A89887] hover:text-[#FAF4ED] underline decoration-dotted"
                    >
                      Approfondimento
                    </button>
                    {inBurrow && (
                      <span className="text-[#8FA36E] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> In Tana
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action button to proceed */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setCurrentStage('exercises');
                setCurrentExIndex(0);
              }}
              className="btn-primary flex items-center gap-2 text-sm font-bold !py-3.5 !px-6"
            >
              <span>Continua agli esercizi (8)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* -------------------- 2. TAPPA 2: ESERCIZI PRATICI -------------------- */}
      {currentStage === 'exercises' && scenarioData && (
        <div className="space-y-6 animate-fade-in">
          {(() => {
            const exercises = scenarioData.exercises || [];
            const currentEx = exercises[currentExIndex];
            const isAnswered = showFeedback[currentExIndex];
            const currentInput = userAnswers[currentExIndex] || '';

            if (!currentEx) {
              return (
                <div className="bento-card text-center py-10">
                  <p className="text-sm text-[#A89887]">Nessun esercizio disponibile.</p>
                  <button onClick={() => setCurrentStage('situation')} className="btn-primary mt-4">
                    Vai alla situazione →
                  </button>
                </div>
              );
            }

            const cleanAns = (currentEx.rispostaCorretta || '').trim().toLowerCase();
            const cleanUser = currentInput.trim().toLowerCase();
            const isCorrect = cleanUser === cleanAns || (currentEx.tipo === 'translation' && cleanUser.length > 3);

            const handleCheckAnswer = () => {
              if (!currentInput.trim()) return;
              setShowFeedback((prev) => ({ ...prev, [currentExIndex]: true }));
              if (isCorrect) {
                setCorrectAnswersCount((prev) => prev + 1);
              }
            };

            const handleNextExercise = () => {
              if (currentExIndex < exercises.length - 1) {
                setCurrentExIndex((prev) => prev + 1);
              } else {
                setCurrentStage('situation');
              }
            };

            return (
              <div className="space-y-5">
                {/* Exercise Header Card */}
                <div className="bento-card flex items-center justify-between !py-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#A89887]">
                    <BookOpen className="w-4 h-4 text-[#D88A3D]" />
                    <span>Esercizio {currentExIndex + 1} di {exercises.length}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#332A24] text-[#D88A3D]">
                    {currentEx.tipo.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Question Box */}
                <div className="bento-card space-y-6">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#D88A3D] uppercase tracking-wider">
                      Istruzioni
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-[#FAF4ED]">
                      {currentEx.domanda}
                    </h3>
                  </div>

                  {/* Multiple Choice Options */}
                  {currentEx.tipo === 'multiple_choice' && currentEx.opzioni && currentEx.opzioni.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentEx.opzioni.map((opt, oIdx) => {
                        const isSelected = currentInput === opt;
                        const isThisCorrect = opt.trim().toLowerCase() === cleanAns;

                        let style = 'bg-[#1C1612] border-[#3A2E26] text-[#E5D7C7] hover:border-[#D88A3D]';
                        if (isAnswered) {
                          if (isThisCorrect) {
                            style = 'bg-[#6B7C4F]/30 border-[#6B7C4F] text-[#FAF4ED]';
                          } else if (isSelected) {
                            style = 'bg-red-950/40 border-red-700 text-red-200';
                          }
                        } else if (isSelected) {
                          style = 'bg-[#332A24] border-[#D88A3D] text-[#FAF4ED]';
                        }

                        return (
                          <button
                            key={oIdx}
                            disabled={isAnswered}
                            onClick={() => {
                              setUserAnswers((prev) => ({ ...prev, [currentExIndex]: opt }));
                            }}
                            className={`p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between ${style}`}
                          >
                            <span>{opt}</span>
                            {isAnswered && isThisCorrect && <Check className="w-4 h-4 text-[#8FA36E]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Input for Fill in Blank / Translation / Sentence transformation */}
                  {currentEx.tipo !== 'multiple_choice' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        disabled={isAnswered}
                        value={currentInput}
                        onChange={(e) => setUserAnswers((prev) => ({ ...prev, [currentExIndex]: e.target.value }))}
                        placeholder="Scrivi qui la tua risposta..."
                        className="w-full bg-[#1C1612] border border-[#483B32] rounded-2xl px-4 py-3 text-sm text-[#FAF4ED] placeholder-[#736357] focus:outline-none focus:border-[#D88A3D]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isAnswered && currentInput.trim()) {
                            handleCheckAnswer();
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Feedback Card */}
                  {isAnswered && (
                    <div className={`p-4 rounded-2xl border space-y-2 animate-fade-in ${
                      isCorrect ? 'bg-[#6B7C4F]/15 border-[#6B7C4F]/50 text-[#E5D7C7]' : 'bg-red-950/30 border-red-800/60 text-red-200'
                    }`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[#8FA36E]" />
                            <span className="text-[#8FA36E]">Ottimo! Risposta corretta!</span>
                          </>
                        ) : (
                          <>
                            <span>❌</span>
                            <span>Risposta corretta: <strong className="text-[#FAF4ED]">{currentEx.rispostaCorretta}</strong></span>
                          </>
                        )}
                      </div>
                      {currentEx.spiegazione && (
                        <p className="text-xs text-[#A89887]">
                          {currentEx.spiegazione}
                        </p>
                      )}

                      {/* Save Word if needed */}
                      {!isWordInBurrow(currentEx.rispostaCorretta) && (
                        <button
                          onClick={() => handleSaveWord(currentEx.rispostaCorretta, currentEx.rispostaCorretta, currentEx.domanda)}
                          className="mt-2 text-xs font-bold text-[#D88A3D] hover:underline flex items-center gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Salva questa parola in Tana</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-[#736357]">
                      {correctAnswersCount} corrette su {currentExIndex + (isAnswered ? 1 : 0)}
                    </span>

                    {!isAnswered ? (
                      <button
                        disabled={!currentInput.trim()}
                        onClick={handleCheckAnswer}
                        className="btn-primary !py-3 !px-6 text-xs font-bold disabled:opacity-50"
                      >
                        Verifica risposta
                      </button>
                    ) : (
                      <button
                        onClick={handleNextExercise}
                        className="btn-primary flex items-center gap-2 !py-3 !px-6 text-xs font-bold"
                      >
                        <span>{currentExIndex < exercises.length - 1 ? 'Prossimo esercizio' : 'Vai alla situazione'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* -------------------- 3. TAPPA 3: MINI-SITUAZIONE -------------------- */}
      {currentStage === 'situation' && scenarioData && (
        <div className="space-y-6 animate-fade-in">
          <div className="bento-card flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <Mascot
              pose="reading"
              size={90}
              speechBubble="Ecco una mini-situazione reale! Leggi il dialogo o tocca i fumetti per ascoltarli. Poi rispondi alle domande di comprensione!"
            />
            <div className="space-y-1">
              <span className="badge-amber">Tappa 3 / 4 • Situazione reale</span>
              <h2 className="text-2xl font-bold font-display text-[#FAF4ED]">
                {scenarioData.dialogue?.title || scenarioData.scenarioTitle}
              </h2>
              <p className="text-xs text-[#A89887]">
                {scenarioData.dialogue?.context || 'Mettiti alla prova nel contesto.'}
              </p>
            </div>
          </div>

          {/* Dialogue Box */}
          <div className="bento-card space-y-4">
            <div className="flex items-center justify-between border-b border-[#3A2E26] pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FAF4ED]">
                <MessageSquare className="w-4 h-4 text-[#D88A3D]" />
                <span>Dialogo ambientato</span>
              </div>
              <button
                onClick={() => handleSpeak(scenarioData.dialogue?.text || '')}
                className="btn-secondary !py-1 !px-2.5 text-xs flex items-center gap-1.5 text-[#D88A3D]"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Ascolta tutto</span>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {(scenarioData.dialogue?.text || '').split('\n').map((line, lIdx) => {
                if (!line.trim()) return null;
                const isEven = lIdx % 2 === 0;
                return (
                  <div
                    key={lIdx}
                    className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 text-xs sm:text-sm ${
                      isEven
                        ? 'bg-[#1C1612] border-[#3A2E26] text-[#FAF4ED]'
                        : 'bg-[#2B231D] border-[#483B32] text-[#FAF4ED]'
                    }`}
                  >
                    <p className="leading-relaxed flex-1 font-medium">{line}</p>
                    <button
                      onClick={() => handleSpeak(line)}
                      className="p-1 rounded-lg text-[#A89887] hover:text-[#D88A3D] transition-colors"
                      title="Ascolta questa battuta"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comprehension Questions */}
          {scenarioData.dialogue?.questions && scenarioData.dialogue.questions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FAF4ED]">
                <HelpCircle className="w-4 h-4 text-[#D88A3D]" />
                <span>Domande di comprensione</span>
              </div>

              {scenarioData.dialogue.questions.map((q, qIdx) => {
                const selectedOpt = dialogueAnswers[q.id];
                const isChecked = dialogueChecked[q.id];
                const isCorrect = (selectedOpt || '').trim().toLowerCase() === q.rispostaCorretta.trim().toLowerCase();

                return (
                  <div key={q.id || qIdx} className="bento-card space-y-3.5">
                    <h4 className="text-sm font-bold text-[#FAF4ED]">
                      {qIdx + 1}. {q.domanda}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.opzioni.map((opt, oIdx) => {
                        const isThisSelected = selectedOpt === opt;
                        const isThisCorrect = opt.trim().toLowerCase() === q.rispostaCorretta.trim().toLowerCase();

                        let optClass = 'bg-[#1C1612] border-[#3A2E26] text-[#E5D7C7] hover:border-[#D88A3D]';
                        if (isChecked) {
                          if (isThisCorrect) {
                            optClass = 'bg-[#6B7C4F]/30 border-[#6B7C4F] text-[#FAF4ED]';
                          } else if (isThisSelected) {
                            optClass = 'bg-red-950/40 border-red-700 text-red-200';
                          }
                        } else if (isThisSelected) {
                          optClass = 'bg-[#332A24] border-[#D88A3D] text-[#FAF4ED]';
                        }

                        return (
                          <button
                            key={oIdx}
                            disabled={isChecked}
                            onClick={() => {
                              setDialogueAnswers((prev) => ({ ...prev, [q.id]: opt }));
                              setDialogueChecked((prev) => ({ ...prev, [q.id]: true }));
                            }}
                            className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${optClass}`}
                          >
                            <span>{opt}</span>
                            {isChecked && isThisCorrect && <Check className="w-3.5 h-3.5 text-[#8FA36E]" />}
                          </button>
                        );
                      })}
                    </div>

                    {isChecked && (
                      <p className={`text-xs font-semibold ${isCorrect ? 'text-[#8FA36E]' : 'text-red-300'}`}>
                        {isCorrect ? '✓ Esatto!' : `Risposta corretta: ${q.rispostaCorretta}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action button to finish */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleFinishScenario}
              className="btn-primary flex items-center gap-2 text-sm font-bold !py-3.5 !px-6"
            >
              <span>Vedi il riepilogo finale</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* -------------------- 4. TAPPA 4: RIEPILOGO FINALE -------------------- */}
      {currentStage === 'summary' && scenarioData && (
        <div className="space-y-6 animate-fade-in">
          <div className="bento-card text-center py-10 space-y-5">
            <Mascot
              pose="celebrating"
              size={120}
              speechBubble={`Fantastico lavoro! Hai completato lo scenario "${scenarioData.scenarioTitle}". Le parole salvate sono pronte nella tua tana per il ripasso quotidiano!`}
            />
            <div className="space-y-2">
              <span className="badge-leaf inline-flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>Scenario completato con successo!</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#FAF4ED]">
                {scenarioData.scenarioTitle}
              </h2>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bento-card !p-4 text-center space-y-1">
              <span className="text-2xl">📚</span>
              <p className="text-xl font-bold text-[#FAF4ED]">{scenarioData.vocabulary.length}</p>
              <p className="text-[11px] text-[#A89887]">Vocaboli esplorati</p>
            </div>

            <div className="bento-card !p-4 text-center space-y-1">
              <span className="text-2xl">⭐</span>
              <p className="text-xl font-bold text-[#D88A3D]">{savedTerms.size}</p>
              <p className="text-[11px] text-[#A89887]">Salvati in tana</p>
            </div>

            <div className="bento-card !p-4 text-center space-y-1">
              <span className="text-2xl">🎯</span>
              <p className="text-xl font-bold text-[#8FA36E]">
                {correctAnswersCount} / {scenarioData.exercises.length || 8}
              </p>
              <p className="text-[11px] text-[#A89887]">Esercizi corretti</p>
            </div>

            <div className="bento-card !p-4 text-center space-y-1">
              <span className="text-2xl">⚡</span>
              <p className="text-xl font-bold text-[#FAF4ED]">{activeLevel}</p>
              <p className="text-[11px] text-[#A89887]">Livello praticato</p>
            </div>
          </div>

          {/* Action Buttons as explicitly requested */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              onClick={() => handleStartScenario(selectedScenarioId, selectedContextName)}
              className="btn-secondary flex-1 !py-3.5 text-xs font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-[#D88A3D]" />
              <span>Allenati ancora in questo scenario</span>
            </button>

            <button
              onClick={() => setCurrentStage('select')}
              className="btn-primary flex-1 !py-3.5 text-xs font-bold flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Scegli un altro scenario</span>
            </button>
          </div>
        </div>
      )}

      {/* -------------------- DEEP DIVE MODAL -------------------- */}
      {activeDeepDiveWord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bento-card max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 animate-scale-up border-[#D88A3D]/40">
            <div className="flex items-center justify-between border-b border-[#3A2E26] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#FAF4ED]">{activeDeepDiveWord}</span>
                <button
                  onClick={() => handleSpeak(activeDeepDiveWord)}
                  className="p-1 rounded-lg bg-[#332A24] text-[#D88A3D] hover:bg-[#D88A3D] hover:text-[#241C16]"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setActiveDeepDiveWord(null)}
                className="text-[#A89887] hover:text-[#FAF4ED] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {isDeepDiveLoading ? (
              <div className="py-10 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D88A3D]" />
                <p className="text-xs text-[#A89887]">Analisi approfondita del termine in corso...</p>
              </div>
            ) : deepDiveData ? (
              <div className="space-y-4 text-xs">
                {deepDiveData.significato && (
                  <div className="p-3 rounded-xl bg-[#1C1612] border border-[#3A2E26]">
                    <span className="text-[#D88A3D] font-bold block mb-1">Significato principale</span>
                    <p className="text-[#FAF4ED]">{deepDiveData.significato}</p>
                  </div>
                )}

                {deepDiveData.sfumature && (
                  <div className="p-3 rounded-xl bg-[#1C1612] border border-[#3A2E26]">
                    <span className="text-[#8FA36E] font-bold block mb-1">Uso e sfumature</span>
                    <p className="text-[#E5D7C7]">{deepDiveData.sfumature}</p>
                  </div>
                )}

                {deepDiveData.collocazioni && deepDiveData.collocazioni.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[#FAF4ED] font-bold block">Collocazioni tipiche:</span>
                    <div className="space-y-1">
                      {deepDiveData.collocazioni.map((c: any, cIdx: number) => (
                        <div key={cIdx} className="p-2 rounded-lg bg-[#1C1612] flex justify-between">
                          <span className="text-[#D88A3D] font-semibold">{c.target}</span>
                          <span className="text-[#A89887]">{c.native}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    handleSaveWord(activeDeepDiveWord, deepDiveData.significato || activeDeepDiveWord);
                    setActiveDeepDiveWord(null);
                  }}
                  className="btn-primary w-full !py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 mt-2"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Salva nella Tana</span>
                </button>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#A89887]">
                Nessun approfondimento disponibile.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
