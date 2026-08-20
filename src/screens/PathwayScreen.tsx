import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Check,
  Lock,
  Trophy,
  BookOpen,
  TreePine,
  Compass,
  Target,
  ChevronRight,
  RotateCcw,
  Play,
  Layers,
} from 'lucide-react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile, CEFRLevel, GrammarTopicProgress, VocabItem, LessonPath, LessonItem, GrammarTopic, ExerciseError } from '../types';
import { GRAMMAR_SYLLABUS } from '../data/grammarSyllabus';
import { NavTab } from '../components/Navigation';
import { GuidedLessonModal } from '../components/pathway/GuidedLessonModal';
import { CheckpointModal } from '../components/pathway/CheckpointModal';
import { MiniTestModal } from '../components/pathway/MiniTestModal';
import { createDefaultLessonPath } from '../services/lessonPathGenerator';
import { fetchLessonPath, saveLessonPath, resetLessonPath } from '../services/firebase';
import { playSound } from '../services/sound';

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
  vocabItems?: VocabItem[];
  grammarProgress?: Record<string, GrammarTopicProgress>;
  readingProgress?: Record<string, { textsCompleted: number; lastReadAt?: number }>;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onOpenLevelTest: () => void;
  onSaveVocabItem?: (item: VocabItem) => void;
  onDeleteVocabItem?: (id: string) => void;
  onSaveExerciseError?: (item: ExerciseError) => void;
  onUpdateGrammarProgress?: (progress: GrammarTopicProgress) => void;
  onCompleteReading?: (level: CEFRLevel) => void;
}

