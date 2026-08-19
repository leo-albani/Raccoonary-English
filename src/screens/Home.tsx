import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { ProgressiveText } from '../components/ProgressiveText';
import { UserProfile, VocabItem, SharedLanguagePairContent, CEFRLevel, GrammarTopicProgress, ExerciseError } from '../types';
import { TARGET_LANGUAGES } from '../data/languages';
import { GRAMMAR_SYLLABUS } from '../data/grammarSyllabus';
import { NavTab } from '../components/Navigation';
import { TanaManager } from '../components/TanaManager';
import { genderedWord } from '../utils/gender';
import { playSound } from '../services/sound';

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const CEFR_LEVEL_DETAILS: { level: CEFRLevel; title: string; desc: string }[] = [
  { level: 'A1', title: 'Principiante', desc: 'Frasi base quotidiane e presentazioni' },
  { level: 'A2', title: 'Elementare', desc: 'Conversazioni semplici e routine' },
  { level: 'B1', title: 'Intermedio', desc: 'Autonomia su viaggi, lavoro e opinioni' },
  { level: 'B2', title: 'Intermedio Superiore', desc: 'Fluidità spontanea e testi complessi' },
  { level: 'C1', title: 'Avanzato', desc: 'Espressione flessibile e sfumature' },
  { level: 'C2', title: 'Padronanza', desc: 'Comprensione e precisione da madrelingua' },
];

