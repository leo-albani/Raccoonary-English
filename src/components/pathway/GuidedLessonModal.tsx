import React, { useState, useEffect } from 'react';
import { X, Volume2, Star, Check, Sparkles, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { Mascot } from '../../mascot/Mascot';
import { LessonItem, UserProfile, VocabItem, ExerciseError, GrammarTopic, GrammarTopicProgress, CEFRLevel, Exercise, ReadingText } from '../../types';
import { GRAMMAR_SYLLABUS } from '../../data/grammarSyllabus';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../../data/languages';
import { generateGrammarExercises, generateReadingText, explainWordInContext, generateSuggestedVocab } from '../../services/gemini';
import { playSound } from '../../services/sound';
import { ReadingSection } from '../reading/ReadingSection';

interface GuidedLessonModalProps {
  lesson: LessonItem;
  user: UserProfile;
  vocabItems: VocabItem[];
  allGrammarTopics?: GrammarTopic[];
  grammarProgress?: Record<string, GrammarTopicProgress>;
  onComplete: (lessonId: string) => void;
  onClose: () => void;
  onSaveVocabItem: (item: VocabItem) => void;
  onDeleteVocabItem?: (id: string) => void;
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
  onDeleteVocabItem,
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
  const [selectedVocabOption, setSelectedVocabOption] = useState<string | null>(null);
  const [vocabFeedback, setVocabFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [vocabOptions, setVocabOptions] = useState<string[]>([]);
  const [vocabScore, setVocabScore] = useState(0);
  const [starredVocabIds, setStarredVocabIds] = useState<Set<string>>(new Set());

  // Grammar Lesson State
  const [grammarTopic, setGrammarTopic] = useState<GrammarTopic | null>(null);
  const [grammarExercises, setGrammarExercises] = useState<Exercise[]>([]);
  const [grammarExIdx, setGrammarExIdx] = useState(0);
  const [selectedGrammarOption, setSelectedGrammarOption] = useState<string | null>(null);
  const [grammarAnswer, setGrammarAnswer] = useState('');
  const [grammarFeedback, setGrammarFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [grammarScore, setGrammarScore] = useState(0);

  // Sentence Reorder State for Grammar
  const [reorderPlaced, setReorderPlaced] = useState<{ id: string; word: string }[]>([]);
  const [reorderPool, setReorderPool] = useState<{ id: string; word: string }[]>([]);

  // Reading Lesson State
  const [readingData, setReadingData] = useState<ReadingText | null>(null);
  const [readingQuestionIdx, setReadingQuestionIdx] = useState(0);
  const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
  const [readingChecked, setReadingChecked] = useState<Record<string, boolean>>({});
  const [readingScore, setReadingScore] = useState(0);
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
          if (langVocab.length >= 10) {
            // Pick 10 words
            selected = [...langVocab].sort(() => 0.5 - Math.random()).slice(0, 10);
          } else {
            // Fetch words matching the user's active CEFR level to reach 10
            const needed = 10 - langVocab.length;
            const existingTerms = langVocab.map((v) => v.term);

            const suggested = await generateSuggestedVocab(
              needed,
              currentStudyLevel,
              targetLang,
              nativeLang,
              targetName,
              nativeName,
              existingTerms
            );

            // Convert to VocabItem with origin 'ai_suggested' (transient in lesson unless user stars it)
            const newItems: VocabItem[] = suggested.map((item, idx) => ({
              id: `ai_sug_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
              term: item.termine,
              translation: item.traduzione,
              sourceLang: targetLang,
              targetLang: targetLang,
              synonyms: [],
              exampleSource: item.esempio,
              exampleTranslation: item.esempioTraduzione || '',
              origin: 'ai_suggested',
              originDetail: 'lezione_guidata',
              createdAt: Date.now(),
              lastReviewedAt: null,
              box: 1,
              nextReviewAt: Date.now() + 86400000,
              correctStreak: 0,
              wrongCount: 0,
            }));

            selected = [...langVocab, ...newItems].slice(0, 10);
          }

          if (isMounted) {
            setVocabList(selected);
            setVocabIndex(0);
            setVocabScore(0);
            setSelectedVocabOption(null);
            setVocabFeedback(null);
            if (selected.length > 0) {
              generateVocabOptions(selected[0], selected);
            }
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
            setGrammarExercises(exercises);
            setGrammarExIdx(0);
            setGrammarScore(0);
            setSelectedGrammarOption(null);
            setGrammarAnswer('');
            setGrammarFeedback(null);
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
            setReadingScore(0);
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

  // Set up sentence_reorder whenever current grammar exercise changes
  useEffect(() => {
    if (lesson.tipo !== 'grammatica' || !grammarExercises[grammarExIdx]) return;
    const currEx = grammarExercises[grammarExIdx];
    if (currEx.tipo === 'sentence_reorder') {
      let words = currEx.scrambledWords && currEx.scrambledWords.length > 0 ? currEx.scrambledWords : [];
      if (words.length < 2) {
        const fullSent = (currEx.correctSentence || currEx.rispostaCorretta || '').trim();
        words = fullSent.split(/\s+/).filter(Boolean).sort(() => 0.5 - Math.random());
      }
      setReorderPool(words.map((w, i) => ({ id: `w_${i}_${w}`, word: w })));
      setReorderPlaced([]);
    }
  }, [lesson.tipo, grammarExIdx, grammarExercises]);

  // Generate 4 multiple choice options for Vocab
  const generateVocabOptions = (current: VocabItem, pool: VocabItem[]) => {
    if (!current) return;
    const others = pool.filter((v) => v.id !== current.id).map((v) => v.translation);
    const distractors = ['Tempo', 'Città', 'Mondo', 'Strada', 'Lavoro', 'Casa', 'Libro', 'Persona', 'Giorno'].filter(
      (d) => d.toLowerCase() !== current.translation.toLowerCase()
    );
    const wrong = [...others, ...distractors].slice(0, 3);
    const opts = [current.translation, ...wrong].sort(() => 0.5 - Math.random());
    setVocabOptions(opts);
  };

  // Star toggle for Vocab Lesson
  const handleToggleStarVocab = (item: VocabItem) => {
    const isAlreadySaved = vocabItems.some((v) => v.term.toLowerCase() === item.term.toLowerCase()) || starredVocabIds.has(item.id);
    
    if (isAlreadySaved) {
      // Unstar
      const next = new Set(starredVocabIds);
      next.delete(item.id);
      setStarredVocabIds(next);
      if (onDeleteVocabItem) {
        onDeleteVocabItem(item.id);
      }
    } else {
      // Star & Save to Tana
      playSound('acorn');
      const next = new Set(starredVocabIds);
      next.add(item.id);
      setStarredVocabIds(next);
      onSaveVocabItem({
        ...item,
        id: item.id.startsWith('ai_sug') ? `saved_${Date.now()}_${item.term}` : item.id,
        createdAt: Date.now(),
      });
    }
  };

  // 1. Vocab Handlers
  const handleVerifyVocabAnswer = () => {
    if (vocabFeedback || !selectedVocabOption) return;
    const current = vocabList[vocabIndex];
    if (!current) return;

    const isCorrect = selectedVocabOption.trim().toLowerCase() === current.translation.trim().toLowerCase();
    if (isCorrect) {
      playSound('correct');
      setVocabScore((prev) => prev + 1);
      setVocabFeedback({ correct: true, text: `Esatto! "${current.term}" significa "${current.translation}".` });
    } else {
      playSound('review');
      setVocabFeedback({ correct: false, text: `Non proprio. "${current.term}" significa "${current.translation}".` });
      if (onSaveExerciseError) {
        onSaveExerciseError({
          id: `vocab_lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          domanda: `Qual è la traduzione di "${current.term}"?`,
          rispostaCorretta: current.translation,
          tipo: 'vocabolario',
          argomentoRiferimento: 'Vocabolario Guidato',
          createdAt: Date.now(),
          box: 1,
          nextReviewAt: Date.now(),
          wrongCount: 1,
          lastReviewedAt: null,
          correctStreak: 0,
        });
      }
    }
  };

  const handleNextVocab = () => {
    setVocabFeedback(null);
    setSelectedVocabOption(null);
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
  const handleVerifyGrammarAnswer = () => {
    if (grammarFeedback) return;
    const currEx = grammarExercises[grammarExIdx];
    if (!currEx) return;

    let ansToVerify = '';
    if (currEx.tipo === 'multiple_choice') {
      if (!selectedGrammarOption) return;
      ansToVerify = selectedGrammarOption;
    } else if (currEx.tipo === 'sentence_reorder') {
      if (reorderPlaced.length === 0) return;
      ansToVerify = reorderPlaced.map((p) => p.word).join(' ');
    } else {
      if (!grammarAnswer.trim()) return;
      ansToVerify = grammarAnswer;
    }

    const cleanUserAns = ansToVerify.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    const cleanExpected = currEx.rispostaCorretta.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    const cleanSentenceExpected = (currEx.correctSentence || '').trim().toLowerCase().replace(/[.,!?;:]/g, '');

    const isCorrect = cleanUserAns === cleanExpected || (cleanSentenceExpected && cleanUserAns === cleanSentenceExpected);

    if (isCorrect) {
      playSound('correct');
      setGrammarScore((prev) => prev + 1);
      setGrammarFeedback({ correct: true, explanation: currEx.spiegazione || 'Ottimo lavoro! Risposta corretta.' });
    } else {
      playSound('review');
      setGrammarFeedback({
        correct: false,
        explanation: currEx.spiegazione || `La risposta corretta è "${currEx.correctSentence || currEx.rispostaCorretta}".`,
      });
      if (onSaveExerciseError) {
        onSaveExerciseError({
          id: `grammar_lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          domanda: currEx.domanda,
          rispostaCorretta: currEx.correctSentence || currEx.rispostaCorretta,
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
    setSelectedGrammarOption(null);
    setGrammarAnswer('');
    if (grammarExIdx + 1 < grammarExercises.length) {
      setGrammarExIdx((prev) => prev + 1);
    } else {
      playSound('sessionComplete');
      if (grammarTopic && onUpdateGrammarProgress) {
        const total = grammarExercises.length;
        const passed = total > 0 ? grammarScore / total >= 0.5 : true;
        onUpdateGrammarProgress({
          topicId: grammarTopic.id,
          passed,
          bestScorePercent: total > 0 ? Math.round((grammarScore / total) * 100) : 100,
          lastAttemptDate: Date.now(),
          attemptsCount: (grammarProgress[grammarTopic.id]?.attemptsCount || 0) + 1,
          exercisesCompleted: (grammarProgress[grammarTopic.id]?.exercisesCompleted || 0) + grammarExercises.length,
        });
      }
      setIsFinished(true);
    }
  };

  // Reorder UI Interactions
  const handlePlaceWord = (item: { id: string; word: string }) => {
    if (grammarFeedback) return;
    setReorderPool((prev) => prev.filter((p) => p.id !== item.id));
    setReorderPlaced((prev) => [...prev, item]);
  };

  const handleRemovePlacedWord = (item: { id: string; word: string }) => {
    if (grammarFeedback) return;
    setReorderPlaced((prev) => prev.filter((p) => p.id !== item.id));
    setReorderPool((prev) => [...prev, item]);
  };

  const handleResetReorder = () => {
    if (grammarFeedback) return;
    const currEx = grammarExercises[grammarExIdx];
    if (!currEx) return;
    let words = currEx.scrambledWords && currEx.scrambledWords.length > 0 ? currEx.scrambledWords : [];
    if (words.length < 2) {
      const fullSent = (currEx.correctSentence || currEx.rispostaCorretta || '').trim();
      words = fullSent.split(/\s+/).filter(Boolean).sort(() => 0.5 - Math.random());
    }
    setReorderPool(words.map((w, i) => ({ id: `w_${i}_${w}`, word: w })));
    setReorderPlaced([]);
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
      setReadingScore((prev) => prev + 1);
    } else {
      playSound('review');
      if (onSaveExerciseError && readingData) {
        const questionObj = readingData.domandeComprensione?.find((d) => d.id === questionId);
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
        translation: 'Traduzione rapida',
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

  // Restart Lesson Handler
  const handleRestartLesson = () => {
    playSound('acorn');
    setVocabIndex(0);
    setVocabScore(0);
    setSelectedVocabOption(null);
    setVocabFeedback(null);
    if (vocabList.length > 0) {
      generateVocabOptions(vocabList[0], vocabList);
    }

    setGrammarExIdx(0);
    setGrammarScore(0);
    setSelectedGrammarOption(null);
    setGrammarAnswer('');
    setGrammarFeedback(null);

    setReadingQuestionIdx(0);
    setReadingAnswers({});
    setReadingChecked({});
    setReadingScore(0);

    setIsFinished(false);
  };

  // Complete & Earn Acorns
  const handleFinalClaim = () => {
    playSound('acorn');
    onComplete(lesson.id);
  };

  // Compute lesson score stats
  let totalQuestions = 1;
  let correctCount = 0;
  if (lesson.tipo === 'vocabolario') {
    totalQuestions = vocabList.length || 1;
    correctCount = vocabScore;
  } else if (lesson.tipo === 'grammatica') {
    totalQuestions = grammarExercises.length || 1;
    correctCount = grammarScore;
  } else if (lesson.tipo === 'lettura') {
    const qList = readingData?.domande || readingData?.questions || [];
    totalQuestions = qList.length || 1;
    correctCount = readingScore;
  }
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  const isFailed = scorePercent < 50;
  const isWarning = scorePercent >= 50 && scorePercent <= 70;
  const isExcellent = scorePercent > 70;

  // Active vocab item starred status
  const activeVocab = vocabList[vocabIndex];
  const isCurrentVocabStarred = activeVocab
    ? vocabItems.some((v) => v.term.toLowerCase() === activeVocab.term.toLowerCase()) || starredVocabIds.has(activeVocab.id)
    : false;

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
                className="btn-secondary py-2.5 px-6 text-xs font-bold cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          ) : isFinished ? (
            /* Outcome / Assessment Screen with Thresholds */
            <div className="py-6 text-center space-y-6 animate-fade-in">
              {isFailed ? (
                <>
                  <div className="relative">
                    <Mascot pose="digging" size={130} speechBubble="Non fa niente! Facciamo un altro tentativo per chiarire i dubbi. 🦝" />
                  </div>

                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full bg-red-950/60 border border-red-500/50 text-red-400 text-xs font-extrabold font-display inline-block">
                      🔴 Lezione non superata (&lt; 50%)
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black font-display text-[#F2E8D5]">
                      Risultato: {correctCount} su {totalQuestions} ({scorePercent}%)
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-[#F2E8D5]/75 max-w-sm mx-auto">
                      Serve almeno il <strong>50%</strong> di risposte corrette per superare la lezione e sbloccare il nodo successivo del percorso.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleRestartLesson}
                      className="btn-zucca flex-1 py-3.5 text-sm font-black shadow-lg cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Rifai la lezione 🔄</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary flex-1 py-3.5 text-sm font-bold cursor-pointer"
                    >
                      Torna al percorso
                    </button>
                  </div>
                </>
              ) : isWarning ? (
                <>
                  <div className="relative">
                    <Mascot pose="thinking" size={130} speechBubble="Hai superato la lezione! Ma puoi fare ancora meglio. 🦝" />
                  </div>

                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs font-extrabold font-display inline-block">
                      🟡 Lezione Superata (50% - 70%)
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black font-display text-[#F2E8D5]">
                      Punteggio: {correctCount} su {totalQuestions} ({scorePercent}%)
                    </h2>
                    <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-left max-w-md mx-auto">
                      <p className="text-xs font-medium text-amber-200/90 leading-relaxed">
                        💡 <strong>Consiglio del procione:</strong> Hai superato la lezione, ma potresti ripassarla ancora un po' per fissare bene le regole prima del Checkpoint!
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#1A1512] rounded-2xl border border-[#6B7C4F]/30 flex items-center justify-center gap-3">
                    <span className="text-2xl">🌰</span>
                    <span className="text-sm font-extrabold text-[#E8802F] font-display">
                      +10 Ghiande guadagnate per la tana!
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleRestartLesson}
                      className="btn-secondary flex-1 py-3.5 text-xs sm:text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Rifai per perfezionare 🔄</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalClaim}
                      className="btn-zucca flex-1 py-3.5 text-xs sm:text-sm font-black shadow-lg cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Procedi comunque →</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Mascot pose="happy" size={140} speechBubble="Grandissimo! Ottimo risultato! 🎉" />
                  </div>

                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full bg-[#6B7C4F]/40 border border-[#6B7C4F] text-[#859966] text-xs font-extrabold font-display inline-block">
                      🟢 Lezione Superata a Pieni Voti!
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black font-display text-[#F2E8D5]">
                      Punteggio: {correctCount} su {totalQuestions} ({scorePercent}%)
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-[#F2E8D5]/75 max-w-sm mx-auto">
                      Hai fatto un eccellente passo avanti verso il prossimo checkpoint!
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
                </>
              )}
            </div>
          ) : (
            /* Active Lesson Content */
            <>
              {/* 1. VOCABOLARIO LESSON */}
              {lesson.tipo === 'vocabolario' && activeVocab && (
                <div className="space-y-5 animate-fade-in">
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#859966] font-display">
                      <span>Parola {vocabIndex + 1} di {vocabList.length}</span>
                      <span>Punteggio: {vocabScore}/{vocabIndex}</span>
                    </div>
                    <div className="progress-track h-2 bg-[#1A1512] border border-[#6B7C4F]/25">
                      <div
                        className="progress-fill progress-fill-zucca"
                        style={{ width: `${((vocabIndex + 1) / vocabList.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Word Card with Star button */}
                  <div className="bg-[#1A1512] p-6 rounded-3xl border border-[#6B7C4F]/30 text-center space-y-4 relative shadow-md">
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStarVocab(activeVocab)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                          isCurrentVocabStarred
                            ? 'bg-[#E8802F] text-[#1A1512] border-[#E8802F]'
                            : 'bg-[#2B2622] text-[#F2E8D5]/60 hover:text-[#E8802F] border-[#6B7C4F]/30'
                        }`}
                        title={isCurrentVocabStarred ? 'Salvata nella Tana (tocca per rimuovere)' : 'Salva parola nella Tana'}
                      >
                        <Star className={`w-4 h-4 ${isCurrentVocabStarred ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => speakText(activeVocab.term)}
                        className="w-9 h-9 rounded-xl bg-[#2B2622] text-[#E8802F] flex items-center justify-center hover:bg-[#E8802F] hover:text-[#1A1512] transition-colors cursor-pointer border border-[#6B7C4F]/30"
                        title="Ascolta pronuncia"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#859966] font-display">
                        Traduci in {nativeName}
                      </span>
                      <h2 className="text-3xl sm:text-4xl font-black font-display text-[#F2E8D5] mt-1">
                        {activeVocab.term}
                      </h2>
                      {activeVocab.exampleSource && (
                        <p className="text-xs text-[#F2E8D5]/65 italic mt-2 max-w-md mx-auto">
                          "{activeVocab.exampleSource}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Options (Non-committal selection) */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-[#F2E8D5]/70 font-display">
                      Scegli il significato corretto:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {vocabOptions.map((opt, i) => {
                        const isSelected = selectedVocabOption === opt;
                        const isCorrect = opt.trim().toLowerCase() === activeVocab.translation.trim().toLowerCase();

                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={!!vocabFeedback}
                            onClick={() => setSelectedVocabOption(opt)}
                            className={`p-4 rounded-2xl border-2 font-display text-sm font-bold text-left transition-all cursor-pointer ${
                              vocabFeedback
                                ? isCorrect
                                  ? 'bg-[#6B7C4F]/30 border-[#6B7C4F] text-[#859966]'
                                  : isSelected
                                  ? 'bg-red-950/40 border-red-500 text-red-300'
                                  : 'bg-[#1A1512] border-white/5 opacity-50 text-[#F2E8D5]/60'
                                : isSelected
                                ? 'bg-[#E8802F]/20 border-[#E8802F] text-[#E8802F]'
                                : 'bg-[#1A1512] border-[#6B7C4F]/20 hover:border-[#E8802F] hover:bg-[#221C18] text-[#F2E8D5]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Verify button before feedback */}
                  {!vocabFeedback && (
                    <button
                      type="button"
                      disabled={!selectedVocabOption}
                      onClick={handleVerifyVocabAnswer}
                      className="btn-zucca w-full py-3.5 text-sm font-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                    >
                      Verifica risposta ⚡
                    </button>
                  )}

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
                        className="btn-zucca py-2 px-4 text-xs font-black shrink-0 cursor-pointer"
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
                  {(() => {
                    const currEx = grammarExercises[grammarExIdx];
                    const isSentenceReorder = currEx.tipo === 'sentence_reorder';
                    const isMultipleChoice = currEx.tipo === 'multiple_choice' && currEx.opzioni && currEx.opzioni.length > 0;

                    return (
                      <>
                        <div className="bg-[#1A1512] p-5 rounded-3xl border border-[#6B7C4F]/30 space-y-3 shadow-md">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E8802F] font-display">
                            {isMultipleChoice ? 'Scelta Multipla' : isSentenceReorder ? 'Riordina le frasi' : 'Completa la frase'}
                          </span>
                          <h3 className="text-base sm:text-lg font-bold font-display text-[#F2E8D5] leading-relaxed">
                            {currEx.domanda}
                          </h3>
                        </div>

                        {/* Interactive UI based on exercise type */}
                        {isSentenceReorder ? (
                          /* SENTENCE REORDER UI */
                          <div className="space-y-4">
                            {/* Assembled sentence area */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold text-[#859966] font-display">
                                <span>La tua frase:</span>
                                {reorderPlaced.length > 0 && !grammarFeedback && (
                                  <button
                                    type="button"
                                    onClick={handleResetReorder}
                                    className="text-[#E8802F] hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reimposta</span>
                                  </button>
                                )}
                              </div>
                              <div className="min-h-[56px] p-3 rounded-2xl bg-[#1A1512] border-2 border-dashed border-[#6B7C4F]/40 flex flex-wrap gap-2 items-center">
                                {reorderPlaced.length === 0 ? (
                                  <span className="text-xs text-[#F2E8D5]/40 italic">
                                    Tocca le parole sotto nell'ordine corretto...
                                  </span>
                                ) : (
                                  reorderPlaced.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      disabled={!!grammarFeedback}
                                      onClick={() => handleRemovePlacedWord(item)}
                                      className="px-3.5 py-1.5 rounded-xl bg-[#E8802F] text-[#1A1512] font-bold text-sm font-display cursor-pointer hover:bg-[#E8802F]/80 active:scale-95 transition-all shadow-xs"
                                    >
                                      {item.word}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Word Bank pool */}
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-[#F2E8D5]/70 font-display">
                                Parole disponibili:
                              </span>
                              <div className="flex flex-wrap gap-2 p-3 bg-[#221C18] rounded-2xl border border-[#6B7C4F]/20">
                                {reorderPool.map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    disabled={!!grammarFeedback}
                                    onClick={() => handlePlaceWord(item)}
                                    className="px-3.5 py-1.5 rounded-xl bg-[#1A1512] border border-[#6B7C4F]/40 text-[#F2E8D5] font-bold text-sm font-display hover:border-[#E8802F] hover:bg-[#2B2622] active:scale-95 transition-all cursor-pointer"
                                  >
                                    {item.word}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {!grammarFeedback && (
                              <button
                                type="button"
                                disabled={reorderPlaced.length === 0}
                                onClick={handleVerifyGrammarAnswer}
                                className="btn-zucca w-full py-3.5 text-sm font-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                              >
                                Verifica risposta ⚡
                              </button>
                            )}
                          </div>
                        ) : isMultipleChoice ? (
                          /* MULTIPLE CHOICE UI (Non-committal) */
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {currEx.opzioni!.map((opt, i) => {
                                const isSelected = selectedGrammarOption === opt;
                                const isCorrect = opt.trim().toLowerCase() === currEx.rispostaCorretta.trim().toLowerCase();

                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    disabled={!!grammarFeedback}
                                    onClick={() => setSelectedGrammarOption(opt)}
                                    className={`p-3.5 rounded-2xl border-2 font-display text-xs sm:text-sm font-bold text-left transition-all cursor-pointer ${
                                      grammarFeedback
                                        ? isCorrect
                                          ? 'bg-[#6B7C4F]/30 border-[#6B7C4F] text-[#859966]'
                                          : isSelected
                                          ? 'bg-red-950/40 border-red-500 text-red-300'
                                          : 'bg-[#1A1512] border-white/5 opacity-50 text-[#F2E8D5]/60'
                                        : isSelected
                                        ? 'bg-[#E8802F]/20 border-[#E8802F] text-[#E8802F]'
                                        : 'bg-[#1A1512] border-[#6B7C4F]/20 hover:border-[#E8802F] text-[#F2E8D5]'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {!grammarFeedback && (
                              <button
                                type="button"
                                disabled={!selectedGrammarOption}
                                onClick={handleVerifyGrammarAnswer}
                                className="btn-zucca w-full py-3.5 text-sm font-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                              >
                                Verifica risposta ⚡
                              </button>
                            )}
                          </div>
                        ) : (
                          /* FILL IN BLANK UI */
                          <div className="space-y-3">
                            <input
                              type="text"
                              disabled={!!grammarFeedback}
                              value={grammarAnswer}
                              onChange={(e) => setGrammarAnswer(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && grammarAnswer.trim() && !grammarFeedback) {
                                  handleVerifyGrammarAnswer();
                                }
                              }}
                              placeholder="Scrivi qui la tua risposta..."
                              className="w-full p-3.5 bg-[#1A1512] border border-[#6B7C4F]/30 focus:border-[#E8802F] rounded-2xl text-sm font-display text-[#F2E8D5] outline-none"
                            />
                            {!grammarFeedback && (
                              <button
                                type="button"
                                disabled={!grammarAnswer.trim()}
                                onClick={handleVerifyGrammarAnswer}
                                className="btn-zucca w-full py-3 text-xs font-black cursor-pointer disabled:opacity-50"
                              >
                                Verifica risposta ⚡
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}

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
                        className="btn-zucca py-2 px-4 text-xs font-black shrink-0 cursor-pointer"
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
                  <ReadingSection
                    readingData={readingData}
                    targetLang={targetLang}
                    nativeLang={nativeLang}
                    targetName={targetName}
                    nativeName={nativeName}
                    currentLevel={currentStudyLevel}
                    onSaveVocabItem={onSaveVocabItem}
                    onSaveExerciseError={onSaveExerciseError}
                    onCompleteReading={(_lvl, score) => {
                      setReadingScore(score);
                      handleFinishReading();
                    }}
                    mode="guided_lesson"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