export const PathwayScreen: React.FC<PathwayScreenProps> = ({
  user,
  vocabItems = [],
  grammarProgress = {},
  readingProgress = {},
  onClose,
  onNavigate,
  onOpenLevelTest,
  onSaveVocabItem = () => {},
  onDeleteVocabItem,
  onSaveExerciseError,
  onUpdateGrammarProgress,
  onCompleteReading,
}) => {
  const currentStudyLevel = (user.livelloStudioAttivo || user.currentLevel || 'A1') as CEFRLevel;
  const currentLevelIndex = Math.max(0, CEFR_LEVELS.indexOf(currentStudyLevel));
  const isMaxLevel = currentStudyLevel === 'C2' || currentLevelIndex === CEFR_LEVELS.length - 1;
  const nextLevel = !isMaxLevel ? CEFR_LEVELS[currentLevelIndex + 1] : null;
  const targetLanguage = user.activeProfileId || 'en';

  // Guided Path State
  const [lessonPath, setLessonPath] = useState<LessonPath | null>(null);
  const [loadingPath, setLoadingPath] = useState<boolean>(true);

  // Modals
  const [activeLesson, setActiveLesson] = useState<LessonItem | null>(null);
  const [showCheckpointModal, setShowCheckpointModal] = useState<boolean>(false);
  const [showMiniTestModal, setShowMiniTestModal] = useState<boolean>(false);

  // Load or Initialize Path
  useEffect(() => {
    let isMounted = true;

    async function loadOrCreatePath() {
      setLoadingPath(true);
      try {
        const existing = await fetchLessonPath(user.userId, targetLanguage);
        if (existing && existing.livelloTarget === currentStudyLevel && existing.lezioni && existing.lezioni.length === 8) {
          if (isMounted) {
            setLessonPath(existing);
          }
        } else {
          // Generate fresh path for this level
          const newPath = createDefaultLessonPath(
            currentStudyLevel,
            GRAMMAR_SYLLABUS,
            grammarProgress,
            vocabItems
          );
          await saveLessonPath(user.userId, targetLanguage, newPath);
          if (isMounted) {
            setLessonPath(newPath);
          }
        }
      } catch (err) {
        console.error('Error loading lesson path:', err);
        const fallback = createDefaultLessonPath(
          currentStudyLevel,
          GRAMMAR_SYLLABUS,
          grammarProgress,
          vocabItems
        );
        if (isMounted) {
          setLessonPath(fallback);
        }
      } finally {
        if (isMounted) setLoadingPath(false);
      }
    }

    loadOrCreatePath();
    return () => {
      isMounted = false;
    };
  }, [user.userId, targetLanguage, currentStudyLevel]);

  // "Rinforza" action: Generate fresh 8-lesson sequence at same level
  const handleReinforcePath = async () => {
    playSound('acorn');
    setLoadingPath(true);
    try {
      const freshPath = createDefaultLessonPath(
        currentStudyLevel,
        GRAMMAR_SYLLABUS,
        grammarProgress,
        vocabItems
      );
      await saveLessonPath(user.userId, targetLanguage, freshPath);
      setLessonPath(freshPath);
      setShowCheckpointModal(false);
      setShowMiniTestModal(false);
    } catch (e) {
      console.error('Error reinforcing path:', e);
    } finally {
      setLoadingPath(false);
    }
  };

  // Lesson Completion Handler
  const handleLessonComplete = async (lessonId: string) => {
    if (!lessonPath) return;

    const updatedLezioni = lessonPath.lezioni.map((l) =>
      l.id === lessonId ? { ...l, stato: 'completata' as const } : l
    );

    const updatedPath: LessonPath = {
      ...lessonPath,
      lezioni: updatedLezioni,
    };

    setLessonPath(updatedPath);
    setActiveLesson(null);
    await saveLessonPath(user.userId, targetLanguage, updatedPath);
  };

  // Checkpoint Completion Handler
  const handleCheckpointComplete = async (passed: boolean, score: number) => {
    if (!lessonPath) return;
    const updated: LessonPath = {
      ...lessonPath,
      checkpointSuperato: passed,
    };
    setLessonPath(updated);
    await saveLessonPath(user.userId, targetLanguage, updated);
  };

  // Mini-Test Completion Handler
  const handleMiniTestComplete = async (passed: boolean, score: number) => {
    if (!lessonPath) return;
    const updated: LessonPath = {
      ...lessonPath,
      miniTestSuperato: passed,
    };
    setLessonPath(updated);
    await saveLessonPath(user.userId, targetLanguage, updated);
  };

  // Calculations
  const lezioni = lessonPath?.lezioni || [];
  const completedCount = lezioni.filter((l) => l.stato === 'completata').length;
  const progressPercent = Math.min(100, Math.round((completedCount / 8) * 100));
  const allLessonsCompleted = completedCount >= 8;

  // Topics summary for checkpoint generator
  const topicsSummary = lezioni.map((l) => `${l.tipo}: ${l.title || l.argomentoRiferimento}`);

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1512] text-[#F2E8D5] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Top sticky navigation bar */}
      {/* Header with prominent Back Button to Tana */}
      <header className="shrink-0 bg-[#2B2622]/95 border-b border-[#6B7C4F]/30 backdrop-blur-md px-3 sm:px-6 py-3 flex items-center justify-between z-20 shadow-lg sticky top-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            id="btn-close-pathway"
            className="px-3 sm:px-4 py-2 rounded-2xl bg-[#1A1512] border-2 border-[#6B7C4F]/40 hover:border-[#E8802F] text-[#F2E8D5] flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all active:scale-95 shadow-md group"
            title="Indietro"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8802F] group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-extrabold font-display text-xs sm:text-sm">Indietro</span>
          </button>

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#859966] font-display">
                Percorso Guidato CEFR
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#6B7C4F] text-[#1A1512] text-[10px] font-black font-display">
                Livello {currentStudyLevel}
              </span>
            </div>
            <h1 className="text-sm font-extrabold font-display text-[#F2E8D5] leading-tight flex items-center gap-1.5">
              <span>Mappa di Gioco</span>
              <span className="text-xs font-bold text-[#859966] font-display">
                ({completedCount}/8 superate)
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reinforce button */}
          <button
            type="button"
            onClick={handleReinforcePath}
            title="Genera un nuovo percorso di 8 lezioni a questo livello"
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1A1512] hover:bg-[#2B2622] border border-[#6B7C4F]/40 text-[#859966] hover:text-[#F2E8D5] text-xs font-extrabold font-display flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rinforza</span>
          </button>

          {/* Level Test Button */}
          <button
            type="button"
            onClick={onOpenLevelTest}
            className="px-3 py-1.5 rounded-xl bg-[#E8802F]/15 hover:bg-[#E8802F]/25 border border-[#E8802F]/40 text-[#E8802F] text-xs font-extrabold font-display flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test di livello</span>
            <span className="sm:hidden">Test</span>
          </button>
        </div>
      </header>

      {/* Main scrolling path canvas */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 max-w-lg mx-auto w-full relative space-y-8">
        {/* Compact Path Status Banner */}
        <div className="bg-[#2B2622] rounded-2xl p-3.5 sm:p-4 border border-[#6B7C4F]/30 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">🧭</span>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black font-display text-[#F2E8D5] truncate">
                {isMaxLevel ? 'Padronanza Livello C2' : `Percorso verso il livello ${nextLevel || 'C2'}`}
              </h2>
              <p className="text-[11px] text-[#F2E8D5]/65 font-medium truncate">
                8 lezioni sequenziali + Checkpoint
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-black font-display text-[#E8802F]">
              {completedCount}/8
            </span>
            <div className="w-12 sm:w-16 h-2 bg-[#1A1512] rounded-full border border-[#6B7C4F]/30 overflow-hidden">
              <div
                className="h-full bg-[#E8802F] transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Winding Mountain Trail */}
        <div className="relative py-4 px-2">
          {/* Dynamic SVG Trail Background */}
          {(() => {
            const xCoords = [50, 32, 46, 72, 54, 28, 44, 74, 36, 50, 50];
            const totalNodes = lezioni.length + 2 + (nextLevel ? 1 : 0);
            const rowHeight = 110;
            const totalHeight = totalNodes * rowHeight;

            // Generate SVG paths
            let fullPathD = `M ${xCoords[0]} ${rowHeight * 0.5}`;
            for (let i = 0; i < totalNodes - 1; i++) {
              const x0 = xCoords[i % xCoords.length];
              const y0 = i * rowHeight + rowHeight * 0.5;
              const x1 = xCoords[(i + 1) % xCoords.length];
              const y1 = (i + 1) * rowHeight + rowHeight * 0.5;
              const cy1 = y0 + (y1 - y0) * 0.5;
              const cy2 = y1 - (y1 - y0) * 0.5;
              fullPathD += ` C ${x0} ${cy1}, ${x1} ${cy2}, ${x1} ${y1}`;
            }

            // Calculate completed segments for illuminated path
            let completedSegments = 0;
            for (let i = 0; i < lezioni.length; i++) {
              if (lezioni[i].stato === 'completata') {
                completedSegments = i + 1;
              } else {
                break;
              }
            }
            if (lessonPath?.checkpointSuperato) {
              completedSegments = lezioni.length + 1;
            }

            let completedPathD = `M ${xCoords[0]} ${rowHeight * 0.5}`;
            for (let i = 0; i < Math.min(completedSegments, totalNodes - 1); i++) {
              const x0 = xCoords[i % xCoords.length];
              const y0 = i * rowHeight + rowHeight * 0.5;
              const x1 = xCoords[(i + 1) % xCoords.length];
              const y1 = (i + 1) * rowHeight + rowHeight * 0.5;
              const cy1 = y0 + (y1 - y0) * 0.5;
              const cy2 = y1 - (y1 - y0) * 0.5;
              completedPathD += ` C ${x0} ${cy1}, ${x1} ${cy2}, ${x1} ${y1}`;
            }

            return (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                viewBox={`0 0 100 ${totalHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <filter id="zucca-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="trail-active-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8802F" />
                    <stop offset="100%" stopColor="#859966" />
                  </linearGradient>
                </defs>

                {/* Base Shadow & Outer Bed */}
                <path
                  d={fullPathD}
                  fill="none"
                  stroke="#1A1512"
                  strokeWidth="16"
                  strokeLinecap="round"
                />

                {/* Trail Bed */}
                <path
                  d={fullPathD}
                  fill="none"
                  stroke="#2B2622"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Forest dashed trail markings */}
                <path
                  d={fullPathD}
                  fill="none"
                  stroke="#6B7C4F"
                  strokeOpacity="0.45"
                  strokeWidth="4"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                />

                {/* Stepping stone dots */}
                <path
                  d={fullPathD}
                  fill="none"
                  stroke="#C99A3D"
                  strokeOpacity="0.3"
                  strokeWidth="2"
                  strokeDasharray="1 6"
                  strokeLinecap="round"
                />

                {/* Completed / Active Trail with energetic glow */}
                {completedSegments > 0 && (
                  <>
                    <path
                      d={completedPathD}
                      fill="none"
                      stroke="#E8802F"
                      strokeWidth="5"
                      strokeLinecap="round"
                      filter="url(#zucca-glow)"
                    />
                    <path
                      d={completedPathD}
                      fill="none"
                      stroke="#F2E8D5"
                      strokeWidth="1.5"
                      strokeDasharray="3 4"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </svg>
            );
          })()}

          {/* Sequential Game Nodes positioned along the trail */}
          <div className="relative z-10">
            {/* 1. CURRENT ACTIVE CEFR LEVEL - STARTING BADGE (Node 0: x=50%) */}
            <div className="h-[110px] flex items-center justify-center relative">
              <div className="flex flex-col items-center relative">
                <div className="relative animate-bounce mb-1">
                  <Mascot pose="happy" size={54} />
                </div>

                {/* Start node */}
                <div className="px-4 py-1.5 rounded-full bg-[#E8802F] text-[#1A1512] border-2 border-[#F2E8D5] shadow-lg flex items-center gap-2 font-display">
                  <span className="text-xs font-black">START</span>
                  <span className="text-xs font-bold opacity-80">•</span>
                  <span className="text-xs font-black">Livello {currentStudyLevel}</span>
                </div>
              </div>
            </div>

            {/* 2. THE 8 SEQUENTIAL GUIDED LESSON NODES */}
            {loadingPath ? (
              <div className="py-16 text-center">
                <p className="text-xs font-bold text-[#859966] font-display animate-pulse">
                  Caricamento del sentiero guidato...
                </p>
              </div>
            ) : (
              lezioni.map((lesson, idx) => {
                const xCoords = [32, 46, 72, 54, 28, 44, 74, 36];
                const xPos = xCoords[idx % xCoords.length];
                const isFirst = idx === 0;
                const prevLesson = idx > 0 ? lezioni[idx - 1] : null;
                const isUnlocked = isFirst || (prevLesson && prevLesson.stato === 'completata');
                const isCompleted = lesson.stato === 'completata';
                const isNextUp = isUnlocked && !isCompleted;

                // Type Icon
                let typeEmoji = '🌲';
                let typeLabel = 'Grammatica';
                if (lesson.tipo === 'vocabolario') {
                  typeEmoji = '🌰';
                  typeLabel = 'Vocab';
                } else if (lesson.tipo === 'lettura') {
                  typeEmoji = '📚';
                  typeLabel = 'Lettura';
                }

                return (
                  <div
                    key={lesson.id}
                    className="h-[110px] relative flex items-center"
                  >
                    <div
                      style={{ left: `${xPos}%`, transform: 'translateX(-50%)' }}
                      className="absolute flex flex-col items-center"
                    >
                      <div
                        onClick={() => {
                          if (isUnlocked) {
                            setActiveLesson(lesson);
                          }
                        }}
                        className={`flex flex-col items-center transition-all ${
                          isUnlocked ? 'cursor-pointer group' : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {/* Interactive circular game node */}
                        <div className="relative">
                          {isNextUp && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#E8802F] text-[#1A1512] font-black text-[10px] font-display px-2 py-0.5 rounded-full shadow-md whitespace-nowrap animate-bounce z-10">
                              Tocca per iniziare!
                            </span>
                          )}

                          <div
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-3 transition-transform shadow-lg ${
                              isCompleted
                                ? 'bg-[#6B7C4F] text-[#1A1512] border-[#859966] group-hover:scale-105'
                                : isNextUp
                                ? 'bg-[#E8802F] text-[#1A1512] border-[#F2E8D5] ring-4 ring-[#E8802F]/30 group-hover:scale-110 shadow-xl'
                                : 'bg-[#1A1512] text-[#F2E8D5]/30 border-[#6B7C4F]/25'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-7 h-7 stroke-[3] text-[#1A1512]" />
                            ) : isUnlocked ? (
                              <span className="text-2xl">{typeEmoji}</span>
                            ) : (
                              <Lock className="w-5 h-5 text-[#F2E8D5]/35" />
                            )}
                          </div>
                        </div>

                        {/* Compact text pill below the node */}
                        <div className="mt-1 text-center max-w-[140px] sm:max-w-[160px] bg-[#1A1512]/80 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-[#6B7C4F]/20">
                          <span
                            className={`text-[11px] font-black font-display block leading-tight ${
                              isCompleted
                                ? 'text-[#859966]'
                                : isNextUp
                                ? 'text-[#E8802F] group-hover:underline'
                                : 'text-[#F2E8D5]/60'
                            }`}
                          >
                            {lesson.ordine}. {typeLabel}
                          </span>
                          <span className="text-[10px] text-[#F2E8D5]/80 font-medium truncate block">
                            {lesson.title}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* 3. CHECKPOINT NODE (Node 9: x=50%) */}
            <div className="h-[110px] relative flex items-center justify-center">
              <div
                onClick={() => {
                  if (allLessonsCompleted) {
                    setShowCheckpointModal(true);
                  }
                }}
                className={`flex flex-col items-center transition-all ${
                  allLessonsCompleted ? 'cursor-pointer group' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-16 h-16 sm:w-18 sm:h-18 rounded-3xl flex items-center justify-center border-3 transition-transform shadow-xl ${
                    lessonPath?.checkpointSuperato === true
                      ? 'bg-[#6B7C4F] text-[#1A1512] border-[#859966] group-hover:scale-105'
                      : allLessonsCompleted
                      ? 'bg-[#E8802F] text-[#1A1512] border-[#F2E8D5] ring-4 ring-[#E8802F]/30 animate-pulse group-hover:scale-110'
                      : 'bg-[#1A1512] text-[#F2E8D5]/35 border-[#6B7C4F]/30'
                  }`}
                >
                  {lessonPath?.checkpointSuperato === true ? (
                    <Check className="w-8 h-8 stroke-[3] text-[#1A1512]" />
                  ) : allLessonsCompleted ? (
                    <Trophy className="w-8 h-8 text-[#1A1512]" />
                  ) : (
                    <Lock className="w-6 h-6 text-[#F2E8D5]/40" />
                  )}
                </div>

                <div className="mt-1 text-center max-w-[180px] bg-[#1A1512]/80 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-[#6B7C4F]/20">
                  <span
                    className={`text-xs font-black font-display block leading-tight ${
                      lessonPath?.checkpointSuperato === true
                        ? 'text-[#859966]'
                        : allLessonsCompleted
                        ? 'text-[#E8802F]'
                        : 'text-[#F2E8D5]/60'
                    }`}
                  >
                    {lessonPath?.checkpointSuperato === true
                      ? 'Checkpoint Superato ✓'
                      : 'Checkpoint (10 Domande)'}
                  </span>
                  <span className="text-[10px] text-[#F2E8D5]/80 font-medium block">
                    {allLessonsCompleted ? 'Tocca per avviare il test' : `${completedCount}/8 lezioni completate`}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. NEXT CEFR GOAL / LEVEL TEST COMPACT NODE (Node 10: x=50%) */}
            {nextLevel && (
              <div className="h-[110px] relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={onOpenLevelTest}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#1A1512] text-[#E8802F] border-2 border-[#E8802F]/40 group-hover:border-[#E8802F] flex items-center justify-center font-black font-display text-base shadow-md group-hover:scale-105 transition-transform">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="mt-1 text-center bg-[#1A1512]/80 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-[#6B7C4F]/20">
                    <span className="text-xs font-black text-[#F2E8D5]/90 group-hover:text-[#E8802F] transition-colors font-display block">
                      Test Livello {nextLevel}
                    </span>
                    <span className="text-[10px] text-[#859966] font-medium block">
                      Sblocca il prossimo livello →
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Guided Lesson Interactive Modal */}
      {activeLesson && (
        <GuidedLessonModal
          lesson={activeLesson}
          user={user}
          vocabItems={vocabItems}
          allGrammarTopics={GRAMMAR_SYLLABUS}
          grammarProgress={grammarProgress}
          onComplete={handleLessonComplete}
          onClose={() => setActiveLesson(null)}
          onSaveVocabItem={onSaveVocabItem}
          onDeleteVocabItem={onDeleteVocabItem}
          onSaveExerciseError={onSaveExerciseError}
          onUpdateGrammarProgress={onUpdateGrammarProgress}
          onCompleteReading={onCompleteReading}
        />
      )}

      {/* Checkpoint Modal */}
      {showCheckpointModal && (
        <CheckpointModal
          level={currentStudyLevel}
          topicsSummary={topicsSummary}
          user={user}
          onComplete={handleCheckpointComplete}
          onClose={() => setShowCheckpointModal(false)}
          onStartMiniTest={() => {
            setShowCheckpointModal(false);
            setShowMiniTestModal(true);
          }}
          onReinforce={handleReinforcePath}
          onSaveExerciseError={onSaveExerciseError}
        />
      )}

      {/* Mini-Test Modal */}
      {showMiniTestModal && (
        <MiniTestModal
          currentLevel={currentStudyLevel}
          nextLevel={nextLevel || 'C2'}
          user={user}
          onComplete={handleMiniTestComplete}
          onClose={() => setShowMiniTestModal(false)}
          onOpenRealLevelTest={() => {
            setShowMiniTestModal(false);
            onOpenLevelTest();
          }}
          onReinforce={handleReinforcePath}
          onSaveExerciseError={onSaveExerciseError}
        />
      )}
    </div>
  );
};

export default PathwayScreen;
