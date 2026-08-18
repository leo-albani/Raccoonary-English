import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { ProgressiveText } from '../components/ProgressiveText';
import { UserProfile, VocabItem, SharedLanguagePairContent, CEFRLevel, GrammarTopicProgress, ExerciseError } from '../types';
import { TARGET_LANGUAGES } from '../data/languages';
import { GRAMMAR_SYLLABUS } from '../data/grammarSyllabus';
import { NavTab } from '../components/Navigation';
import { PathwayScreen } from './PathwayScreen';
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
  const [showPathwayScreen, setShowPathwayScreen] = useState(false);

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
    <div className="pb-16 pt-16 sm:pt-14 px-4 sm:px-6 max-w-5xl mx-auto space-y-7 select-none">
      {/* 1. Saluto + Bollino del livello attivo & 2. Card Streak e Ghiande */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2B2622] p-5 sm:p-6 rounded-[28px] border-2 border-[#6B7C4F]/30 shadow-xl relative text-[#F2E8D5]">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-18 h-18 sm:w-20 sm:h-20 bg-[#1A1512] rounded-full border-2 border-[#6B7C4F]/40 flex items-center justify-center overflow-hidden shadow-md">
              <Mascot
                pose={dueItems.length > 0 ? 'greeting' : 'happy'}
                size={75}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#859966] font-display">
                {headerGreeting}
              </span>

              {/* Language Switcher Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 bg-[#1A1512] px-3 py-1 rounded-full border border-[#6B7C4F]/40 hover:border-[#E8802F] shadow-xs text-[#F2E8D5] font-bold text-xs cursor-pointer transition-all"
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

              {/* Level of Study Pill Badge */}
              {user.livelloStudioAttivo ? (
                <button
                  type="button"
                  onClick={() => setShowLevelModal(true)}
                  className="flex items-center gap-1.5 bg-[#1A1512] hover:bg-[#342D28] text-[#F2E8D5] border border-[#6B7C4F]/40 px-3 py-1 rounded-full shadow-xs text-xs font-bold font-display cursor-pointer transition-all"
                  title="Livello attivo di studio. Tocca per cambiare."
                >
                  <span className="text-[10px] text-[#859966] uppercase tracking-wider font-extrabold">Livello</span>
                  <span className="bg-[#6B7C4F] text-[#F2E8D5] px-2 py-0.2 rounded-md text-xs font-black">{user.livelloStudioAttivo}</span>
                  <span className="text-[#859966] text-[10px]">✏️</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLevelTest}
                  className="flex items-center gap-1.5 bg-[#E8802F]/20 hover:bg-[#E8802F]/30 text-[#E8802F] border border-[#E8802F]/40 px-3 py-1 rounded-full shadow-xs text-xs font-bold font-display cursor-pointer transition-all"
                  title="Scopri il tuo livello con il test adattivo"
                >
                  <span>🎯</span>
                  <span>Scopri il tuo livello</span>
                  <span className="text-xs">→</span>
                </button>
              )}

              {/* Direct and prominent button to "La mia tana" (Saved Words & Translator) */}
              <button
                type="button"
                onClick={() => onNavigate('translator')}
                id="btn-direct-tana-vocab"
                className="flex items-center gap-1.5 bg-[#6B7C4F]/25 hover:bg-[#6B7C4F]/45 text-[#F2E8D5] border-2 border-[#6B7C4F] hover:border-[#859966] px-3.5 py-1 rounded-full shadow-sm text-xs font-black font-display cursor-pointer transition-all active:scale-95 group"
                title="Apri La mia tana per consultare tutte le parole salvate"
              >
                <span className="text-sm group-hover:scale-110 transition-transform">📚</span>
                <span>La mia tana ({totalCount})</span>
                <span className="text-[#859966] group-hover:text-[#F2E8D5] group-hover:translate-x-0.5 transition-transform font-black">→</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#F2E8D5] leading-tight mt-1">
              La tua tana di {activeLang.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#F2E8D5]/75 font-medium mt-0.5">
              <ProgressiveText text={raccoonGreeting} speedMs={75} />
            </p>
          </div>
        </div>

        {/* Header Stats Badges: Bold, Large Numbers */}
        <div id="tour-target-streak" className="flex gap-3 justify-between md:justify-end">
          <div
            className="bg-[#1A1512] rounded-2xl px-5 py-3 flex items-center gap-3.5 border-2 border-[#6B7C4F]/30 shadow-md flex-1 md:flex-none text-left"
          >
            <span className="text-3xl">🌙</span>
            <div>
              <p className="text-[11px] uppercase font-extrabold text-[#F2E8D5]/60 font-display leading-none">Streak</p>
              <p className="text-xl sm:text-2xl font-black font-display text-[#F2E8D5] mt-0.5">
                {user.streakCount} <span className="text-xs font-bold text-[#F2E8D5]/70">{user.streakCount === 1 ? 'notte' : 'notti'}</span>
              </p>
            </div>
          </div>
          <div
            className="bg-[#1A1512] rounded-2xl px-5 py-3 flex items-center gap-3.5 border-2 border-[#6B7C4F]/30 shadow-md flex-1 md:flex-none text-left"
          >
            <span className="text-3xl">🌰</span>
            <div>
              <p className="text-[11px] uppercase font-extrabold text-[#F2E8D5]/60 font-display leading-none">Ghiande</p>
              <p className="text-xl sm:text-2xl font-black font-display text-[#E8802F] mt-0.5">{user.totalAcorns}</p>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Percorso verso il livello successivo (Card di accesso al percorso a schermo intero) */}
      <section id="tour-target-word-burrow" className="space-y-4">
        <div
          onClick={() => {
            playSound('review');
            setShowPathwayScreen(true);
          }}
          className="bento-card p-5 sm:p-6 bg-[#2B2622] border-2 border-[#6B7C4F]/35 hover:border-[#E8802F] text-[#F2E8D5] cursor-pointer group transition-all duration-300 shadow-xl relative overflow-hidden"
          title="Tocca per aprire il percorso a schermo intero"
        >
          {/* Top header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/40 flex items-center justify-center text-xl group-hover:scale-105 transition-transform shrink-0">
                🧭
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[#859966] font-display">
                  Il tuo percorso CEFR
                </span>
                <h2 className="text-lg sm:text-xl font-black font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors leading-tight">
                  {isMaxLevel
                    ? 'Traguardo Livello C2 (Padronanza)'
                    : `Verso il livello ${nextLevel}`}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-full bg-[#1A1512] border border-[#6B7C4F]/30 text-xs font-black font-display text-[#859966]">
                Livello {currentStudyLevel}
              </span>
            </div>
          </div>

          {/* Visual track preview with Level badge & status */}
          <div className="mt-4 pt-4 border-t border-[#6B7C4F]/20 flex items-center justify-between gap-3 bg-[#1A1512] p-3.5 sm:p-4 rounded-2xl border border-[#6B7C4F]/25">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#E8802F] text-[#1A1512] flex items-center justify-center font-black font-display text-xs shadow-md shrink-0">
                {currentStudyLevel}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black font-display text-[#F2E8D5] truncate">
                  {allObjectivesComplete ? 'Checkpoint pronto 🎯' : `${(isObj1Complete ? 1 : 0) + (isObj2Complete ? 1 : 0) + (isObj3Complete ? 1 : 0)}/3 obiettivi completati`}
                </span>
                <span className="text-[11px] font-medium text-[#F2E8D5]/65 truncate">
                  8 lezioni sequenziali + checkpoint
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-black text-[#859966] font-display">
                {Math.round((obj1Percent + obj2Percent + (isMaxLevel ? 100 : obj3Percent)) / (isMaxLevel ? 2 : 3))}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="progress-track h-2 bg-[#1A1512] border border-[#6B7C4F]/20">
              <div
                className="progress-fill progress-fill-zucca"
                style={{
                  width: `${Math.round((obj1Percent + obj2Percent + (isMaxLevel ? 100 : obj3Percent)) / (isMaxLevel ? 2 : 3))}%`,
                }}
              />
            </div>
          </div>

          {/* Prominent Large Zucca Button: "Vai al percorso" */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playSound('review');
              setShowPathwayScreen(true);
            }}
            className="btn-zucca w-full py-3 sm:py-3.5 px-4 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer mt-4"
          >
            <span>🧭</span>
            <span>Vai al percorso</span>
            <span>→</span>
          </button>
        </div>
      </section>

      {/* 4. Griglia di attività: Hub di pratica compatto (3 riquadri per riga, stile gioco) */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-extrabold font-display text-[#F2E8D5] px-1 flex items-center gap-2">
          <span>⚡</span>
          <span>Attività di Studio</span>
        </h2>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* Tile 1: Grammatica */}
          <button
            type="button"
            onClick={() => onNavigate('grammar')}
            className="p-3 sm:p-4 rounded-2xl bg-[#2B2622] hover:bg-[#342D28] border border-[#6B7C4F]/30 hover:border-[#6B7C4F] text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm group"
          >
            <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">🌲</span>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#859966] transition-colors leading-tight">
              Grammatica
            </span>
          </button>

          {/* Tile 2: Letture */}
          <button
            type="button"
            onClick={() => onNavigate('reading')}
            className="p-3 sm:p-4 rounded-2xl bg-[#2B2622] hover:bg-[#342D28] border border-[#6B7C4F]/30 hover:border-[#C99A3D] text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm group"
          >
            <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">📚</span>
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
            className="p-3 sm:p-4 rounded-2xl bg-[#2B2622] hover:bg-[#342D28] border border-[#6B7C4F]/30 hover:border-[#E8802F] text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm relative group"
          >
            {dueItems.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#E8802F] animate-pulse" />
            )}
            <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">⚡</span>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors leading-tight">
              Ripasso
            </span>
          </button>

          {/* Tile 4: Pronuncia */}
          <button
            type="button"
            onClick={() => onNavigate('pronunciation')}
            className="p-3 sm:p-4 rounded-2xl bg-[#2B2622] hover:bg-[#342D28] border border-[#6B7C4F]/30 hover:border-[#E8802F] text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm group"
          >
            <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">🎙️</span>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors leading-tight">
              Pronuncia
            </span>
          </button>

          {/* Tile 5: Scenari */}
          <button
            type="button"
            onClick={() => onNavigate('scenarios')}
            className="p-3 sm:p-4 rounded-2xl bg-[#2B2622] hover:bg-[#342D28] border border-[#6B7C4F]/30 hover:border-[#D88A3D] text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm group"
          >
            <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">🎭</span>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#D88A3D] transition-colors leading-tight">
              Scenari
            </span>
          </button>

          {/* Tile 6: Traduttore */}
          <button
            type="button"
            onClick={() => onNavigate('translator')}
            className="p-3 sm:p-4 rounded-2xl bg-[#2B2622] hover:bg-[#342D28] border border-[#6B7C4F]/30 hover:border-[#859966] text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm group"
          >
            <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">📖</span>
            <span className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] group-hover:text-[#859966] transition-colors leading-tight">
              Traduttore
            </span>
          </button>
        </div>
      </section>

      {/* 5. La mia lista di parole: Singola riga compatta con freccia */}
      <section className="pt-1">
        <div
          onClick={() => onNavigate('translator')}
          className="flex items-center justify-between py-3 px-4 rounded-2xl bg-[#2B2622]/80 hover:bg-[#2B2622] border border-[#6B7C4F]/25 hover:border-[#6B7C4F]/50 text-[#F2E8D5] cursor-pointer transition-all group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">📚</span>
            <span className="text-xs sm:text-sm font-bold font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors">
              La mia lista di parole ({totalCount} vocaboli in tana)
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-black text-[#859966] group-hover:text-[#E8802F] transition-colors font-display">
            <span>Vedi tutte</span>
            <span>→</span>
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

      {/* Full-Screen Pathway View */}
      {showPathwayScreen && (
        <PathwayScreen
          user={user}
          vocabItems={vocabItems}
          grammarProgress={grammarProgress}
          readingProgress={readingProgress}
          onClose={() => setShowPathwayScreen(false)}
          onNavigate={(tab) => {
            setShowPathwayScreen(false);
            onNavigate(tab);
          }}
          onOpenLevelTest={() => {
            setShowPathwayScreen(false);
            onOpenLevelTest();
          }}
          onSaveVocabItem={onAddVocabItem}
          onSaveExerciseError={onSaveExerciseError}
          onUpdateGrammarProgress={onUpdateGrammarProgress}
          onCompleteReading={onCompleteReading}
        />
      )}
    </div>
  );
};
