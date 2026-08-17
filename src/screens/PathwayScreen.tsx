import React from 'react';
import { ArrowLeft, Sparkles, Check, Lock, Trophy, BookOpen, TreePine, Compass, Target, ChevronRight } from 'lucide-react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile, CEFRLevel, GrammarTopicProgress } from '../types';
import { GRAMMAR_SYLLABUS } from '../data/grammarSyllabus';
import { NavTab } from '../components/Navigation';

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const CEFR_LEVEL_DETAILS: Record<CEFRLevel, { title: string; desc: string }> = {
  A1: { title: 'Principiante', desc: 'Frasi base quotidiane e presentazioni' },
  A2: { title: 'Elementare', desc: 'Conversazioni semplici e routine' },
  B1: { title: 'Intermedio', desc: 'Autonomia su viaggi, lavoro e opinioni' },
  B2: { title: 'Intermedio Superiore', desc: 'Fluidità spontanea e testi complessi' },
  C1: { title: 'Avanzato', desc: 'Espressione flessibile e sfumature' },
  C2: { title: 'Padronanza', desc: 'Comprensione e precisione da madrelingua' },
};

interface PathwayScreenProps {
  user: UserProfile;
  grammarProgress?: Record<string, GrammarTopicProgress>;
  readingProgress?: Record<string, { textsCompleted: number; lastReadAt?: number }>;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onOpenLevelTest: () => void;
}

