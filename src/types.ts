/**
 * Data models for Raccoonary
 */

export type RaccoonPose = 'greeting' | 'happy' | 'thinking' | 'digging' | 'sleeping' | 'reading';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface UITranslationSet {
  langCode: string;
  strings: Record<string, string>;
  generatedAt?: number;
}

export interface UserAccount {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  nativeLanguage: string; // ISO 639-1 code e.g. "it"
  activeProfileId: string; // Target language code e.g. "en"
  createdAt: number;
}

export interface UserLanguageProfile {
  targetLanguage: string;
  createdAt: number;
  currentLevel?: CEFRLevel | 'Sotto A1';
  streakCount: number;
  totalAcorns: number;
  lastActiveDate: string | null;
  reminderEnabled: boolean;
  reminderTime: string;
  unlockedOutfits?: string[];
  activeOutfit?: string;
  streakFreezes?: number;
}

export interface UserProfile {
  userId: string;
  createdAt: number;
  streakCount: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalAcorns: number;
  reminderEnabled: boolean;
  reminderTime: string; // HH:mm
  onboardingCompleted: boolean;
  currentLevel?: CEFRLevel | 'Sotto A1';
  lastTestDate?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  nativeLanguage?: string;
  activeProfileId?: string;
  unlockedOutfits?: string[];
  activeOutfit?: string;
  streakFreezes?: number;
}

export type VocabOrigin = 'import' | 'grammar_error' | 'reading_error' | 'exercise_error' | 'translator_search' | 'translator_lookup' | 'level_test_error' | 'special_section';

export interface TranslationResult {
  lingua_origine: 'it' | 'en';
  traduzione_principale: string;
  alternative: string[];
}

export interface WordDeepDiveResult {
  definizione: string;
  nota_uso: string;
  esempi: { en: string; it: string }[];
}

export interface PhraseDeepDiveResult {
  tipo: 'idiomatico' | 'letterale';
  quando_si_usa: string;
  esempi: { en: string; it: string }[];
}

export interface VocabItem {
  id: string;
  term: string;
  translation: string;
  sourceLang: 'it' | 'en';
  targetLang: 'it' | 'en';
  synonyms: string[];
  exampleSource: string; // clean text without HTML
  exampleTranslation: string;
  usageNote?: string; // Optional usage note or context (e.g. quando_si_usa)
  origin: VocabOrigin;
  originDetail: string; // topic name or CEFR level
  createdAt: number;
  lastReviewedAt: number | null;
  box: number; // 1 to 5
  nextReviewAt: number; // timestamp in ms
  correctStreak: number;
  wrongCount: number;
}

export type ExerciseType = 'multiple_choice' | 'fill_in_blank' | 'sentence_transformation' | 'matching' | 'translation';

export interface Exercise {
  id: string;
  tipo: ExerciseType;
  domanda: string;
  opzioni?: string[];
  rispostaCorretta: string;
  spiegazione: string;
  // Extra properties for matching items if applicable
  matchingPairs?: { term: string; translation: string }[];
}

export interface GrammarTopic {
  id: string;
  name: string;
  level: CEFRLevel;
  category: 'Base' | 'Intermedio' | 'Avanzato';
  summary: string;
  examples: string[];
}

export interface GrammarTopicProgress {
  topicId: string;
  topicName: string;
  exercisesCompleted: number;
  lastGeneratedAt: number | null;
  currentExerciseSet: Exercise[];
  passed: boolean;
  bestScorePercent: number;
  lastScorePercent: number;
  attemptsCount: number;
}

export interface LevelTestQuestion {
  id: string;
  level: CEFRLevel;
  tipo: 'multiple_choice' | 'fill_in_blank' | 'sentence_transformation' | 'reading_comprehension';
  testo_contesto?: string;
  domanda: string;
  opzioni?: string[];
  rispostaCorretta: string;
}

export interface LevelTestResult {
  id: string;
  takenAt: number;
  resultLevel: CEFRLevel | 'Sotto A1';
  totalCorrect: number;
  totalQuestions: number;
  levelBreakdown: Record<CEFRLevel, { correct: number; total: number; percent: number; passed: boolean }>;
}

export interface ReadingQuestion {
  id: string;
  tipo: 'multiple_choice' | 'open_ended';
  domanda: string;
  opzioni?: string[];
  rispostaCorretta: string;
}

export interface ReadingText {
  id: string;
  level: CEFRLevel;
  title: string;
  testo: string;
  estimatedMinutes: number;
  domande: ReadingQuestion[];
}

export interface ReadingProgress {
  level: CEFRLevel;
  textsCompleted: number;
  lastTextId: string | null;
}

export interface IrregularVerb {
  base: string;
  pastSimple: string;
  pastParticiple: string;
  translation: string;
}

export interface ParsedImportRow {
  term: string;
  translation: string;
  sourceLang: 'it' | 'en';
  targetLang: 'it' | 'en';
  synonyms: string[];
  exampleSource: string;
  exampleTranslation: string;
  selected: boolean;
}

export interface AnswerEvaluationResult {
  corretto: boolean;
  spiegazione: string;
  synonymAccepted?: boolean;
}

export interface SpecialSectionItem {
  voce: string;
  significato: string;
  esempio?: string;
}

export interface SpecialSection {
  id: string;
  nome: string;
  voci: SpecialSectionItem[];
}

export interface SharedLanguagePairContent {
  syllabus: {
    base: GrammarTopic[];
    intermedio: GrammarTopic[];
    avanzato: GrammarTopic[];
  };
  specialSections: SpecialSection[];
  irregularVerbsEquivalent: {
    applicabile: boolean;
    verbi: IrregularVerb[];
  };
  generatedAt: number;
  generatedBy: 'seed' | 'gemini';
}

