import { AnswerEvaluationResult, Exercise, PhraseDeepDiveResult, ReadingText, ReadingQuestion, CEFRLevel, TranslationResult, WordDeepDiveResult, ScenarioContent } from '../types';
import { SEED_SCENARIOS } from '../data/scenarioSeeds';

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

export async function generateSuggestedVocab(
  count: number = 6,
  level: string = 'A1',
  targetLang?: string,
  nativeLang?: string,
  targetName?: string,
  nativeName?: string,
  existingTerms: string[] = []
): Promise<Array<{ termine: string; traduzione: string; esempio: string; esempioTraduzione?: string }>> {
  try {
    const res = await fetch('/api/generate-suggested-vocab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, level, targetLang, nativeLang, targetName, nativeName, existingTerms }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('Failed to generate suggested vocab via API, using level fallback:', err);
    return [];
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
  const rawList: any[] = data.exercises || [];

  return rawList
    .map((ex, idx) => {
      const q = (ex.domanda || ex.question || ex.frase || ex.instruction || '').trim();
      const a = (ex.rispostaCorretta || ex.correctAnswer || ex.correctSentence || '').trim();
      const exp = (ex.spiegazione || ex.explanation || 'Risposta esatta per questo argomento.').trim();
      const opts = Array.isArray(ex.opzioni)
        ? ex.opzioni
        : Array.isArray(ex.options)
        ? ex.options
        : [];

      const rawType = ex.tipo || ex.type || 'fill_in_blank';
      let scrambled = Array.isArray(ex.scrambledWords) && ex.scrambledWords.length > 0
        ? ex.scrambledWords.map((w: any) => String(w).trim()).filter((w: string) => w.length > 0)
        : Array.isArray(ex.parole) && ex.parole.length > 0
        ? ex.parole.map((w: any) => String(w).trim()).filter((w: string) => w.length > 0)
        : [];

      if (rawType === 'sentence_reorder' && scrambled.length < 2) {
        const sentenceToSplit = (ex.correctSentence || a || '').trim();
        if (sentenceToSplit) {
          const tokens = sentenceToSplit.split(/\s+/).map((w: string) => w.trim()).filter((w: string) => w.length > 0);
          if (tokens.length >= 2) {
            scrambled = [...tokens].sort(() => 0.5 - Math.random());
          }
        }
      }

      return {
        id: ex.id || `ex_${idx + 1}`,
        tipo: rawType,
        type: rawType,
        domanda: q || (rawType === 'sentence_reorder' ? 'Riordina le parole per formare la frase corretta:' : ''),
        question: q || (rawType === 'sentence_reorder' ? 'Riordina le parole per formare la frase corretta:' : ''),
        rispostaCorretta: a,
        correctAnswer: a,
        spiegazione: exp,
        explanation: exp,
        opzioni: opts,
        options: opts,
        scrambledWords: scrambled.length > 0 ? scrambled : undefined,
        correctSentence: ex.correctSentence || a,
      } as Exercise;
    })
    .filter((ex) => ex.domanda && ex.domanda.length >= 3 && ex.rispostaCorretta && ex.rispostaCorretta.length >= 1);
}

export async function generateReadingText(
  level: string = 'A1',
  genre: string = 'Sorprendimi',
  targetLang?: string,
  nativeLang?: string,
  targetName?: string,
  nativeName?: string
): Promise<ReadingText> {
  const res = await fetch('/api/generate-reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, genre, targetLang, nativeLang, targetName, nativeName }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const detailMsg = errData.details ? `: ${errData.details}` : (errData.error ? `: ${errData.error}` : '');
    throw new Error(`Non sono riuscito a generare il brano di lettura${detailMsg}`);
  }

  const raw = await res.json();

  // Normalize paragraphs and full text
  const paragraphs: string[] = Array.isArray(raw.paragraphs) && raw.paragraphs.length > 0
    ? raw.paragraphs
    : typeof raw.testo === 'string' && raw.testo.trim().length > 0
    ? raw.testo.split(/\n\n+/).filter(Boolean)
    : [raw.testo || ''];

  const testo: string = paragraphs.join('\n\n') || raw.testo || '';

  // Calculate estimated reading minutes
  const wordCount = testo.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 70));

  // Normalize questions / comprehension questions
  const rawQuestions: any[] = Array.isArray(raw.questions)
    ? raw.questions
    : Array.isArray(raw.domande)
    ? raw.domande
    : Array.isArray(raw.domandeComprensione)
    ? raw.domandeComprensione
    : [];

  const domande: ReadingQuestion[] = rawQuestions.map((q: any, idx: number) => {
    const qText = q.domanda || q.question || `Domanda ${idx + 1}`;
    const opts: string[] = Array.isArray(q.opzioni)
      ? q.opzioni
      : Array.isArray(q.options)
      ? q.options
      : [];

    let correctAns = '';
    if (typeof q.rispostaCorretta === 'string' && q.rispostaCorretta.trim()) {
      correctAns = q.rispostaCorretta.trim();
    } else if (typeof q.correctAnswer === 'string' && q.correctAnswer.trim()) {
      correctAns = q.correctAnswer.trim();
    } else if (typeof q.correctIndex === 'number' && opts[q.correctIndex]) {
      correctAns = opts[q.correctIndex];
    } else if (opts.length > 0) {
      correctAns = opts[0];
    }

    const exp = q.spiegazione || q.explanation || '';

    return {
      id: q.id || `q_${idx + 1}`,
      tipo: 'multiple_choice' as const,
      type: 'multiple_choice' as const,
      domanda: qText,
      question: qText,
      opzioni: opts,
      options: opts,
      rispostaCorretta: correctAns,
      correctAnswer: correctAns,
      spiegazione: exp,
      explanation: exp,
    };
  }).filter((q) => q.domanda && q.rispostaCorretta);

  const title = raw.title || raw.titolo || 'Brano di Lettura';
  const titleTranslation = raw.titleTranslation || raw.titoloTraduzione || '';

  return {
    id: raw.id || `reading_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    level: (raw.level || level) as CEFRLevel,
    title,
    titolo: title,
    titleTranslation,
    titoloTraduzione: titleTranslation,
    genre: raw.genre || genre,
    testo,
    paragraphs,
    estimatedMinutes: raw.estimatedMinutes || estimatedMinutes,
    domande,
    questions: domande,
    vocabulary: raw.vocabulary || [],
  };
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
  const executeCall = async () => {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, nativeLang, targetLang, nativeName, targetName }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detailMsg = errData.details ? `: ${errData.details}` : (errData.error ? `: ${errData.error}` : '');
      throw new Error(`Traduzione non disponibile al momento${detailMsg}`);
    }

    return await res.json();
  };

  try {
    return await executeCall();
  } catch (firstError: any) {
    console.warn('First translate attempt failed, retrying once...', firstError);
    try {
      return await executeCall();
    } catch (retryError: any) {
      throw new Error(retryError.message || 'Non sono riuscito a tradurre in questo momento.');
    }
  }
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

export async function generateScenarioContent(
  scenarioContext: string,
  scenarioId: string = 'custom',
  level: string = 'A2',
  nativeLang: string = 'it',
  targetLang: string = 'en',
  nativeName: string = 'Italiano',
  targetName: string = 'Inglese'
): Promise<ScenarioContent> {
  try {
    const res = await fetch('/api/generate-scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioContext,
        scenarioId,
        level,
        nativeLang,
        targetLang,
        nativeName,
        targetName,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data: ScenarioContent = await res.json();
    if (data && data.vocabulary && data.vocabulary.length > 0) {
      return data;
    }
    throw new Error('Formato scenario non valido');
  } catch (err: any) {
    console.warn('API scenario generation failed, checking seed fallback:', err);
    if (SEED_SCENARIOS[scenarioId]) {
      return {
        ...SEED_SCENARIOS[scenarioId],
        scenarioId,
      };
    }
    throw new Error(err.message || 'Impossibile generare lo scenario al momento.');
  }
}

export async function generateCheckpointQuestions(
  level: string = 'A1',
  topicsSummary: string[] = [],
  targetLang: string = 'en',
  nativeLang: string = 'it',
  targetName: string = 'Inglese',
  nativeName: string = 'Italiano'
): Promise<any[]> {
  try {
    const res = await fetch('/api/generate-checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, topicsSummary, targetLang, nativeLang, targetName, nativeName }),
    });

    if (!res.ok) {
      throw new Error('Impossibile generare il checkpoint al momento.');
    }

    const data = await res.json();
    return data.questions || [];
  } catch (err: any) {
    console.error('Error in generateCheckpointQuestions:', err);
    throw err;
  }
}

export async function generateMiniTestQuestions(
  currentLevel: string = 'A1',
  nextLevel: string = 'A2',
  targetLang: string = 'en',
  nativeLang: string = 'it',
  targetName: string = 'Inglese',
  nativeName: string = 'Italiano'
): Promise<any[]> {
  try {
    const res = await fetch('/api/generate-mini-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentLevel, nextLevel, targetLang, nativeLang, targetName, nativeName }),
    });

    if (!res.ok) {
      throw new Error('Impossibile generare il mini-test al momento.');
    }

    const data = await res.json();
    return data.questions || [];
  } catch (err: any) {
    console.error('Error in generateMiniTestQuestions:', err);
    throw err;
  }
}

