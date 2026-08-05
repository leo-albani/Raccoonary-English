import { AnswerEvaluationResult, Exercise, PhraseDeepDiveResult, ReadingText, TranslationResult, WordDeepDiveResult } from '../types';

export async function evaluateUserAnswer(
  term: string,
  translation: string,
  userAnswer: string,
  synonyms: string[] = []
): Promise<AnswerEvaluationResult> {
  try {
    const res = await fetch('/api/evaluate-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term, translation, userAnswer, synonyms }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('Fallback evaluation due to API error:', err);
    const cleanUser = userAnswer.trim().toLowerCase();
    const cleanSaved = translation.trim().toLowerCase();
    const isSynonym = synonyms.some((s) => s.trim().toLowerCase() === cleanUser);
    const isExact = cleanUser === cleanSaved;

    return {
      corretto: isExact || isSynonym,
      spiegazione: isExact || isSynonym
        ? 'Perfetto! Traduzione corretta.'
        : `Quasi! ${term} vuol dire "${translation}".`,
      synonymAccepted: isSynonym && !isExact,
    };
  }
}

export async function generateGrammarExercises(
  topicName: string,
  level: string = 'A1',
  targetLang?: string,
  nativeLang?: string,
  targetName?: string,
  nativeName?: string
): Promise<Exercise[]> {
  const res = await fetch('/api/generate-grammar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName, level, targetLang, nativeLang, targetName, nativeName }),
  });

  if (!res.ok) {
    throw new Error('Non sono riuscito a generare gli esercizi al momento.');
  }

  const data = await res.json();
  return data.exercises || [];
}

export async function generateReadingText(
  level: string = 'A1',
  targetLang?: string,
  nativeLang?: string,
  targetName?: string,
  nativeName?: string
): Promise<ReadingText> {
  const res = await fetch('/api/generate-reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, targetLang, nativeLang, targetName, nativeName }),
  });

  if (!res.ok) {
    throw new Error('Non sono riuscito a generare il brano di lettura.');
  }

  return await res.json();
}

export async function explainWordInContext(
  word: string,
  contextSentence: string = '',
  nativeName?: string,
  targetName?: string
): Promise<{
  term: string;
  translation: string;
  explanation: string;
  exampleSource: string;
  exampleTranslation: string;
}> {
  const res = await fetch('/api/explain-word', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, contextSentence, nativeName, targetName }),
  });

  if (!res.ok) {
    throw new Error('Spiegazione non disponibile.');
  }

  return await res.json();
}

export async function parseUnstructuredImport(content: string): Promise<any[]> {
  const res = await fetch('/api/parse-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error('Parsing non riuscito.');
  }

  const data = await res.json();
  return data.items || [];
}

export async function translateText(
  text: string,
  nativeLang: string = 'it',
  targetLang: string = 'en',
  nativeName?: string,
  targetName?: string
): Promise<TranslationResult> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, nativeLang, targetLang, nativeName, targetName }),
  });

  if (!res.ok) {
    throw new Error('Traduzione non disponibile al momento.');
  }

  return await res.json();
}

export async function getWordDeepDive(word: string, contextSentence: string = ''): Promise<WordDeepDiveResult> {
  const res = await fetch('/api/deep-dive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, contextSentence }),
  });

  if (!res.ok) {
    throw new Error('Approfondimento non disponibile.');
  }

  return await res.json();
}

export async function getPhraseDeepDive(phrase: string): Promise<PhraseDeepDiveResult> {
  const res = await fetch('/api/deep-dive-phrase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phrase }),
  });

  if (!res.ok) {
    throw new Error('Approfondimento frase non disponibile.');
  }

  return await res.json();
}

export async function generateLevelTest(
  targetLang: string = 'en',
  nativeLang: string = 'it',
  targetName: string = 'Inglese',
  nativeName: string = 'Italiano'
): Promise<any[]> {
  const res = await fetch('/api/generate-level-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetLang, nativeLang, targetName, nativeName }),
  });

  if (!res.ok) {
    throw new Error('Impossibile generare il test di livello al momento.');
  }

  const data = await res.json();
  return data.questions || [];
}
