import React, { useState, useEffect } from 'react';
import { X, Volume2, Star, Check, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { Mascot } from '../../mascot/Mascot';
import { LessonItem, UserProfile, VocabItem, ExerciseError, GrammarTopic, GrammarTopicProgress, CEFRLevel, Exercise, ReadingText } from '../../types';
import { GRAMMAR_SYLLABUS } from '../../data/grammarSyllabus';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../../data/languages';
import { generateGrammarExercises, generateReadingText, explainWordInContext } from '../../services/gemini';
import { playSound } from '../../services/sound';

interface GuidedLessonModalProps {
  lesson: LessonItem;
  user: UserProfile;
  vocabItems: VocabItem[];
  allGrammarTopics?: GrammarTopic[];
  grammarProgress?: Record<string, GrammarTopicProgress>;
  onComplete: (lessonId: string) => void;
  onClose: () => void;
  onSaveVocabItem: (item: VocabItem) => void;
  onSaveExerciseError?: (item: ExerciseError) => void;
  onUpdateGrammarProgress?: (progress: GrammarTopicProgress) => void;
  onCompleteReading?: (level: CEFRLevel) => void;
}

export const GuidedLessonModal: React.FC<GuidedLessonModalProps> = ({
  lesson,
  user,
  vocabItems,
  allGrammarTopics = GRAMMAR_SYLLABUS,
  grammarProgress = {},
  onComplete,
  onClose,
  onSaveVocabItem,
  onSaveExerciseError,
  onUpdateGrammarProgress,
  onCompleteReading,
}) => {
  const currentStudyLevel = (user.livelloStudioAttivo || user.currentLevel || 'A1') as CEFRLevel;
  const targetLang = user.activeProfileId || 'en';
  const nativeLang = user.nativeLanguage || 'it';
  const targetName = TARGET_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang.toUpperCase();
  const nativeName = NATIVE_LANGUAGES.find((l) => l.code === nativeLang)?.name || nativeLang.toUpperCase();

  // State
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // Vocab Lesson State
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [vocabIndex, setVocabIndex] = useState(0);
  const [vocabAnswer, setVocabAnswer] = useState('');
  const [vocabFeedback, setVocabFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [vocabOptions, setVocabOptions] = useState<string[]>([]);

  // Grammar Lesson State
  const [grammarTopic, setGrammarTopic] = useState<GrammarTopic | null>(null);
  const [grammarExercises, setGrammarExercises] = useState<Exercise[]>([]);
  const [grammarExIdx, setGrammarExIdx] = useState(0);
  const [grammarAnswer, setGrammarAnswer] = useState('');
  const [grammarFeedback, setGrammarFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [grammarScore, setGrammarScore] = useState(0);

  // Reading Lesson State
  const [readingData, setReadingData] = useState<ReadingText | null>(null);
  const [readingQuestionIdx, setReadingQuestionIdx] = useState(0);
  const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
  const [readingChecked, setReadingChecked] = useState<Record<string, boolean>>({});
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordExplanation, setWordExplanation] = useState<{
    term: string;
    translation: string;
    explanation: string;
  } | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [starredWords, setStarredWords] = useState<Set<string>>(new Set());

  // Pronunciation TTS
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Initialize Lesson Data based on type
  useEffect(() => {
    let isMounted = true;

    async function initLesson() {
      setLoading(true);
      setErrorMsg(null);

      try {
        if (lesson.tipo === 'vocabolario') {
          // Filter vocab items for this language profile
          const langVocab = vocabItems.filter(
            (v) => (v.targetLanguage || 'en') === targetLang && (v.nativeLanguage || 'it') === nativeLang
          );

          let selected: VocabItem[] = [];
          if (langVocab.length >= 5) {
            // Pick 5-7 words
            selected = [...langVocab].sort(() => 0.5 - Math.random()).slice(0, 6);
          } else {
            // Mix with level appropriate default words
            const fallbackPool: VocabItem[] = [
              {
                id: 'fb_1',
                term: 'Hello',
                translation: 'Ciao',
                sourceLang: 'en',
                targetLang: 'en',
                synonyms: [],
                exampleSource: 'Hello, how are you?',
                exampleTranslation: 'Ciao, come stai?',
                origin: 'special_section',
                originDetail: 'lezione_guidata',
                createdAt: Date.now(),
                lastReviewedAt: null,
                box: 1,
                nextReviewAt: Date.now() + 86400000,
                correctStreak: 0,
                wrongCount: 0,
              },
              {
                id: 'fb_2',
                term: 'Friend',
                translation: 'Amico',
                sourceLang: 'en',
                targetLang: 'en',
                synonyms: [],
                exampleSource: 'She is my best friend.',
                exampleTranslation: 'Lei è la mia migliore amica.',
                origin: 'special_section',
                originDetail: 'lezione_guidata',
                createdAt: Date.now(),
                lastReviewedAt: null,
                box: 1,
                nextReviewAt: Date.now() + 86400000,
                correctStreak: 0,
                wrongCount: 0,
              },
              {
                id: 'fb_3',
                term: 'Water',
                translation: 'Acqua',
                sourceLang: 'en',
                targetLang: 'en',
                synonyms: [],
                exampleSource: 'A glass of fresh water.',
                exampleTranslation: "Un bicchiere d'acqua fresca.",
                origin: 'special_section',
                originDetail: 'lezione_guidata',
                createdAt: Date.now(),
                lastReviewedAt: null,
                box: 1,
                nextReviewAt: Date.now() + 86400000,
                correctStreak: 0,
                wrongCount: 0,
              },
              {
                id: 'fb_4',
                term: 'Book',
                translation: 'Libro',
                sourceLang: 'en',
                targetLang: 'en',
                synonyms: [],
                exampleSource: 'I am reading an interesting book.',
                exampleTranslation: 'Sto leggendo un libro interessante.',
                origin: 'special_section',
                originDetail: 'lezione_guidata',
                createdAt: Date.now(),
                lastReviewedAt: null,
                box: 1,
                nextReviewAt: Date.now() + 86400000,
                correctStreak: 0,
                wrongCount: 0,
              },
              {
                id: 'fb_5',
                term: 'Time',
                translation: 'Tempo / Ora',
                sourceLang: 'en',
                targetLang: 'en',
                synonyms: [],
                exampleSource: 'What time is it?',
                exampleTranslation: 'Che ora è?',
                origin: 'special_section',
                originDetail: 'lezione_guidata',
                createdAt: Date.now(),
                lastReviewedAt: null,
                box: 1,
                nextReviewAt: Date.now() + 86400000,
                correctStreak: 0,
                wrongCount: 0,
              },
              {
                id: 'fb_6',
                term: 'Always',
                translation: 'Sempre',
                sourceLang: 'en',
                targetLang: 'en',
                synonyms: [],
                exampleSource: 'I always wake up early.',
                exampleTranslation: 'Mi sveglio sempre presto.',
                origin: 'special_section',
                originDetail: 'lezione_guidata',
                createdAt: Date.now(),
                lastReviewedAt: null,
                box: 1,
                nextReviewAt: Date.now() + 86400000,
                correctStreak: 0,
                wrongCount: 0,
              },
            ];
            const needed = 6 - langVocab.length;
            selected = [...langVocab, ...fallbackPool.slice(0, needed)];
          }

          if (isMounted) {
            setVocabList(selected);
            setVocabIndex(0);
            generateVocabOptions(selected[0], selected);
          }
        } else if (lesson.tipo === 'grammatica') {
          // Find topic in syllabus
          const topic = allGrammarTopics.find((t) => t.id === lesson.argomentoRiferimento) ||
            allGrammarTopics.find((t) => t.level === currentStudyLevel) ||
            allGrammarTopics[0];

          if (isMounted) {
            setGrammarTopic(topic);
          }

          const exercises = await generateGrammarExercises(
            topic.name,
            topic.level || currentStudyLevel,
            targetLang,
            nativeLang,
            targetName,
            nativeName
          );

          if (isMounted) {
            setGrammarExercises(exercises.slice(0, 5));
            setGrammarExIdx(0);
            setGrammarScore(0);
          }
        } else if (lesson.tipo === 'lettura') {
          const reading = await generateReadingText(
            currentStudyLevel,
            lesson.argomentoRiferimento || 'Sorprendimi',
            targetLang,
            nativeLang,
            targetName,
            nativeName
          );

          if (isMounted) {
            setReadingData(reading);
            setReadingQuestionIdx(0);
            setReadingAnswers({});
            setReadingChecked({});
          }
        }
      } catch (err: any) {
        console.error('Error initializing lesson:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Errore nel caricamento della lezione');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initLesson();
    return () => {
      isMounted = false;
    };
  }, [lesson, currentStudyLevel, targetLang, nativeLang]);

  // Generate 4 multiple choice options for Vocab
  const generateVocabOptions = (current: VocabItem, pool: VocabItem[]) => {
    if (!current) return;
    const others = pool.filter((v) => v.id !== current.id).map((v) => v.translation);
    const distractors = ['Tempo', 'Città', 'Mondo', 'Strada', 'Lavoro', 'Casa'].filter(
      (d) => d.toLowerCase() !== current.translation.toLowerCase()
    );
    const wrong = [...others, ...distractors].slice(0, 3);
    const opts = [current.translation, ...wrong].sort(() => 0.5 - Math.random());
    setVocabOptions(opts);
  };

  // 1. Vocab Handlers
  const handleVocabAnswer = (chosen: string) => {
    if (vocabFeedback) return;
    const current = vocabList[vocabIndex];
    if (!current) return;

    const isCorrect = chosen.trim().toLowerCase() === current.translation.trim().toLowerCase();
    if (isCorrect) {
      playSound('correct');
      setVocabFeedback({ correct: true, text: `Esatto! "${current.term}" significa "${current.translation}".` });
    } else {
      playSound('review');
      setVocabFeedback({ correct: false, text: `Non proprio. "${current.term}" significa "${current.translation}".` });
    }
  };

  const handleNextVocab = () => {
    setVocabFeedback(null);
    setVocabAnswer('');
    if (vocabIndex + 1 < vocabList.length) {
      const nextIdx = vocabIndex + 1;
      setVocabIndex(nextIdx);
      generateVocabOptions(vocabList[nextIdx], vocabList);
    } else {
      playSound('sessionComplete');
      setIsFinished(true);
    }
  };

  // 2. Grammar Handlers
  const handleGrammarSubmit = (ans: string) => {
    if (grammarFeedback) return;
    const currEx = grammarExercises[grammarExIdx];
    if (!currEx) return;

    const isCorrect = ans.trim().toLowerCase() === currEx.rispostaCorretta.trim().toLowerCase();
    if (isCorrect) {
      playSound('correct');
      setGrammarScore((prev) => prev + 1);
      setGrammarFeedback({ correct: true, explanation: currEx.spiegazione || 'Ottimo lavoro! Risposta corretta.' });
    } else {
      playSound('review');
      setGrammarFeedback({
        correct: false,
        explanation: currEx.spiegazione || `La risposta corretta è "${currEx.rispostaCorretta}".`,
      });
      // Save error exercise if handler provided
      if (onSaveExerciseError) {
        onSaveExerciseError({
          id: `grammar_lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          domanda: currEx.domanda,
          rispostaCorretta: currEx.rispostaCorretta,
          tipo: 'grammatica',
          argomentoRiferimento: grammarTopic?.name || 'Lezione Guidata',
          createdAt: Date.now(),
          box: 1,
          nextReviewAt: Date.now(),
          wrongCount: 1,
          lastReviewedAt: null,
          correctStreak: 0,
          spiegazione: currEx.spiegazione,
          opzioni: currEx.opzioni,
        });
      }
    }
  };

  const handleNextGrammar = () => {
    setGrammarFeedback(null);
    setGrammarAnswer('');
    if (grammarExIdx + 1 < grammarExercises.length) {
      setGrammarExIdx((prev) => prev + 1);
    } else {
      playSound('sessionComplete');
      if (grammarTopic && onUpdateGrammarProgress) {
        onUpdateGrammarProgress({
          topicId: grammarTopic.id,
          passed: grammarScore >= 3,
          lastAttemptDate: Date.now(),
          attemptsCount: (grammarProgress[grammarTopic.id]?.attemptsCount || 0) + 1,
          exercisesCompleted: (grammarProgress[grammarTopic.id]?.exercisesCompleted || 0) + grammarExercises.length,
        });
      }
      setIsFinished(true);
    }
  };

  // 3. Reading Handlers
  const handleReadingAnswer = (questionId: string, option: string) => {
    if (readingChecked[questionId]) return;
    setReadingAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleCheckReadingQuestion = (questionId: string, correctAns: string) => {
    const userAns = readingAnswers[questionId];
    if (!userAns) return;
    const isCorrect = userAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
    if (isCorrect) {
      playSound('correct');
    } else {
      playSound('review');
      if (onSaveExerciseError && readingData) {
        const questionObj = readingData.domande?.find((d) => d.id === questionId);
        onSaveExerciseError({
          id: `reading_lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          domanda: questionObj?.domanda || 'Domanda di lettura',
          rispostaCorretta: correctAns,
          tipo: 'lettura',
          argomentoRiferimento: `Lettura: ${readingData.titolo || 'Lezione Guidata'}`,
          createdAt: Date.now(),
          box: 1,
          nextReviewAt: Date.now(),
          wrongCount: 1,
          lastReviewedAt: null,
          correctStreak: 0,
          opzioni: questionObj?.opzioni,
        });
      }
    }
    setReadingChecked((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleWordClick = async (word: string) => {
    const cleanWord = word.replace(/[^a-zA-ZàèéìòùÀÈÉÌÒÙäöüÄÖÜßáíóúÁÍÓÚñÑ]/g, '').trim();
    if (!cleanWord) return;

    setSelectedWord(cleanWord);
    setIsExplaining(true);
    setWordExplanation(null);

    try {
      const exp = await explainWordInContext(cleanWord, readingData?.testo || '', nativeName, targetName);
      setWordExplanation(exp);
    } catch (e) {
      setWordExplanation({
        term: cleanWord,
        translation: 'Traduzione in caricamento',
        explanation: 'Fai pratica con questa parola nel testo.',
      });
    } finally {
      setIsExplaining(false);
    }
  };

  const handleToggleStarWord = (term: string, translation: string) => {
    const next = new Set(starredWords);
    if (next.has(term)) {
      next.delete(term);
    } else {
      next.add(term);
      playSound('acorn');
      onSaveVocabItem({
        id: `saved_${Date.now()}`,
        term,
        translation,
        sourceLang: targetLang,
        targetLang: nativeLang,
        synonyms: [],
        exampleSource: readingData?.testo || term,
        exampleTranslation: '',
        origin: 'reading_word',
        originDetail: readingData?.titolo || 'Lettura Guidata',
        createdAt: Date.now(),
        lastReviewedAt: Date.now(),
        box: 1,
        nextReviewAt: Date.now() + 86400000,
        correctStreak: 0,
        wrongCount: 0,
      });
    }
    setStarredWords(next);
  };

  const handleFinishReading = () => {
    playSound('sessionComplete');
    if (onCompleteReading) {
      onCompleteReading(currentStudyLevel);
    }
    setIsFinished(true);
  };

  // Complete & Earn Acorns
  const handleFinalClaim = () => {
    playSound('acorn');
    onComplete(lesson.id);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-[#2B2622] text-[#F2E8D5] border-2 border-[#6B7C4F]/40 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#6B7C4F]/25 flex items-center justify-between bg-[#1A1512]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#E8802F] text-[#1A1512] flex items-center justify-center font-black font-display text-sm shadow-xs">
              {lesson.ordine}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#859966] font-display">
                  Lezione Guidata • {lesson.tipo.toUpperCase()}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#6B7C4F]/30 text-[#859966] text-[10px] font-black">
                  {currentStudyLevel}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold font-display text-[#F2E8D5] line-clamp-1">
                {lesson.title || `Lezione ${lesson.ordine}`}
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="py-12 text-center space-y-4">
              <Mascot pose="thinking" size={120} speechBubble="Preparo la tua lezione guidata..." />
              <p className="text-sm font-extrabold font-display text-[#F2E8D5]">Caricamento contenuti...</p>
            </div>
          ) : errorMsg ? (
            <div className="py-8 text-center space-y-4">
              <Mascot pose="digging" size={100} speechBubble="Oops! Qualcosa è andato storto." />
              <p className="text-sm font-extrabold text-red-400 font-display">{errorMsg}</p>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary py-2.5 px-6 text-xs font-bold"
              >
                Chiudi
              </button>
            </div>
          ) : isFinished ? (
            /* Celebration Screen */
            <div className="py-6 text-center space-y-6 animate-fade-in">
              <div className="relative">
                <Mascot pose="happy" size={140} speechBubble="Grandissimo! Lezione completata con successo! 🎉" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#859966] font-display">
                  Traguardo Raggiunto
                </span>
                <h2 className="text-2xl sm:text-3xl font-black font-display text-[#F2E8D5]">
                  Lezione {lesson.ordine} Superata!
                </h2>
                <p className="text-xs sm:text-sm font-medium text-[#F2E8D5]/75 max-w-sm mx-auto">
                  Hai fatto un altro passo avanti lungo il sentiero verso il prossimo checkpoint!
                </p>
              </div>

              <div className="p-4 bg-[#1A1512] rounded-2xl border border-[#6B7C4F]/30 flex items-center justify-center gap-3">
                <span className="text-2xl">🌰</span>
                <span className="text-sm font-extrabold text-[#E8802F] font-display">
                  +10 Ghiande guadagnate per la tana!
                </span>
              </div>

              <button
                type="button"
                onClick={handleFinalClaim}
                className="btn-zucca w-full py-4 text-base font-black shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continua il percorso →</span>
              </button>
            </div>
          ) : (
            /* Active Lesson Content */
            <>
              {/* 1. VOCABOLARIO LESSON */}
              {lesson.tipo === 'vocabolario' && vocabList[vocabIndex] && (
                <div className="space-y-5 animate-fade-in">
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#859966] font-display">
                      <span>Parola {vocabIndex + 1} di {vocabList.length}</span>
                      <span>{Math.round(((vocabIndex + 1) / vocabList.length) * 100)}%</span>
                    </div>
                    <div className="progress-track h-2 bg-[#1A1512] border border-[#6B7C4F]/25">
                      <div
                        className="progress-fill progress-fill-zucca"
                        style={{ width: `${((vocabIndex + 1) / vocabList.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Word Card */}
                  <div className="bg-[#1A1512] p-6 rounded-3xl border border-[#6B7C4F]/30 text-center space-y-4 relative shadow-md">
                    <button
                      type="button"
                      onClick={() => speakText(vocabList[vocabIndex].term)}
                      className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-[#2B2622] text-[#E8802F] flex items-center justify-center hover:bg-[#E8802F] hover:text-[#1A1512] transition-colors cursor-pointer"
                      title="Ascolta pronuncia"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#859966] font-display">
                        Traduci in {nativeName}
                      </span>
                      <h2 className="text-3xl sm:text-4xl font-black font-display text-[#F2E8D5] mt-1">
                        {vocabList[vocabIndex].term}
                      </h2>
                      {vocabList[vocabIndex].exampleSource && (
                        <p className="text-xs text-[#F2E8D5]/65 italic mt-2">
                          "{vocabList[vocabIndex].exampleSource}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-[#F2E8D5]/70 font-display">
                      Scegli il significato corretto:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {vocabOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={!!vocabFeedback}
                          onClick={() => handleVocabAnswer(opt)}
                          className={`p-4 rounded-2xl border-2 font-display text-sm font-bold text-left transition-all cursor-pointer ${
                            vocabFeedback
                              ? opt.trim().toLowerCase() === vocabList[vocabIndex].translation.trim().toLowerCase()
                                ? 'bg-[#6B7C4F]/30 border-[#6B7C4F] text-[#859966]'
                                : 'bg-[#1A1512] border-white/5 opacity-50'
                              : 'bg-[#1A1512] border-[#6B7C4F]/20 hover:border-[#E8802F] hover:bg-[#221C18] text-[#F2E8D5]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback */}
                  {vocabFeedback && (
                    <div className={`p-4 rounded-2xl border-2 flex items-start gap-3 animate-fade-in ${
                      vocabFeedback.correct ? 'bg-[#6B7C4F]/20 border-[#6B7C4F]' : 'bg-amber-900/30 border-amber-600/50'
                    }`}>
                      <div className="text-xl shrink-0">{vocabFeedback.correct ? '✅' : '💡'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold font-display text-[#F2E8D5]">
                          {vocabFeedback.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleNextVocab}
                        className="btn-zucca py-2 px-4 text-xs font-black shrink-0"
                      >
                        Avanti →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. GRAMMATICA LESSON */}
              {lesson.tipo === 'grammatica' && grammarExercises[grammarExIdx] && (
                <div className="space-y-5 animate-fade-in">
                  {/* Topic Theory Pill */}
                  {grammarTopic && (
                    <div className="bg-[#1A1512] p-4 rounded-2xl border border-[#6B7C4F]/30 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">🌲</span>
                        <span className="text-xs font-extrabold font-display text-[#859966]">
                          {grammarTopic.name}
                        </span>
                      </div>
                      <p className="text-xs text-[#F2E8D5]/75 font-medium leading-relaxed">
                        {grammarTopic.summary || 'Applica le regole ed esercitati con le frasi.'}
                      </p>
                    </div>
                  )}

                  {/* Exercise Counter */}
                  <div className="flex justify-between items-center text-xs font-bold text-[#859966] font-display">
                    <span>Esercizio {grammarExIdx + 1} di {grammarExercises.length}</span>
                    <span>Punteggio: {grammarScore}/{grammarExercises.length}</span>
                  </div>

                  {/* Question Box */}
                  <div className="bg-[#1A1512] p-5 rounded-3xl border border-[#6B7C4F]/30 space-y-3 shadow-md">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E8802F] font-display">
                      {grammarExercises[grammarExIdx].tipo === 'multiple_choice' ? 'Scelta Multipla' : 'Completa la frase'}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold font-display text-[#F2E8D5] leading-relaxed">
                      {grammarExercises[grammarExIdx].domanda}
                    </h3>
                  </div>

                  {/* Multiple Choice Options or Text Input */}
                  {grammarExercises[grammarExIdx].tipo === 'multiple_choice' &&
                  grammarExercises[grammarExIdx].opzioni &&
                  grammarExercises[grammarExIdx].opzioni!.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {grammarExercises[grammarExIdx].opzioni!.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={!!grammarFeedback}
                          onClick={() => handleGrammarSubmit(opt)}
                          className={`p-3.5 rounded-2xl border-2 font-display text-xs sm:text-sm font-bold text-left transition-all cursor-pointer ${
                            grammarFeedback
                              ? opt.trim().toLowerCase() === grammarExercises[grammarExIdx].rispostaCorretta.trim().toLowerCase()
                                ? 'bg-[#6B7C4F]/30 border-[#6B7C4F] text-[#859966]'
                                : 'bg-[#1A1512] border-white/5 opacity-50'
                              : 'bg-[#1A1512] border-[#6B7C4F]/20 hover:border-[#E8802F] text-[#F2E8D5]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        disabled={!!grammarFeedback}
                        value={grammarAnswer}
                        onChange={(e) => setGrammarAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && grammarAnswer.trim()) {
                            handleGrammarSubmit(grammarAnswer);
                          }
                        }}
                        placeholder="Scrivi qui la tua risposta..."
                        className="w-full p-3.5 bg-[#1A1512] border border-[#6B7C4F]/30 focus:border-[#E8802F] rounded-2xl text-sm font-display text-[#F2E8D5] outline-none"
                      />
                      {!grammarFeedback && (
                        <button
                          type="button"
                          disabled={!grammarAnswer.trim()}
                          onClick={() => handleGrammarSubmit(grammarAnswer)}
                          className="btn-zucca w-full py-3 text-xs font-black cursor-pointer disabled:opacity-50"
                        >
                          Verifica risposta
                        </button>
                      )}
                    </div>
                  )}

                  {/* Feedback */}
                  {grammarFeedback && (
                    <div className={`p-4 rounded-2xl border-2 flex items-start gap-3 animate-fade-in ${
                      grammarFeedback.correct ? 'bg-[#6B7C4F]/20 border-[#6B7C4F]' : 'bg-amber-900/30 border-amber-600/50'
                    }`}>
                      <div className="text-xl shrink-0">{grammarFeedback.correct ? '✅' : '💡'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold font-display text-[#F2E8D5]">
                          {grammarFeedback.explanation}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleNextGrammar}
                        className="btn-zucca py-2 px-4 text-xs font-black shrink-0"
                      >
                        Avanti →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 3. LETTURA LESSON */}
              {lesson.tipo === 'lettura' && readingData && (
                <div className="space-y-5 animate-fade-in">
                  {/* Reading Story Box */}
                  <div className="bg-[#1A1512] p-5 rounded-3xl border border-[#6B7C4F]/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#6B7C4F]/20 pb-2.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#C99A3D] font-display">
                        {readingData.titolo || 'Brano di Lettura'}
                      </span>
                      <span className="text-[10px] text-[#F2E8D5]/60">Tocca le parole per tradurle</span>
                    </div>

                    {/* Interactive words */}
                    <div className="text-sm sm:text-base leading-relaxed text-[#F2E8D5]/90 font-medium select-text">
                      {readingData.testo.split(' ').map((word, idx) => (
                        <span
                          key={idx}
                          onClick={() => handleWordClick(word)}
                          className="hover:text-[#E8802F] hover:underline cursor-pointer transition-colors inline-block mr-1.5"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Word Quick Lookup Card */}
                  {selectedWord && (
                    <div className="bg-[#221C18] p-4 rounded-2xl border border-[#E8802F]/40 flex items-center justify-between gap-3 animate-fade-in">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-display text-[#E8802F]">{selectedWord}</span>
                          <button
                            type="button"
                            onClick={() => speakText(selectedWord)}
                            className="text-[#E8802F] hover:text-[#F2E8D5]"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-[#F2E8D5]/80 mt-0.5">
                          {isExplaining ? 'Traduzione in corso...' : wordExplanation?.translation || ''}
                        </p>
                      </div>

                      {wordExplanation && (
                        <button
                          type="button"
                          onClick={() => handleToggleStarWord(wordExplanation.term, wordExplanation.translation)}
                          className={`p-2 rounded-xl border text-xs font-bold font-display flex items-center gap-1 cursor-pointer transition-colors ${
                            starredWords.has(wordExplanation.term)
                              ? 'bg-[#E8802F] text-[#1A1512] border-[#E8802F]'
                              : 'bg-[#1A1512] text-[#E8802F] border-[#E8802F]/30'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{starredWords.has(wordExplanation.term) ? 'Salvata' : 'Salva'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Comprehension Questions */}
                  {readingData.domandeComprensione && readingData.domandeComprensione.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#859966] font-display">
                        Domande di Comprensione ({readingData.domandeComprensione.length})
                      </h4>

                      {readingData.domandeComprensione.map((q, qIdx) => {
                        const isChecked = readingChecked[q.id];
                        const userAns = readingAnswers[q.id];
                        return (
                          <div key={q.id || qIdx} className="bg-[#1A1512] p-4 rounded-2xl border border-[#6B7C4F]/20 space-y-3">
                            <p className="text-xs sm:text-sm font-bold font-display text-[#F2E8D5]">
                              {qIdx + 1}. {q.domanda}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.opzioni.map((opt, oIdx) => {
                                const isSelected = userAns === opt;
                                const isCorrect = opt.trim().toLowerCase() === q.rispostaCorretta.trim().toLowerCase();
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    disabled={isChecked}
                                    onClick={() => handleReadingAnswer(q.id, opt)}
                                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                                      isChecked
                                        ? isCorrect
                                          ? 'bg-[#6B7C4F]/30 border-[#6B7C4F] text-[#859966]'
                                          : isSelected
                                          ? 'bg-red-950/40 border-red-500 text-red-300'
                                          : 'opacity-40 border-white/5 bg-[#1A1512]'
                                        : isSelected
                                        ? 'bg-[#E8802F]/20 border-[#E8802F] text-[#E8802F]'
                                        : 'bg-[#2B2622] border-[#6B7C4F]/20 hover:border-[#6B7C4F] text-[#F2E8D5]'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {!isChecked && userAns && (
                              <button
                                type="button"
                                onClick={() => handleCheckReadingQuestion(q.id, q.rispostaCorretta)}
                                className="btn-zucca py-2 px-4 text-xs font-black"
                              >
                                Conferma risposta
                              </button>
                            )}

                            {isChecked && (
                              <div className="text-[11px] font-medium text-[#F2E8D5]/70 pt-1">
                                💡 {q.spiegazione || `La risposta corretta è "${q.rispostaCorretta}".`}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Complete Reading Button */}
                      {Object.keys(readingChecked).length >= (readingData.domandeComprensione?.length || 1) && (
                        <button
                          type="button"
                          onClick={handleFinishReading}
                          className="btn-zucca w-full py-3.5 text-sm font-black shadow-lg cursor-pointer"
                        >
                          Completa Lettura ✓
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
