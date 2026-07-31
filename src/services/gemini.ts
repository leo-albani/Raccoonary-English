import { AnswerEvaluationResult, Exercise, ReadingText } from '../types';

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

export async function generateGrammarExercises(topicName: string, level: string = 'A1'): Promise<Exercise[]> {
  const res = await fetch('/api/generate-grammar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName, level }),
  });

  if (!res.ok) {
    throw new Error('Non sono riuscito a generare gli esercizi al momento.');
  }

  const data = await res.json();
  return data.exercises || [];
}

export async function generateReadingText(level: string = 'A1'): Promise<ReadingText> {
  const res = await fetch('/api/generate-reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level }),
  });

  if (!res.ok) {
    throw new Error('Non sono riuscito a generare il brano di lettura.');
  }

  return await res.json();
}

export async function explainWordInContext(word: string, contextSentence: string = ''): Promise<{
  term: string;
  translation: string;
  explanation: string;
  exampleSource: string;
  exampleTranslation: string;
}> {
  const res = await fetch('/api/explain-word', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, contextSentence }),
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
