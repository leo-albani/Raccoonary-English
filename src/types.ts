/**
 * Data models for Raccoonary
 */

export type RaccoonPose = 'greeting' | 'happy' | 'thinking' | 'digging' | 'sleeping' | 'reading';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface UserProfile {
  userId: string;
  createdAt: number;
  streakCount: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalAcorns: number;
  reminderEnabled: boolean;
  reminderTime: string; // HH:mm
  onboardingCompleted: boolean;
}

export type VocabOrigin = 'import' | 'grammar_error' | 'reading_error' | 'exercise_error';

export interface VocabItem {
  id: string;
  term: string;
  translation: string;
  sourceLang: 'it' | 'en';
  targetLang: 'it' | 'en';
  synonyms: string[];
  exampleSource: string; // clean text without HTML
  exampleTranslation: string;
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
