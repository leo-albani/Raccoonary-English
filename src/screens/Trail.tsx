import React from 'react';
import { UserProfile, VocabItem, GrammarTopicProgress, CEFRLevel } from '../types';
import { Mascot } from '../mascot/Mascot';
import { TARGET_LANGUAGES } from '../data/languages';
import { GRAMMAR_SYLLABUS } from '../data/grammarSyllabus';
import { NavTab } from '../components/Navigation';

interface TrailProps {
  user: UserProfile;
  vocabItems: VocabItem[];
  grammarProgress: Record<string, GrammarTopicProgress>;
  readingProgress?: Record<string, { textsCompleted: number; lastReadAt?: number }>;
  onNavigate: (tab: NavTab) => void;
  onOpenLevelTest: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const Trail: React.FC<TrailProps> = ({
  user,
  vocabItems,
  grammarProgress,
  readingProgress = {},
  onNavigate,
  onOpenLevelTest,
  t,
}) => {
  const activeLang = TARGET_LANGUAGES.find((l) => l.code === (user.activeProfileId || 'en')) || {
    code: 'en',
    name: 'Inglese',
    flag: '🇬🇧',
  };

  const dueItems = vocabItems.filter((i) => i.nextReviewAt <= Date.now());
  const passedGrammarCount = (Object.values(grammarProgress || {}) as GrammarTopicProgress[]).filter((p) => p?.passed).length;
  
  // Active study level
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
  let obj3Target = 3;
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
    // Max level C2
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

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* Screen Header */}
      <div className="flex items-center justify-between gap-4 bg-white/70 backdrop-blur-xs p-5 rounded-3xl border border-[#6B7C4F]/20 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-leaf">Percorso di Studio</span>
            <span className="text-xs font-bold text-[#6B7C4F] font-display flex items-center gap-1">
              <span>{activeLang.flag}</span>
              <span>{activeLang.name}</span>
            </span>
            <span className="bg-[#6B7C4F] text-white text-[10px] font-black px-2 py-0.5 rounded-full font-display">
              Livello {currentStudyLevel} 🎯
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22]">
            Il tuo Sentiero 🧭
          </h1>
          <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium">
            Segui le tappe del tuo percorso verso il livello successivo e allena le tue abilità.
          </p>
        </div>

        <div className="hidden sm:block shrink-0">
          <Mascot pose="reading" size={75} activeOutfit={user.activeOutfit} />
        </div>
      </div>

      {/* 1. Sentiero visivo dei livelli CEFR */}
      <div className="bento-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B7C4F] font-display">
              Sentiero dei Livelli CEFR
            </span>
          </div>
          <span className="text-xs font-bold text-[#3A2B22]/70 font-display">
            Attivo: <strong className="text-[#6B7C4F]">{currentStudyLevel}</strong>
          </span>
        </div>

        <div className="relative pt-6 pb-2">
          {/* Connector Line */}
          <div className="absolute top-11 left-6 right-6 h-1.5 bg-[#6B7C4F]/20 rounded-full z-0" />
          <div
            className="absolute top-11 left-6 h-1.5 bg-[#6B7C4F] rounded-full z-0 transition-all duration-500"
            style={{
              width: `${(currentLevelIndex / (CEFR_LEVELS.length - 1)) * 100}%`,
              maxWidth: 'calc(100% - 3rem)',
            }}
          />

          {/* Stepper Nodes */}
          <div className="relative z-10 flex justify-between items-start">
            {CEFR_LEVELS.map((lvl, idx) => {
              const isPast = idx < currentLevelIndex;
              const isCurrent = idx === currentLevelIndex;
              const isFuture = idx > currentLevelIndex;

              return (
                <div key={lvl} className="flex flex-col items-center group relative">
                  {/* Rocky Mascot above current node */}
                  {isCurrent && (
                    <div className="absolute -top-7.5 animate-bounce flex flex-col items-center">
                      <span className="text-base sm:text-lg leading-none select-none">🦝</span>
                      <span className="text-[9px] font-black font-display text-[#E8802F] bg-white px-1.5 py-0.2 rounded-full shadow-2xs border border-[#E8802F]/30 -mt-0.5">
                        Tu
                      </span>
                    </div>
                  )}

                  {/* Level Circle Node */}
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black font-display text-xs sm:text-sm transition-all duration-300 ${
                      isCurrent
                        ? 'bg-[#6B7C4F] text-white ring-4 ring-[#6B7C4F]/30 shadow-md scale-110'
                        : isPast
                        ? 'bg-[#6B7C4F] text-white shadow-xs'
                        : 'bg-white border-2 border-[#6B7C4F]/25 text-[#3A2B22]/40'
                    }`}
                  >
                    {isPast ? (
                      <span className="text-sm">✓</span>
                    ) : (
                      <span>{lvl}</span>
                    )}
                  </div>

                  {/* Level Label below */}
                  <div className="mt-2 text-center">
                    <span
                      className={`text-[11px] sm:text-xs font-bold font-display ${
                        isCurrent
                          ? 'text-[#6B7C4F]'
                          : isPast
                          ? 'text-[#3A2B22]'
                          : 'text-[#3A2B22]/40'
                      }`}
                    >
                      {lvl}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Checklist "Il tuo cammino verso [livello successivo]" */}
      <div className="bento-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-2 border-b border-[#6B7C4F]/10 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-[#3A2B22] flex items-center gap-2">
              <span>📋</span>
              <span>
                {isMaxLevel
                  ? 'Il tuo cammino al vertice (Livello C2)'
                  : `Il tuo cammino verso il livello ${nextLevel}`}
              </span>
            </h2>
            <p className="text-xs text-[#3A2B22]/70 font-medium mt-0.5">
              {isMaxLevel
                ? 'Hai raggiunto il livello massimo del quadro europeo! Continua a consolidare le tue competenze.'
                : `Completa questi 3 obiettivi per prepararti al salto verso il livello ${nextLevel}.`}
            </p>
          </div>

          <span className="badge-leaf bg-[#6B7C4F]/15 text-[#6B7C4F] shrink-0">
            {allObjectivesComplete ? 'Obiettivi completati 🎉' : 'In corso'}
          </span>
        </div>

        <div className="space-y-4">
          {/* Obiettivo 1: Consolida il livello attivo */}
          <div className="p-4 rounded-2xl border border-[#6B7C4F]/20 bg-[#F2E8D5]/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{isObj1Complete ? '✅' : '🌲'}</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold font-display text-[#3A2B22]">
                    1. Consolida il livello {currentStudyLevel}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#3A2B22]/70">
                    Supera almeno {targetTopicsCount} argomenti di grammatica del livello {currentStudyLevel}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black font-display text-[#6B7C4F] shrink-0">
                {obj1Current}/{targetTopicsCount}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#6B7C4F]/15 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#6B7C4F] h-full rounded-full transition-all duration-500"
                style={{ width: `${obj1Percent}%` }}
              />
            </div>
          </div>

          {/* Obiettivo 2: Leggi al tuo livello */}
          <div className="p-4 rounded-2xl border border-[#6B7C4F]/20 bg-[#F2E8D5]/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{isObj2Complete ? '✅' : '📚'}</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold font-display text-[#3A2B22]">
                    2. Leggi al tuo livello ({currentStudyLevel})
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#3A2B22]/70">
                    Completa almeno 5 letture con quiz di comprensione di livello {currentStudyLevel}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black font-display text-[#C99A3D] shrink-0">
                {obj2Current}/{obj2Target}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#C99A3D]/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#C99A3D] h-full rounded-full transition-all duration-500"
                style={{ width: `${obj2Percent}%` }}
              />
            </div>
          </div>

          {/* Obiettivo 3: Affacciati al livello successivo (o congratulazioni per C2) */}
          {!isMaxLevel && nextLevel ? (
            <div className="p-4 rounded-2xl border border-[#6B7C4F]/20 bg-[#F2E8D5]/30 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{isObj3Complete ? '✅' : '🔭'}</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold font-display text-[#3A2B22]">
                      3. Affacciati al livello {nextLevel}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#3A2B22]/70">
                      Affronta almeno 3 argomenti di grammatica o letture di livello {nextLevel}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black font-display text-[#E8802F] shrink-0">
                  {obj3Current}/{obj3Target}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#E8802F]/20 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#E8802F] h-full rounded-full transition-all duration-500"
                  style={{ width: `${obj3Percent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-[#6B7C4F]/30 bg-[#6B7C4F]/10 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold font-display text-[#6B7C4F]">
                  Traguardo Massimo Raggiunto (C2)
                </h3>
                <p className="text-[11px] sm:text-xs text-[#3A2B22]/75">
                  Sei al massimo livello del quadro europeo. Continua a coltivare vocaboli e letture per mantenere fluida la tua padronanza!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3. Suggerimento di rifare il test / Data ultimo test */}
        {allObjectivesComplete ? (
          <div className="p-5 rounded-2xl border-2 border-[#E8802F] bg-[#E8802F]/10 space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="text-sm sm:text-base font-bold font-display text-[#3A2B22]">
                  Sembra il momento giusto per scoprire se sei salito di livello!
                </h3>
                <p className="text-xs text-[#3A2B22]/80 font-medium">
                  Hai completato tutti gli obiettivi di consolidamento e avanzamento del livello {currentStudyLevel}.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenLevelTest}
              className="btn-zucca w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>Fai il Test di Livello Adattivo 🎯</span>
            </button>
          </div>
        ) : (
          <div className="pt-2 flex items-center justify-between text-xs text-[#3A2B22]/60 border-t border-[#6B7C4F]/10">
            <span className="font-medium">
              {formattedLastTestDate ? `Ultimo test effettuato: ${formattedLastTestDate}` : 'Nessun test recente completato'}
            </span>
            <button
              onClick={onOpenLevelTest}
              className="text-[#6B7C4F] hover:underline font-bold font-display cursor-pointer"
            >
              Rifai il test in qualsiasi momento →
            </button>
          </div>
        )}
      </div>

      {/* Main Activity Cards */}
      <div className="space-y-2">
        <h2 className="text-base font-bold font-display text-[#3A2B22] px-1">
          Attività del Sentiero
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Ripasso Vocaboli Card */}
          <div
            onClick={() => onNavigate('memorize')}
            className="bento-card p-5 border-2 border-[#6B7C4F]/30 hover:border-[#6B7C4F] cursor-pointer flex flex-col justify-between group transition-all relative overflow-hidden bg-gradient-to-br from-white to-[#6B7C4F]/5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#E8802F]/15 text-[#E8802F] flex items-center justify-center text-2xl font-bold shadow-2xs">
                  ⚡
                </div>
                <span className="badge-leaf bg-[#E8802F] text-white font-display">
                  {dueItems.length > 0 ? `${dueItems.length} pronte` : 'In pari ✓'}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold font-display text-[#3A2B22] group-hover:text-[#E8802F] transition-colors">
                  Ripasso Vocaboli
                </h3>
                <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium mt-1">
                  Allena la memoria a lungo termine con il sistema di ripetizione spaziata (Spaced Repetition).
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7C4F] font-display">
                {vocabItems.length} vocaboli in tana
              </span>
              <span className="text-sm font-bold text-[#E8802F] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Inizia ripasso →
              </span>
            </div>
          </div>

          {/* 2. Grammatica Card */}
          <div
            onClick={() => onNavigate('grammar')}
            className="bento-card p-5 border-2 border-[#6B7C4F]/30 hover:border-[#6B7C4F] cursor-pointer flex flex-col justify-between group transition-all relative overflow-hidden bg-gradient-to-br from-white to-[#6B7C4F]/5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#6B7C4F]/15 text-[#6B7C4F] flex items-center justify-center text-2xl font-bold shadow-2xs">
                  🌲
                </div>
                <span className="badge-leaf">Syllabus A1–C2</span>
              </div>

              <div>
                <h3 className="text-xl font-bold font-display text-[#3A2B22] group-hover:text-[#6B7C4F] transition-colors">
                  Grammatica
                </h3>
                <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium mt-1">
                  Percorso strutturato di regole, schede teoriche ed esercizi guidati con feedback immediato.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7C4F] font-display">
                {passedGrammarCount} argomenti superati
              </span>
              <span className="text-sm font-bold text-[#6B7C4F] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Apri grammatica →
              </span>
            </div>
          </div>

          {/* 3. Letture Card */}
          <div
            onClick={() => onNavigate('reading')}
            className="bento-card p-5 border-2 border-[#6B7C4F]/30 hover:border-[#6B7C4F] cursor-pointer flex flex-col justify-between group transition-all relative overflow-hidden bg-gradient-to-br from-white to-[#6B7C4F]/5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#C99A3D]/20 text-[#C99A3D] flex items-center justify-center text-2xl font-bold shadow-2xs">
                  📚
                </div>
                <span className="badge-leaf bg-[#C99A3D] text-white">Comprensione</span>
              </div>

              <div>
                <h3 className="text-xl font-bold font-display text-[#3A2B22] group-hover:text-[#C99A3D] transition-colors">
                  Letture & Comprensione
                </h3>
                <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium mt-1">
                  Brani interattivi parametrati sul tuo livello. Tocca qualsiasi vocabolo per scoprirne traduzione e grammatica.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#3A2B22]/70 font-display">
                Livello: {currentStudyLevel}
              </span>
              <span className="text-sm font-bold text-[#C99A3D] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Leggi ora →
              </span>
            </div>
          </div>

          {/* 4. Pronuncia Card */}
          <div
            onClick={() => onNavigate('pronunciation')}
            className="bento-card p-5 border-2 border-[#6B7C4F]/30 hover:border-[#6B7C4F] cursor-pointer flex flex-col justify-between group transition-all relative overflow-hidden bg-gradient-to-br from-white to-[#6B7C4F]/5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#E8802F]/15 text-[#E8802F] flex items-center justify-center text-2xl font-bold shadow-2xs">
                  🎙️
                </div>
                <span className="badge-leaf bg-[#6B7C4F] text-white">Ascolto & Voce</span>
              </div>

              <div>
                <h3 className="text-xl font-bold font-display text-[#3A2B22] group-hover:text-[#E8802F] transition-colors">
                  Pronuncia
                </h3>
                <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium mt-1">
                  Ascolta la pronuncia madrelingua, registrati e confronta il tuo audio per affinare l'accento.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-[#3A2B22]/70 font-display">
                Sessioni interattive
              </span>
              <span className="text-sm font-bold text-[#E8802F] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Allena la voce →
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