export const PathwayScreen: React.FC<PathwayScreenProps> = ({
  user,
  grammarProgress = {},
  readingProgress = {},
  onClose,
  onNavigate,
  onOpenLevelTest,
}) => {
  const currentStudyLevel = (user.livelloStudioAttivo || user.currentLevel || 'A1') as CEFRLevel;
  const currentLevelIndex = Math.max(0, CEFR_LEVELS.indexOf(currentStudyLevel));
  const isMaxLevel = currentStudyLevel === 'C2' || currentLevelIndex === CEFR_LEVELS.length - 1;
  const nextLevel = !isMaxLevel ? CEFR_LEVELS[currentLevelIndex + 1] : null;

  // Objective 1: Consolidate active level (grammar topics)
  const activeLevelTopics = GRAMMAR_SYLLABUS.filter((t) => t.level === currentStudyLevel);
  const totalTopicsInActiveLevel = activeLevelTopics.length;
  const targetTopicsCount = totalTopicsInActiveLevel > 0 && totalTopicsInActiveLevel < 5 ? totalTopicsInActiveLevel : 5;
  const passedActiveLevelTopics = activeLevelTopics.filter((t) => grammarProgress[t.id]?.passed).length;
  const obj1Current = Math.min(passedActiveLevelTopics, targetTopicsCount);
  const obj1Percent = Math.min(100, Math.round((obj1Current / targetTopicsCount) * 100));
  const isObj1Complete = obj1Current >= targetTopicsCount;

  // Objective 2: Readings at active level
  const completedActiveReadings = readingProgress[currentStudyLevel]?.textsCompleted || 0;
  const obj2Target = 5;
  const obj2Current = Math.min(completedActiveReadings, obj2Target);
  const obj2Percent = Math.min(100, Math.round((obj2Current / obj2Target) * 100));
  const isObj2Complete = obj2Current >= obj2Target;

  // Objective 3: Face next level
  let obj3Current = 0;
  const obj3Target = 3;
  let isObj3Complete = false;
  let obj3Percent = 0;

  if (nextLevel) {
    const nextLevelTopics = GRAMMAR_SYLLABUS.filter((t) => t.level === nextLevel);
    const passedOrAttemptedNextTopics = nextLevelTopics.filter((t) => {
      const prog = grammarProgress[t.id];
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

  const completedObjectivesCount = (isObj1Complete ? 1 : 0) + (isObj2Complete ? 1 : 0) + (isObj3Complete ? 1 : 0);
  const allObjectivesComplete = isMaxLevel
    ? isObj1Complete && isObj2Complete
    : isObj1Complete && isObj2Complete && isObj3Complete;

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1512] text-[#F2E8D5] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Top sticky navigation bar */}
      <header className="shrink-0 bg-[#2B2622]/95 border-b border-[#6B7C4F]/30 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between z-20 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            id="btn-close-pathway"
            className="w-10 h-10 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/40 hover:border-[#E8802F] text-[#F2E8D5] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
            title="Torna alla Home"
          >
            <ArrowLeft className="w-5 h-5 text-[#F2E8D5]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[#859966] font-display">
                Mappa del Sentiero CEFR
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#6B7C4F] text-[#1A1512] text-[10px] font-black font-display">
                Livello {currentStudyLevel}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold font-display text-[#F2E8D5] leading-tight">
              Il tuo percorso
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLevelTest}
            className="px-3.5 py-1.5 rounded-xl bg-[#E8802F]/15 hover:bg-[#E8802F]/25 border border-[#E8802F]/40 text-[#E8802F] text-xs font-extrabold font-display flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test di livello</span>
            <span className="sm:hidden">Test</span>
          </button>
        </div>
      </header>

      {/* Main scrolling path canvas */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-8 max-w-2xl mx-auto w-full relative space-y-12">
        {/* Intro banner */}
        <div className="bg-[#2B2622] rounded-3xl p-5 border-2 border-[#6B7C4F]/30 shadow-xl flex items-center gap-4 relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/30 flex items-center justify-center shrink-0">
            <Compass className="w-8 h-8 text-[#E8802F]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold font-display text-[#F2E8D5]">
              {isMaxLevel
                ? 'Padronanza Livello C2'
                : `Cammino verso il livello ${nextLevel}`}
            </h2>
            <p className="text-xs text-[#F2E8D5]/70 font-medium mt-0.5">
              Completa gli obiettivi intermedi lungo il sentiero per sbloccare il checkpoint e verificare il tuo livello.
            </p>
          </div>
          <div className="hidden sm:block shrink-0">
            <span className="text-xs font-black font-display px-3 py-1.5 rounded-xl bg-[#1A1512] border border-[#6B7C4F]/30 text-[#859966]">
              {completedObjectivesCount} / {isMaxLevel ? '2' : '3'} completati
            </span>
          </div>
        </div>

        {/* Winding Vertical Path Container */}
        <div className="relative py-4 px-2">
          {/* Central Winding SVG Path Line */}
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            preserveAspectRatio="none"
            viewBox="0 0 400 1200"
          >
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6B7C4F" stopOpacity="0.8" />
                <stop offset="30%" stopColor="#E8802F" stopOpacity="0.9" />
                <stop offset="65%" stopColor="#C99A3D" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#6B7C4F" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {/* Smooth sinusoidal vertical trail line */}
            <path
              d="M 200,40 C 320,120 340,240 200,320 C 60,400 60,520 200,600 C 340,680 340,800 200,880 C 80,940 120,1050 200,1140"
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth="6"
              strokeDasharray="8 8"
              strokeLinecap="round"
            />
          </svg>

          {/* Sequential nodes in single connected vertical progression */}
          <div className="relative z-10 space-y-16">
            {/* PREVIOUS COMPLETED CEFR LEVELS (if any) */}
            {CEFR_LEVELS.slice(0, currentLevelIndex).map((lvl) => (
              <div key={lvl} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-3xl bg-[#6B7C4F] border-2 border-[#859966] text-[#1A1512] flex flex-col items-center justify-center font-black font-display shadow-lg transition-transform hover:scale-105">
                  <Check className="w-6 h-6 stroke-[3]" />
                  <span className="text-xs font-black">{lvl}</span>
                </div>
                <span className="mt-2 text-xs font-bold text-[#859966] font-display">
                  Livello {lvl} completato ✓
                </span>
              </div>
            ))}

            {/* 1. CURRENT ACTIVE CEFR LEVEL - BIG NODE WITH ROCKY */}
            <div className="flex flex-col items-center relative">
              {/* Rocky mascot sitting on active node */}
              <div className="relative -mb-4 z-20 flex flex-col items-center">
                <div className="relative animate-bounce">
                  <Mascot pose="happy" size={85} />
                  <span className="absolute -top-1 -right-1 bg-[#E8802F] text-[#1A1512] font-black text-[10px] font-display px-2 py-0.5 rounded-full shadow-md">
                    Tu sei qui!
                  </span>
                </div>
              </div>

              {/* Big active level node */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#E8802F] text-[#1A1512] border-4 border-[#F2E8D5] shadow-2xl flex flex-col items-center justify-center p-3 relative group transition-transform hover:scale-105">
                <span className="text-xs font-extrabold uppercase tracking-widest opacity-85 font-display">
                  Livello
                </span>
                <span className="text-3xl sm:text-4xl font-black font-display leading-none">
                  {currentStudyLevel}
                </span>
                <span className="text-[11px] font-bold mt-1 text-[#1A1512]/80">
                  {CEFR_LEVEL_DETAILS[currentStudyLevel]?.title || 'Attivo'}
                </span>
              </div>

              <div className="mt-3 text-center bg-[#2B2622] px-4 py-1.5 rounded-full border border-[#6B7C4F]/40 shadow-sm">
                <span className="text-xs font-extrabold text-[#F2E8D5] font-display">
                  Tana Attiva • Livello {currentStudyLevel}
                </span>
              </div>
            </div>

            {/* 2. THREE CONNECTED OBJECTIVE NODES (Winding: Left -> Right -> Center) */}
            
            {/* Objective Node 1: Consolidate Level (Curved Left) */}
            <div className="flex justify-start sm:pl-8">
              <div
                onClick={() => {
                  onClose();
                  onNavigate('grammar');
                }}
                className={`max-w-sm w-full bg-[#2B2622] rounded-3xl p-5 border-2 transition-all cursor-pointer shadow-xl group hover:scale-[1.02] ${
                  isObj1Complete
                    ? 'border-[#6B7C4F] bg-[#2B2622]'
                    : 'border-[#6B7C4F]/40 hover:border-[#6B7C4F]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold border-2 transition-transform group-hover:scale-110 ${
                      isObj1Complete
                        ? 'bg-[#6B7C4F] text-[#1A1512] border-[#859966]'
                        : 'bg-[#1A1512] text-[#859966] border-[#6B7C4F]/40'
                    }`}
                  >
                    {isObj1Complete ? <Check className="w-7 h-7 stroke-[3]" /> : <TreePine className="w-7 h-7 text-[#859966]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#859966] font-display">
                        Obiettivo 1
                      </span>
                      <span className="text-xs font-black font-display text-[#859966]">
                        {obj1Current}/{targetTopicsCount}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold font-display text-[#F2E8D5] group-hover:text-[#859966] transition-colors leading-tight mt-0.5">
                      Consolida il livello {currentStudyLevel}
                    </h3>
                    <p className="text-[11px] text-[#F2E8D5]/70 font-medium line-clamp-1 mt-0.5">
                      Supera {targetTopicsCount} argomenti di grammatica
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3.5 pt-3 border-t border-[#6B7C4F]/20">
                  <div className="progress-track h-2.5 bg-[#1A1512] border border-[#6B7C4F]/30">
                    <div
                      className="progress-fill progress-fill-muschio"
                      style={{ width: `${obj1Percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#F2E8D5]/60 mt-1.5 font-display">
                    <span>{isObj1Complete ? 'Completato ✓' : 'In corso'}</span>
                    <span className="text-[#859966] flex items-center gap-0.5">
                      Vai a grammatica <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Objective Node 2: Read at Active Level (Curved Right) */}
            <div className="flex justify-end sm:pr-8">
              <div
                onClick={() => {
                  onClose();
                  onNavigate('reading');
                }}
                className={`max-w-sm w-full bg-[#2B2622] rounded-3xl p-5 border-2 transition-all cursor-pointer shadow-xl group hover:scale-[1.02] ${
                  isObj2Complete
                    ? 'border-[#C99A3D] bg-[#2B2622]'
                    : 'border-[#6B7C4F]/40 hover:border-[#C99A3D]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold border-2 transition-transform group-hover:scale-110 ${
                      isObj2Complete
                        ? 'bg-[#C99A3D] text-[#1A1512] border-[#e0ae48]'
                        : 'bg-[#1A1512] text-[#C99A3D] border-[#6B7C4F]/40'
                    }`}
                  >
                    {isObj2Complete ? <Check className="w-7 h-7 stroke-[3]" /> : <BookOpen className="w-7 h-7 text-[#C99A3D]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C99A3D] font-display">
                        Obiettivo 2
                      </span>
                      <span className="text-xs font-black font-display text-[#C99A3D]">
                        {obj2Current}/{obj2Target}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold font-display text-[#F2E8D5] group-hover:text-[#C99A3D] transition-colors leading-tight mt-0.5">
                      Leggi al tuo livello ({currentStudyLevel})
                    </h3>
                    <p className="text-[11px] text-[#F2E8D5]/70 font-medium line-clamp-1 mt-0.5">
                      Completa 5 letture con quiz di comprensione
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3.5 pt-3 border-t border-[#6B7C4F]/20">
                  <div className="progress-track h-2.5 bg-[#1A1512] border border-[#6B7C4F]/30">
                    <div
                      className="progress-fill progress-fill-ocra"
                      style={{ width: `${obj2Percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#F2E8D5]/60 mt-1.5 font-display">
                    <span>{isObj2Complete ? 'Completato ✓' : 'In corso'}</span>
                    <span className="text-[#C99A3D] flex items-center gap-0.5">
                      Vai a letture <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Objective Node 3: Face Next Level (Curved Left / Center) */}
            {!isMaxLevel && nextLevel && (
              <div className="flex justify-start sm:pl-8">
                <div
                  onClick={() => {
                    onClose();
                    onNavigate('grammar');
                  }}
                  className={`max-w-sm w-full bg-[#2B2622] rounded-3xl p-5 border-2 transition-all cursor-pointer shadow-xl group hover:scale-[1.02] ${
                    isObj3Complete
                      ? 'border-[#E8802F] bg-[#2B2622]'
                      : 'border-[#6B7C4F]/40 hover:border-[#E8802F]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold border-2 transition-transform group-hover:scale-110 ${
                        isObj3Complete
                          ? 'bg-[#E8802F] text-[#1A1512] border-[#f0964e]'
                          : 'bg-[#1A1512] text-[#E8802F] border-[#6B7C4F]/40'
                      }`}
                    >
                      {isObj3Complete ? <Check className="w-7 h-7 stroke-[3]" /> : <Compass className="w-7 h-7 text-[#E8802F]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E8802F] font-display">
                          Obiettivo 3
                        </span>
                        <span className="text-xs font-black font-display text-[#E8802F]">
                          {obj3Current}/{obj3Target}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold font-display text-[#F2E8D5] group-hover:text-[#E8802F] transition-colors leading-tight mt-0.5">
                        Affacciati al livello {nextLevel}
                      </h3>
                      <p className="text-[11px] text-[#F2E8D5]/70 font-medium line-clamp-1 mt-0.5">
                        Affronta 3 argomenti o testi di livello {nextLevel}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3.5 pt-3 border-t border-[#6B7C4F]/20">
                    <div className="progress-track h-2.5 bg-[#1A1512] border border-[#6B7C4F]/30">
                      <div
                        className="progress-fill progress-fill-zucca"
                        style={{ width: `${obj3Percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#F2E8D5]/60 mt-1.5 font-display">
                      <span>{isObj3Complete ? 'Completato ✓' : 'In corso'}</span>
                      <span className="text-[#E8802F] flex items-center gap-0.5">
                        Esplora livello {nextLevel} <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CHECKPOINT NODE (Distinct Icon: Trophy/Flag/Target) */}
            <div className="flex flex-col items-center">
              <div
                onClick={() => {
                  if (allObjectivesComplete) {
                    onClose();
                    onOpenLevelTest();
                  }
                }}
                className={`max-w-md w-full rounded-3xl p-6 border-2 transition-all flex flex-col items-center text-center space-y-4 shadow-2xl relative overflow-hidden ${
                  allObjectivesComplete
                    ? 'bg-[#2B2622] border-[#E8802F] ring-4 ring-[#E8802F]/20 cursor-pointer group hover:scale-105'
                    : 'bg-[#2B2622]/80 border-[#6B7C4F]/30 opacity-80'
                }`}
              >
                {/* Checkpoint Badge Icon */}
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 transition-transform ${
                    allObjectivesComplete
                      ? 'bg-[#E8802F] text-[#1A1512] border-[#F2E8D5] shadow-lg scale-110 animate-pulse'
                      : 'bg-[#1A1512] text-[#F2E8D5]/40 border-[#6B7C4F]/30'
                  }`}
                >
                  {allObjectivesComplete ? (
                    <Trophy className="w-10 h-10 text-[#1A1512]" />
                  ) : (
                    <Lock className="w-8 h-8 text-[#F2E8D5]/40" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <Sparkles className={`w-4 h-4 ${allObjectivesComplete ? 'text-[#E8802F]' : 'text-[#F2E8D5]/40'}`} />
                    <span className="text-xs font-extrabold uppercase tracking-wider font-display text-[#E8802F]">
                      Checkpoint di Valutazione
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black font-display text-[#F2E8D5]">
                    {allObjectivesComplete
                      ? 'Checkpoint Sbloccato! 🎉'
                      : 'Checkpoint: Test di Livello'}
                  </h3>

                  <p className="text-xs text-[#F2E8D5]/70 font-medium max-w-xs">
                    {allObjectivesComplete
                      ? 'Hai completato tutti gli obiettivi! Sei pronto per sostenere il test di livello e misurare i tuoi progressi.'
                      : `Completa i 3 obiettivi per sbloccare il test di livello (${completedObjectivesCount}/3 completati).`}
                  </p>
                </div>

                {allObjectivesComplete ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      onOpenLevelTest();
                    }}
                    className="btn-zucca w-full py-3.5 text-sm font-black shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Avvia il Test di Livello 🎯</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      onOpenLevelTest();
                    }}
                    className="text-xs font-bold text-[#E8802F] hover:underline font-display pt-1 cursor-pointer"
                  >
                    Vuoi fare comunque il test adesso? Clicca qui →
                  </button>
                )}
              </div>
            </div>

            {/* 4. NEXT CEFR LEVEL BIG NODE (Muted if locked) */}
            {nextLevel && (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#1A1512] text-[#F2E8D5]/50 border-2 border-[#6B7C4F]/30 shadow-lg flex flex-col items-center justify-center p-2 relative">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-60 font-display">
                    Prossimo
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-display">
                    {nextLevel}
                  </span>
                  <span className="text-[10px] font-medium opacity-60">
                    {CEFR_LEVEL_DETAILS[nextLevel]?.title}
                  </span>
                </div>

                <span className="mt-2 text-xs font-extrabold text-[#F2E8D5]/50 font-display">
                  Livello {nextLevel} (Traguardo successivo)
                </span>
              </div>
            )}

            {/* 5. REMAINING CEFR LEVELS (Fading down to C2) */}
            {CEFR_LEVELS.slice(currentLevelIndex + 2).map((lvl, index) => (
              <div
                key={lvl}
                className="flex flex-col items-center"
                style={{ opacity: Math.max(0.2, 0.5 - index * 0.15) }}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#1A1512] text-[#F2E8D5]/30 border border-[#6B7C4F]/20 flex items-center justify-center font-black font-display text-sm">
                  {lvl}
                </div>
                <span className="mt-1 text-[11px] font-bold text-[#F2E8D5]/30 font-display">
                  Livello {lvl}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
export default PathwayScreen;
