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

export type Gender = 'M' | 'F' | 'undisclosed';

export interface UserAccount {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  nativeLanguage: string; // ISO 639-1 code e.g. "it"
  activeProfileId: string; // Target language code e.g. "en"
  createdAt: number;
  tutorialCompleted?: boolean;
  gender?: Gender;
  interessi?: string[];
}

export interface UserLanguageProfile {
  targetLanguage: string;
  createdAt: number;
  currentLevel?: CEFRLevel | 'Sotto A1';
  livelloStudioAttivo?: CEFRLevel | null;
  streakCount: number;
  totalAcorns: number;
  lastActiveDate: string | null;
  reminderEnabled: boolean;
  reminderTime: string;
  fcmToken?: string;
  fcmTokens?: string[];
  lastReminderSentDate?: string;
  interessi?: string[];
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
  livelloStudioAttivo?: CEFRLevel | null;
  lastTestDate?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  nativeLanguage?: string;
  activeProfileId?: string;
  fcmToken?: string;
  fcmTokens?: string[];
  lastReminderSentDate?: string;
  tutorialCompleted?: boolean;
  gender?: Gender;
  interessi?: string[];
}

export type VocabOrigin = 'import' | 'grammar_error' | 'reading_error' | 'exercise_error' | 'translator_search' | 'translator_lookup' | 'level_test_error' | 'special_section' | 'context_practice' | 'reading_word' | 'ai_suggested';

export type ExerciseErrorType = 'grammatica' | 'test_livello' | 'lettura';

export interface ExerciseError {
  id: string;
  domanda: string; // il testo dell'esercizio/domanda originale
  rispostaCorretta: string;
  tipo: ExerciseErrorType;
  argomentoRiferimento: string; // argomento di grammatica o livello, a seconda del tipo
  createdAt: number;
  box: number; // Leitner 1-5
  nextReviewAt: number; // timestamp in ms
  wrongCount: number;
  lastReviewedAt?: number | null;
  correctStreak?: number;
  opzioni?: string[];
  spiegazione?: string;
}

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

export type ExerciseType = 'multiple_choice' | 'fill_in_blank' | 'sentence_transformation' | 'matching' | 'translation' | 'sentence_reorder';

export interface Exercise {
  id: string;
  tipo: ExerciseType;
  type?: ExerciseType;
  domanda: string;
  question?: string;
  opzioni?: string[];
  options?: string[];
  rispostaCorretta: string;
  correctAnswer?: string;
  spiegazione: string;
  explanation?: string;
  scrambledWords?: string[];
  correctSentence?: string;
  instruction?: string;
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
  tipo?: 'multiple_choice' | 'open_ended';
  type?: 'multiple_choice' | 'open_ended';
  domanda: string;
  question?: string;
  opzioni?: string[];
  options?: string[];
  rispostaCorretta: string;
  correctAnswer?: string;
  spiegazione?: string;
  explanation?: string;
}

export interface ReadingText {
  id: string;
  level: CEFRLevel;
  title: string;
  titolo?: string;
  titleTranslation?: string;
  titoloTraduzione?: string;
  genre?: string;
  testo: string;
  paragraphs?: string[];
  estimatedMinutes: number;
  domande: ReadingQuestion[];
  questions?: ReadingQuestion[];
  vocabulary?: Array<{
    word: string;
    translation: string;
    ipa?: string;
    context?: string;
  }>;
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

export type ScenarioStatus = 'mai_provato' | 'in_corso' | 'completato';

export interface ScenarioRecord {
  scenarioId: string;
  nome: string;
  status: 'in_corso' | 'completato';
  volteCompletato: number;
  ultimaPraticaIl: number; // timestamp in ms
}

export interface ScenarioVocabItem {
  termine: string;
  traduzione: string;
  esempio: string;
}

export interface ScenarioDialogueQuestion {
  id: string;
  domanda: string;
  opzioni: string[];
  rispostaCorretta: string;
  spiegazione?: string;
}

export interface ScenarioDialogue {
  title: string;
  context: string;
  text: string;
  speakers?: string[];
  questions: ScenarioDialogueQuestion[];
}

export interface ScenarioContent {
  scenarioId: string;
  scenarioTitle: string;
  vocabulary: ScenarioVocabItem[];
  exercises: Exercise[];
  dialogue: ScenarioDialogue;
}

export type LessonType = 'vocabolario' | 'grammatica' | 'lettura';
export type LessonState = 'da_fare' | 'completata';

export interface LessonItem {
  id: string;
  tipo: LessonType;
  argomentoRiferimento: string; // id o nome dell'argomento grammaticale, tema della lettura o focus vocabolario
  stato: LessonState;
  ordine: number; // 1 a 8
  title?: string;
  subtitle?: string;
}

export interface LessonPath {
  id?: string;
  livelloTarget: string; // e.g. "A1", "A2", "B1", "B2", "C1", "C2"
  lezioni: LessonItem[];
  checkpointSuperato: boolean | null;
  miniTestSuperato: boolean | null;
  creatoIl: number; // timestamp in ms
}

export interface CheckpointQuestion {
  id: string;
  tipo: 'multiple_choice' | 'fill_in_blank';
  lezioneTipo: LessonType;
  domanda: string;
  opzioni: string[];
  rispostaCorretta: string;
  spiegazione: string;
}