interface HomeProps {
  user: UserProfile;
  vocabItems: VocabItem[];
  exerciseErrors?: ExerciseError[];
  userProfiles?: string[];
  sharedContent?: SharedLanguagePairContent | null;
  grammarProgress?: Record<string, GrammarTopicProgress>;
  readingProgress?: Record<string, { textsCompleted: number; lastReadAt?: number }>;
  onSwitchProfile?: (targetLanguage: string) => void;
  onAddNewLanguage?: (targetLanguage: string) => void;
  onStartReview: () => void;
  onNavigate: (tab: NavTab) => void;
  onSelectGrammarTopic?: (topicId: string) => void;
  onAddVocabItem?: (item: VocabItem) => void;
  onSaveExerciseError?: (item: ExerciseError) => void;
  onDeleteItem?: (itemId: string) => void;
  onDeleteExerciseError?: (errorId: string) => void;
  onOpenLevelTest: () => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  onUpdateGrammarProgress?: (progress: GrammarTopicProgress) => void;
  onCompleteReading?: (level: CEFRLevel) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Home: React.FC<HomeProps> = ({
  user,
  vocabItems,
  exerciseErrors = [],
  userProfiles = ['en'],
  grammarProgress = {},
  readingProgress = {},
  onSwitchProfile,
  onAddNewLanguage,
  onStartReview,
  onNavigate,
  onSelectGrammarTopic,
  onAddVocabItem,
  onSaveExerciseError,
  onDeleteItem,
  onDeleteExerciseError,
  onOpenLevelTest,
  onUpdateProfile,
  onUpdateGrammarProgress,
  onCompleteReading,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showTanaManagerModal, setShowTanaManagerModal] = useState(false);

  const activeLang = TARGET_LANGUAGES.find((l) => l.code === (user.activeProfileId || 'en')) || {
    code: 'en',
    name: 'Inglese',
    flag: '🇬🇧',
  };
  const availableLanguages = TARGET_LANGUAGES.filter((l) => !userProfiles.includes(l.code));

  const now = Date.now();
  const dueItems = vocabItems.filter((i) => i.nextReviewAt <= now);
  const totalCount = vocabItems.length;
  const passedGrammarCount = (Object.values(grammarProgress || {}) as GrammarTopicProgress[]).filter((p) => p?.passed).length;
  
  // Active study level & objectives calculations
  const currentStudyLevel = (user.livelloStudioAttivo || user.currentLevel || 'A1') as CEFRLevel;
  const levelDetail = CEFR_LEVEL_DETAILS.find((d) => d.level === currentStudyLevel) || CEFR_LEVEL_DETAILS[0];
  const currentLevelIndex = Math.max(0, CEFR_LEVELS.indexOf(currentStudyLevel));
  const isMaxLevel = currentStudyLevel === 'C2' || currentLevelIndex === CEFR_LEVELS.length - 1;
  const nextLevel = !isMaxLevel ? CEFR_LEVELS[currentLevelIndex + 1] : null;

  // 1. Objective 1: Consolidate active level (at least 5 passed grammar topics of active level, or all if total < 5)
  const activeLevelTopics = GRAMMAR_SYLLABUS.filter((topic) => topic.level === currentStudyLevel);
  const totalTopicsInActiveLevel = activeLevelTopics.length;
  const targetTopicsCount = totalTopicsInActiveLevel > 0 && totalTopicsInActiveLevel < 5 ? totalTopicsInActiveLevel : 5;
  
  const passedActiveLevelTopics = activeLevelTopics.filter((topic) => grammarProgress[topic.id]?.passed).length;
  const obj1Current = Math.min(passedActiveLevelTopics, targetTopicsCount);
  const obj1Percent = Math.min(100, Math.round((obj1Current / targetTopicsCount) * 100));
  const isObj1Complete = obj1Current >= targetTopicsCount;

  // 2. Objective 2: Read at active level (at least 5 completed readings of active level)
  const completedActiveReadings = readingProgress[currentStudyLevel]?.textsCompleted || 0;
  const obj2Target = 5;
  const obj2Current = Math.min(completedActiveReadings, obj2Target);
  const obj2Percent = Math.min(100, Math.round((obj2Current / obj2Target) * 100));
  const isObj2Complete = obj2Current >= obj2Target;

  // 3. Objective 3: Face next level (at least 3 between grammar topics or readings of next level, any combo)
  let obj3Current = 0;
  const obj3Target = 3;
  let isObj3Complete = false;
  let obj3Percent = 0;

  if (nextLevel) {
    const nextLevelTopics = GRAMMAR_SYLLABUS.filter((topic) => topic.level === nextLevel);
    const passedOrAttemptedNextTopics = nextLevelTopics.filter((topic) => {
      const prog = grammarProgress[topic.id];
      return prog && (prog.passed || prog.attemptsCount > 0 || prog.exercisesCompleted > 0);
    }).length;

    const completedNextReadings = readingProgress[nextLevel]?.textsCompleted || 0;
    const combinedNextActivity = passedOrAttemptedNextTopics + completedNextReadings;

    obj3Current = Math.min(combinedNextActivity, obj3Target);
    obj3Percent = Math.min(100, Math.round((obj3Current / obj3Target) * 100));
    isObj3Complete = obj3Current >= obj3Target;
  } else {
    isObj3Complete = true;
    obj3Percent = 100;
  }

  // All objectives complete condition
  const allObjectivesComplete = isMaxLevel
    ? isObj1Complete && isObj2Complete
    : isObj1Complete && isObj2Complete && isObj3Complete;

  // Last test date formatting
  const formattedLastTestDate = (() => {
    if (!user.lastTestDate) return null;
    const diffMs = Date.now() - user.lastTestDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    return `${diffDays} giorni fa`;
  })();

  // Contextual greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Buondì';
  if (hour >= 18 || hour < 5) timeGreeting = 'Buonasera';
  else if (hour >= 12) timeGreeting = 'Buon pomeriggio';

  const namePart = user.username ? user.username.toUpperCase() : user.firstName ? user.firstName.toUpperCase() : '';
  const titleWord = genderedWord(user.gender, 'ESPLORATORE', 'ESPLORATRICE', '');

  let headerGreeting = timeGreeting.toUpperCase();
  if (titleWord && namePart) {
    headerGreeting += `, ${titleWord} ${namePart}`;
  } else if (titleWord && !namePart) {
    headerGreeting += `, ${titleWord}`;
  } else if (!titleWord && namePart) {
    headerGreeting += `, ${namePart}`;
  }

  const raccoonGreeting =
    dueItems.length > 0
      ? `Ci sono ${dueItems.length} parole pronte per il ripasso oggi.`
      : totalCount === 0
      ? 'La tana è pronta per iniziare a salvare i tuoi primi vocaboli.'
      : 'Tutti i vocaboli in tana sono in pari per oggi!';

  return (
    <div className="pb-16 pt-16 sm:pt-14 px-4 sm:px-6 max-w-5xl mx-auto space-y-8 select-none">
      {/* 1. Saluto + Livello Attivo in Grande Evidenza (Direttamente su sfondo scuro, senza card box) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative text-[#F2E8D5]">
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#2B2622] rounded-full border-2 border-[#6B7C4F]/40 flex items-center justify-center overflow-hidden shadow-lg">
              <Mascot
                pose={dueItems.length > 0 ? 'greeting' : 'happy'}
                size={72}
                activeOutfit={user.activeOutfit}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#859966] font-display">
                {headerGreeting}
              </span>

              {/* Language Switcher Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 bg-[#2B2622]/90 hover:bg-[#2B2622] px-3 py-1 rounded-full border border-[#6B7C4F]/40 hover:border-[#E8802F] shadow-xs text-[#F2E8D5] font-bold text-xs cursor-pointer transition-all active:scale-95"
                  title="Cambia o aggiungi lingua"
                >
                  <span className="text-sm">{activeLang.flag}</span>
                  <span className="font-display">{activeLang.name}</span>
                  <span className="text-[#859966] text-[10px]">▾</span>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[#2B2622] rounded-2xl border-2 border-[#6B7C4F]/40 shadow-2xl p-2 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150 text-[#F2E8D5]">
                      <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#F2E8D5]/50 font-display">
                        I tuoi profili lingua
                      </div>
                      {userProfiles.map((code) => {
                        const lang = TARGET_LANGUAGES.find((l) => l.code === code) || {
                          code,
                          name: code,
                          flag: '🌐',
                        };
                        const isActive = code === (user.activeProfileId || 'en');
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              setShowProfileMenu(false);
                              if (!isActive && onSwitchProfile) onSwitchProfile(code);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between font-bold text-xs transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#E8802F] text-[#1A1512] shadow-xs'
                                : 'hover:bg-[#1A1512] text-[#F2E8D5]'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="text-lg">{lang.flag}</span>
                              <span className="font-display text-sm">{lang.name}</span>
                            </span>
                            {isActive && <span className="font-black text-sm text-[#1A1512]">✓</span>}
                          </button>
                        );
                      })}

                      {availableLanguages.length > 0 && (
                        <div className="pt-1 mt-1 border-t border-[#6B7C4F]/20">
                          <button
                            type="button"
                            onClick={() => {
                              setShowProfileMenu(false);
                              setShowAddModal(true);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 font-bold text-xs text-[#E8802F] hover:bg-[#E8802F]/10 transition-all cursor-pointer border border-dashed border-[#E8802F]/40 font-display"
                          >
                            <span className="text-sm">➕</span>
                            <span>Aggiungi lingua</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Direct button to "La mia tana" */}
              <button
                type="button"
                onClick={() => {
                  playSound('acorn');
                  setShowTanaManagerModal(true);
                }}
                id="btn-direct-tana-vocab"
                className="flex items-center gap-1.5 bg-[#6B7C4F]/25 hover:bg-[#6B7C4F]/45 text-[#F2E8D5] border border-[#6B7C4F]/60 hover:border-[#859966] px-3 py-1 rounded-full shadow-xs text-xs font-black font-display cursor-pointer transition-all active:scale-95 group"
                title="Apri La mia tana per consultare tutte le parole salvate"
              >
                <span className="text-xs group-hover:scale-110 transition-transform">📚</span>
                <span>Tana ({totalCount})</span>
                <span className="text-[#859966] group-hover:text-[#F2E8D5] transition-transform font-black">→</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display text-[#F2E8D5] leading-tight">
              La tua tana di {activeLang.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#F2E8D5]/75 font-medium leading-snug">
              <ProgressiveText text={raccoonGreeting} speedMs={75} />
            </p>
          </div>
        </div>

        {/* 2. Livello di Studio Attivo in Grande Evidenza (Al posto di Streak & Ghiande) */}
        <div id="tour-target-streak" className="shrink-0">
          {user.livelloStudioAttivo || user.currentLevel ? (
            <button
              type="button"
              onClick={() => {
                playSound('acorn');
                setShowLevelModal(true);
              }}
              className="w-full md:w-auto text-left bg-gradient-to-br from-[#2B2622] to-[#1E1916] hover:from-[#342D28] hover:to-[#26201D] border-2 border-[#6B7C4F]/50 hover:border-[#E8802F] p-3.5 sm:p-4 rounded-3xl shadow-xl transition-all active:scale-98 cursor-pointer flex items-center justify-between md:justify-start gap-4 group"
              title="Livello CEFR attivo. Tocca per cambiare o sostenere il test di livello"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#6B7C4F] text-[#1A1512] flex items-center justify-center font-black font-display text-2xl sm:text-3xl shadow-md group-hover:scale-105 transition-transform shrink-0">
                {currentStudyLevel}
              </div>
              <div className="pr-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#859966] font-display block">
                  Livello di studio attivo
                </span>
                <span className="text-base sm:text-lg font-black font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors block leading-tight">
                  {levelDetail.title}
                </span>
                <span className="text-[11px] text-[#F2E8D5]/60 font-medium block mt-0.5">
                  Tocca per dettagli o test →
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                playSound('acorn');
                onOpenLevelTest();
              }}
              className="w-full md:w-auto text-left bg-gradient-to-br from-[#2B2622] to-[#1E1916] hover:from-[#342D28] hover:to-[#26201D] border-2 border-[#E8802F]/50 hover:border-[#E8802F] p-3.5 sm:p-4 rounded-3xl shadow-xl transition-all active:scale-98 cursor-pointer flex items-center justify-between md:justify-start gap-4 group"
              title="Scopri il tuo livello con il test adattivo"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8802F] text-[#1A1512] flex items-center justify-center text-2xl sm:text-3xl shadow-md group-hover:scale-105 transition-transform shrink-0">
                🎯
              </div>
              <div className="pr-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#E8802F] font-display block">
                  Test Adattivo CEFR
                </span>
                <span className="text-base sm:text-lg font-black font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors block leading-tight">
                  Scopri il tuo livello
                </span>
                <span className="text-[11px] text-[#859966] font-bold block mt-0.5">
                  Inizia subito il test →
                </span>
              </div>
            </button>
          )}
        </div>
      </header>

      {/* 3. Percorso CEFR: Banner/Poster Integrato nella Pagina */}
      <section id="tour-target-word-burrow">
        <div
          onClick={() => {
            playSound('review');
            onNavigate('pathway');
          }}
          className="bg-gradient-to-br from-[#2B2622] via-[#332A24] to-[#241F1C] rounded-[28px] p-6 sm:p-8 border border-[#6B7C4F]/35 hover:border-[#E8802F]/70 text-[#F2E8D5] cursor-pointer group transition-all duration-300 shadow-2xl relative overflow-hidden space-y-5"
          title="Tocca per aprire il percorso a schermo intero"
        >
          {/* Ambient Glow accents */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#6B7C4F]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#E8802F]/10 rounded-full blur-2xl pointer-events-none -ml-12 -mb-12" />

          {/* Banner Top Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/40 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shadow-md shrink-0">
                🧭
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#859966] font-display">
                    Percorso Guidato CEFR
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#6B7C4F] text-[#1A1512] text-[10px] font-black font-display shadow-xs">
                    Livello {currentStudyLevel}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors leading-tight mt-0.5">
                  {isMaxLevel
                    ? 'Traguardo Livello C2 (Padronanza)'
                    : `Verso il livello ${nextLevel}`}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs sm:text-sm font-black font-display text-[#859966] bg-[#1A1512]/80 px-3.5 py-1.5 rounded-full border border-[#6B7C4F]/30">
                {Math.round((obj1Percent + obj2Percent + (isMaxLevel ? 100 : obj3Percent)) / (isMaxLevel ? 2 : 3))}% completato
              </span>
            </div>
          </div>

          {/* Progress Bar & Stage Indicator */}
          <div className="space-y-2 relative z-10">
            <div className="progress-track h-2.5 bg-[#1A1512] border border-[#6B7C4F]/30 rounded-full overflow-hidden">
              <div
                className="progress-fill progress-fill-zucca h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${Math.round((obj1Percent + obj2Percent + (isMaxLevel ? 100 : obj3Percent)) / (isMaxLevel ? 2 : 3))}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#F2E8D5]/70 font-medium px-0.5">
              <span>
                {allObjectivesComplete ? '🎯 Checkpoint finale pronto!' : `${(isObj1Complete ? 1 : 0) + (isObj2Complete ? 1 : 0) + (isObj3Complete ? 1 : 0)}/3 obiettivi completati`}
              </span>
              <span>8 lezioni sequenziali + checkpoint</span>
            </div>
          </div>

          {/* Action Button embedded in banner */}
          <div className="pt-1 relative z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound('review');
                onNavigate('pathway');
              }}
              className="btn-zucca w-full py-3.5 px-6 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all cursor-pointer rounded-2xl"
            >
              <span>🧭</span>
              <span>Vai al percorso a schermo intero</span>
              <span className="text-lg">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Griglia Attività di Studio (Senza riquadro card, icone e testo direttamente su sfondo scuro come icone app) */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black font-display text-[#F2E8D5] flex items-center gap-2">
          <span>⚡</span>
          <span>Attività di Studio</span>
        </h2>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 pt-1">
          {/* Tile 1: Grammatica */}
          <button
            type="button"
            onClick={() => onNavigate('grammar')}
            className="flex flex-col items-center justify-start text-center gap-2 group cursor-pointer p-2 rounded-2xl hover:bg-[#2B2622]/40 transition-colors"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#2B2622] group-hover:bg-[#38312B] group-hover:scale-105 border border-[#6B7C4F]/30 group-hover:border-[#859966] flex items-center justify-center text-2xl sm:text-3xl shadow-md transition-all active:scale-95">
              🌲
            </div>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#859966] transition-colors leading-tight">
              Grammatica
            </span>
          </button>

          {/* Tile 2: Letture */}
          <button
            type="button"
            onClick={() => onNavigate('reading')}
            className="flex flex-col items-center justify-start text-center gap-2 group cursor-pointer p-2 rounded-2xl hover:bg-[#2B2622]/40 transition-colors"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#2B2622] group-hover:bg-[#38312B] group-hover:scale-105 border border-[#6B7C4F]/30 group-hover:border-[#C99A3D] flex items-center justify-center text-2xl sm:text-3xl shadow-md transition-all active:scale-95">
              📚
            </div>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#C99A3D] transition-colors leading-tight">
              Letture
            </span>
          </button>

          {/* Tile 3: Ripasso Vocaboli */}
          <button
            type="button"
            onClick={() => {
              if (onStartReview) onStartReview();
              else onNavigate('memorize');
            }}
            className="flex flex-col items-center justify-start text-center gap-2 group cursor-pointer p-2 rounded-2xl hover:bg-[#2B2622]/40 transition-colors relative"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#2B2622] group-hover:bg-[#38312B] group-hover:scale-105 border border-[#6B7C4F]/30 group-hover:border-[#E8802F] flex items-center justify-center text-2xl sm:text-3xl shadow-md transition-all active:scale-95 relative">
              {dueItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E8802F] border-2 border-[#1A1512] animate-pulse" />
              )}
              ⚡
            </div>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors leading-tight">
              Ripasso
            </span>
          </button>

          {/* Tile 4: Pronuncia */}
          <button
            type="button"
            onClick={() => onNavigate('pronunciation')}
            className="flex flex-col items-center justify-start text-center gap-2 group cursor-pointer p-2 rounded-2xl hover:bg-[#2B2622]/40 transition-colors"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#2B2622] group-hover:bg-[#38312B] group-hover:scale-105 border border-[#6B7C4F]/30 group-hover:border-[#E8802F] flex items-center justify-center text-2xl sm:text-3xl shadow-md transition-all active:scale-95">
              🎙️
            </div>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors leading-tight">
              Pronuncia
            </span>
          </button>

          {/* Tile 5: Scenari */}
          <button
            type="button"
            onClick={() => onNavigate('scenarios')}
            className="flex flex-col items-center justify-start text-center gap-2 group cursor-pointer p-2 rounded-2xl hover:bg-[#2B2622]/40 transition-colors"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#2B2622] group-hover:bg-[#38312B] group-hover:scale-105 border border-[#6B7C4F]/30 group-hover:border-[#D88A3D] flex items-center justify-center text-2xl sm:text-3xl shadow-md transition-all active:scale-95">
              🎭
            </div>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#D88A3D] transition-colors leading-tight">
              Scenari
            </span>
          </button>

          {/* Tile 6: Traduttore */}
          <button
            type="button"
            onClick={() => onNavigate('translator')}
            className="flex flex-col items-center justify-start text-center gap-2 group cursor-pointer p-2 rounded-2xl hover:bg-[#2B2622]/40 transition-colors"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#2B2622] group-hover:bg-[#38312B] group-hover:scale-105 border border-[#6B7C4F]/30 group-hover:border-[#859966] flex items-center justify-center text-2xl sm:text-3xl shadow-md transition-all active:scale-95">
              📖
            </div>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#859966] transition-colors leading-tight">
              Traduttore
            </span>
          </button>
        </div>
      </section>

      {/* 5. La mia lista di parole: Riga semplice, nessuna card pesante */}
      <section className="pt-2">
        <div
          onClick={() => {
            playSound('acorn');
            setShowTanaManagerModal(true);
          }}
          className="flex items-center justify-between py-3.5 px-4 rounded-2xl bg-[#2B2622]/40 hover:bg-[#2B2622]/80 border border-[#6B7C4F]/20 hover:border-[#6B7C4F]/40 text-[#F2E8D5] cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📚</span>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors">
              La mia lista di parole ({totalCount} vocaboli in tana)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-black text-[#859966] group-hover:text-[#E8802F] transition-colors font-display">
            <span>Vedi tutte</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>
      </section>

      {/* Add Language Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#2B2622] rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-[#6B7C4F]/40 shadow-2xl space-y-5 relative text-[#F2E8D5]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-[#F2E8D5]/50 hover:text-[#F2E8D5] font-bold text-xl cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="badge-leaf">Nuova Lingua</span>
              <h2 className="text-2xl font-extrabold font-display text-[#F2E8D5]">
                Scegli la lingua da esplorare
              </h2>
              <p className="text-xs text-[#F2E8D5]/70 font-medium">
                Ogni lingua ha i suoi vocaboli, la sua serie notturna e le sue impostazioni separate.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    if (onAddNewLanguage) {
                      onAddNewLanguage(lang.code);
                    }
                    setShowAddModal(false);
                  }}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/30 hover:border-[#E8802F] hover:bg-[#342D28] transition-all text-left cursor-pointer shadow-xs"
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <div className="flex-1">
                    <p className="font-extrabold font-display text-sm sm:text-base text-[#F2E8D5]">{lang.name}</p>
                    <p className="text-[11px] text-[#F2E8D5]/50 font-medium">Inizia da zero o importa liste</p>
                  </div>
                  <span className="text-[#E8802F] font-bold text-sm">Inizia →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Level Selector Modal */}
      {showLevelModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#2B2622] rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-[#6B7C4F]/40 shadow-2xl space-y-5 relative text-[#F2E8D5]">
            <button
              type="button"
              onClick={() => setShowLevelModal(false)}
              className="absolute top-4 right-4 text-[#F2E8D5]/50 hover:text-[#F2E8D5] font-bold text-xl cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="badge-leaf">Livello di Studio</span>
              <h2 className="text-2xl font-extrabold font-display text-[#F2E8D5]">
                Imposta il tuo livello attivo 🎯
              </h2>
              <p className="text-xs sm:text-sm text-[#F2E8D5]/75 font-medium">
                Scegli su cosa basare i contenuti di grammatica e comprensione. Puoi cambiarlo liberamente in qualsiasi momento.
              </p>
              {user.currentLevel && (
                <p className="text-xs font-bold text-[#E8802F] font-display pt-1">
                  Ultimo test misurato: {user.currentLevel}
                </p>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {CEFR_LEVEL_DETAILS.map((item) => {
                const isSelected = user.livelloStudioAttivo === item.level;
                const isMeasured = user.currentLevel === item.level;
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => {
                      playSound('correct');
                      if (onUpdateProfile) {
                        onUpdateProfile({ livelloStudioAttivo: item.level });
                      }
                      setShowLevelModal(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#6B7C4F]/20 border-[#6B7C4F] shadow-sm'
                        : 'bg-[#1A1512] border-[#6B7C4F]/20 hover:border-[#6B7C4F]/50 hover:bg-[#201A16]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm font-display shrink-0 ${
                          isSelected
                            ? 'bg-[#6B7C4F] text-white'
                            : 'bg-[#C99A3D]/20 text-[#C99A3D]'
                        }`}
                      >
                        {item.level}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm sm:text-base text-[#F2E8D5] font-display">
                            {item.title}
                          </span>
                          {isMeasured && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#E8802F]/20 text-[#E8802F]">
                              Test
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#F2E8D5]/70 font-medium line-clamp-1">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-xs font-bold text-[#859966] font-display px-2.5 py-1 rounded-full bg-[#6B7C4F]/25 border border-[#6B7C4F]/40">
                        Attivo ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#6B7C4F]/20 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLevelModal(false);
                  onOpenLevelTest();
                }}
                className="btn-secondary w-full py-3 text-xs sm:text-sm font-bold"
              >
                Fai il test di livello adattivo 🎯
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tana Manager Modal */}
      {showTanaManagerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <TanaManager
              vocabItems={vocabItems}
              exerciseErrors={exerciseErrors}
              onDeleteItem={(id) => {
                if (onDeleteItem) onDeleteItem(id);
              }}
              onDeleteExerciseError={(id) => {
                if (onDeleteExerciseError) onDeleteExerciseError(id);
              }}
              onClose={() => setShowTanaManagerModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
