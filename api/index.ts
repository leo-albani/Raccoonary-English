import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const router = express.Router();

app.use(express.json({ limit: "10mb" }));

// Enable CORS for all API requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Initialize Gemini Client lazily or safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined on server.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Clean raw Gemini output if wrapped in json code fence
function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned;
}

// API Health Check with configuration info
router.get("/health", (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  res.json({
    status: "ok",
    app: "Raccoonary",
    geminiConfigured: Boolean(apiKey && apiKey.trim().length > 0),
    environment: isVercel ? "vercel" : "node",
    timestamp: new Date().toISOString()
  });
});

// API 0: Generate Shared Content for Language Pair
router.post("/generate-shared-content", async (req, res) => {
  try {
    const { nativeLang = "it", targetLang = "en", nativeName = "Italiano", targetName = "Inglese" } = req.body;

    const ai = getGeminiClient();

    const cefrNote = targetLang === "ja" ? " (usa l'adattamento riconosciuto CEFR-J)" : "";
    const syllabusPrompt = `Genera un syllabus di grammatica per una persona di madrelingua ${nativeName} che impara ${targetName}, organizzato per livello CEFR (base A1-A2, intermedio B1-B2, avanzato C1-C2)${cefrNote}, stesso formato già usato per l'inglese: argomenti grammaticali specifici e realmente rilevanti per ${targetName}, non una traduzione degli argomenti inglesi.
Rispondi SOLO in JSON con la seguente struttura esatta:
{
  "base": [
    {
      "id": "string_univoco",
      "name": "Nome argomento",
      "level": "A1",
      "category": "Base",
      "summary": "Breve sintesi in ${nativeName}",
      "examples": ["1-2 frasi d'esempio in ${targetName}"]
    }
  ],
  "intermedio": [
    {
      "id": "string_univoco",
      "name": "Nome argomento",
      "level": "B1",
      "category": "Intermedio",
      "summary": "Breve sintesi in ${nativeName}",
      "examples": ["1-2 frasi d'esempio in ${targetName}"]
    }
  ],
  "avanzato": [
    {
      "id": "string_univoco",
      "name": "Nome argomento",
      "level": "C1",
      "category": "Avanzato",
      "summary": "Breve sintesi in ${nativeName}",
      "examples": ["1-2 frasi d'esempio in ${targetName}"]
    }
  ]
}`;

    const specialPrompt = `Per una persona di madrelingua ${nativeName} che impara ${targetName}, proponi 2-4 sezioni di approfondimento mirate alle difficoltà tipiche di questa combinazione di lingue (sul modello di "falsi amici" o "phrasal verbs" per l'inglese).
Alcune lingue non hanno equivalenti diretti di questi concetti: proponi solo sezioni realmente rilevanti, anche se sono diverse da quelle usate per l'inglese.
Per ciascuna sezione, genera anche una lista curata di partenza di 20-30 voci, con voce in ${targetName}, significato in ${nativeName}, ed esempio in ${targetName}.
Rispondi SOLO in JSON con la struttura esatta:
{
  "sezioni": [
    {
      "id": "string_univoco",
      "nome": "Nome Sezione in ${nativeName}",
      "voci": [
        { "voce": "...", "significato": "...", "esempio": "..." }
      ]
    }
  ]
}`;

    const irregularPrompt = `Se ${targetName} ha una categoria di verbi o coniugazioni irregolari paragonabile ai verbi irregolari inglesi (utile da imparare a memoria per un principiante), generane una lista dei principali con traduzione in ${nativeName}.
Se il concetto non si applica bene a questa lingua, rispondi con lista vuota e applicabile: false.
Rispondi SOLO in JSON con la seguente struttura esatta:
{
  "applicabile": true,
  "verbi": [
    { "base": "verbo", "pastSimple": "forma1", "pastParticiple": "forma2", "translation": "traduzione in ${nativeName}" }
  ]
}`;

    const [syllabusRes, specialRes, irregularRes] = await Promise.all([
      ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: syllabusPrompt,
        config: { responseMimeType: "application/json" },
      }),
      ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: specialPrompt,
        config: { responseMimeType: "application/json" },
      }),
      ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: irregularPrompt,
        config: { responseMimeType: "application/json" },
      }),
    ]);

    const syllabusData = JSON.parse(cleanJsonOutput(syllabusRes.text || "{}"));
    const specialData = JSON.parse(cleanJsonOutput(specialRes.text || "{}"));
    const irregularData = JSON.parse(cleanJsonOutput(irregularRes.text || "{}"));

    res.json({
      syllabus: {
        base: syllabusData.base || [],
        intermedio: syllabusData.intermedio || [],
        avanzato: syllabusData.avanzato || [],
      },
      specialSections: specialData.sezioni || [],
      irregularVerbsEquivalent: {
        applicabile: irregularData.applicabile ?? false,
        verbi: irregularData.verbi || [],
      },
      generatedAt: Date.now(),
      generatedBy: "gemini",
    });
  } catch (err: any) {
    console.error("Error generating shared content:", err);
    res.status(500).json({ error: err.message || "Failed to generate shared content" });
  }
});

// API 0.5: Generate UI Translations for Native Language
router.post("/generate-ui-translations", async (req, res) => {
  try {
    const { nativeLang = "en", nativeName = "English", masterTranslations } = req.body;
    const ai = getGeminiClient();

    if (!masterTranslations || typeof masterTranslations !== "object") {
      return res.status(400).json({ error: "masterTranslations object is required" });
    }

    const prompt = `Traduci il seguente dizionario di stringhe UI in lingua ${nativeName} (${nativeLang}).
Le stringhe originali sono in italiano. Mantieni le chiavi ESATTAMENTE invariate e traduci solo i valori.
Preserva i placeholder come {word}, {count}, {name}, {level} e tutte le emoji.
Restituisci SOLO un oggetto JSON con le stesse chiavi e i valori tradotti.

Dizionario:
${JSON.stringify(masterTranslations, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(cleanJsonOutput(response.text || "{}"));
    res.json({ translations: parsed });
  } catch (err: any) {
    console.error("Error generating UI translations:", err);
    res.status(500).json({ error: err.message || "Failed to generate UI translations" });
  }
});

// API 1: Evaluate Answer (Non-rigid Spaced Repetition)
router.post("/evaluate-answer", async (req, res) => {
  try {
    const { term, translation, userAnswer, synonyms = [] } = req.body;

    if (!term || !translation || userAnswer === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const ai = getGeminiClient();
    const prompt = `Valuta se la risposta data dall'utente per la traduzione di una parola o frase è semanticamente corretta.
Termine da tradurre: "${term}"
Traduzione di riferimento: "${translation}"
Sinonimi/Alternative accettabili: ${JSON.stringify(synonyms)}
Risposta data dall'utente: "${userAnswer}"

Criteri di valutazione:
- Sii flessibile con piccoli errori di battitura (typo lievi, accenti mancanti, punteggiatura).
- Accetta sinonimi validi e risposte semanticamente corrette anche se non identiche alla parola di riferimento.
- Considera parzialmente corretta se il significato è quasi centrato ma con una sfumatura imprecisa.
- Spiega in una riga gentile in italiano perché è corretta o cosa si poteva migliorare.

Rispondi SOLO in formato JSON con la seguente struttura:
{
  "isCorrect": boolean,
  "score": number (da 0 a 1, es. 1 per perfetto, 0.8 per typo lieve, 0 per errato),
  "feedback": "Spiegazione breve e incoraggiante in italiano",
  "detectedTypo": boolean (true se c'è solo un typo lieve)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    res.json(JSON.parse(cleanJsonOutput(rawText)));
  } catch (err: any) {
    console.error("Error evaluating answer:", err);
    res.status(500).json({ error: err.message || "Evaluation failed" });
  }
});

// API 2: Generate Grammar Exercises
router.post("/generate-grammar", async (req, res) => {
  try {
    const { topicName, level = "A1", targetLang = "en", nativeLang = "it", targetName = "Inglese", nativeName = "Italiano" } = req.body;
    if (!topicName) {
      return res.status(400).json({ error: "topicName is required" });
    }

    const ai = getGeminiClient();
    const prompt = `Genera una lezione e 5 esercizi grammaticali su: "${topicName}" (Livello ${level}).
Destinatario: studente di madrelingua ${nativeName} (${nativeLang}) che impara la lingua ${targetName} (${targetLang}).
Includi:
1. Una spiegazione chiara e concisa in ${nativeName} con regole, schemi ed esempi pratici in ${targetName}.
2. 5 esercizi interattivi di vario tipo:
   - "multiple_choice": domanda con 4 opzioni e 1 corretta.
   - "fill_in_blank": frase con "___" da completare con la forma corretta.
   - "sentence_reorder": lista di parole mescolate ("scrambledWords") da riordinare nella frase corretta ("correctSentence").
Ogni esercizio deve avere una spiegazione del perché la risposta è corretta.

Rispondi SOLO in JSON con la seguente struttura esatta:
{
  "theory": "Testo formattato in Markdown con spiegazione, tabelle/esempi",
  "exercises": [
    {
      "id": "ex_1",
      "type": "multiple_choice" | "fill_in_blank" | "sentence_reorder",
      "instruction": "Istruzione per l'esercizio",
      "question": "Frase con ___ o domanda",
      "options": ["opzione1", "opzione2", "opzione3", "opzione4"] (solo per multiple_choice),
      "correctAnswer": "risposta esatta",
      "scrambledWords": ["parola1", "parola2"] (solo per sentence_reorder),
      "correctSentence": "Frase completa ordinata" (solo per sentence_reorder),
      "explanation": "Breve spiegazione della soluzione"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    res.json(JSON.parse(cleanJsonOutput(rawText)));
  } catch (err: any) {
    console.error("Error generating grammar exercises:", err);
    res.status(500).json({ error: err.message || "Failed to generate grammar content" });
  }
});

// API 3: Generate Reading Text & Questions
router.post("/generate-reading", async (req, res) => {
  try {
    const {
      level = "A1",
      genre = "Sorprendimi",
      targetLang = "en",
      nativeLang = "it",
      targetName = "Inglese",
      nativeName = "Italiano"
    } = req.body;

    const wordLengths: Record<string, string> = {
      A1: "100-150 parole",
      A2: "120-180 parole",
      B1: "200-250 parole",
      B2: "250-320 parole",
      C1: "350-450 parole",
      C2: "450-550 parole",
    };
    const wordRange = wordLengths[level] || "150-250 parole";

    const ai = getGeminiClient();
    const genreInstruction = genre && genre !== "Sorprendimi"
      ? `Argomento: genere "${genre}".`
      : 'Argomento: genere "Sorprendimi" (scegli tu un argomento vario, curioso e interessante).';

    const prompt = `Scrivi un testo in ${targetName} (${targetLang}) di livello CEFR ${level}, lunghezza ${wordRange}, stile simile ai testi degli esami Cambridge per quel livello. ${genreInstruction}
La persona che legge è di madrelingua ${nativeName} (${nativeLang}).

Includi:
1. Titolo in ${targetName} e traduzione in ${nativeName}.
2. Testo suddiviso in paragrafi ben articolati e piacevoli da leggere.
3. 3-4 domande di comprensione a scelta multipla (domande e opzioni in ${targetName}, con spiegazione in ${nativeName}).
4. 4-6 vocaboli chiave evidenziati nel testo con traduzione in ${nativeName}, pronuncia IPA approssimata e contesto d'uso.

Rispondi SOLO in JSON con la struttura esatta:
{
  "title": "Titolo in ${targetName}",
  "titleTranslation": "Titolo in ${nativeName}",
  "level": "${level}",
  "genre": "${genre || 'Sorprendimi'}",
  "targetLanguage": "${targetLang}",
  "paragraphs": ["Paragrafo 1...", "Paragrafo 2..."],
  "vocabulary": [
    {
      "word": "termine in ${targetName}",
      "translation": "traduzione in ${nativeName}",
      "ipa": "/pronuncia/",
      "context": "breve frase di contesto"
    }
  ],
  "questions": [
    {
      "id": "q_1",
      "question": "Domanda in ${targetName}?",
      "options": ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
      "correctIndex": 0,
      "explanation": "Spiegazione in ${nativeName} del perché è corretta"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    res.json(JSON.parse(cleanJsonOutput(rawText)));
  } catch (err: any) {
    console.error("Error generating reading passage:", err);
    res.status(500).json({ error: err.message || "Failed to generate reading passage" });
  }
});

// API 4: Explain highlighted word or phrase in reading
router.post("/explain-word", async (req, res) => {
  try {
    const { word, contextSentence, nativeName = "Italiano", targetName = "Inglese" } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Word is required" });
    }

    const ai = getGeminiClient();
    const prompt = `Spiega la parola o espressione in ${targetName} "${word}" trovata nella frase: "${contextSentence || word}".
L'utente è di madrelingua ${nativeName}.
Fornisci:
- Traduzione principale in ${nativeName}
- Parte del discorso (sostantivo, verbo, aggettivo, ecc.)
- Definizione semplice e chiara in ${nativeName}
- 2 frasi d'esempio con traduzione
- Eventuali sinonimi o falsi amici degni di nota

Rispondi SOLO in JSON:
{
  "word": "${word}",
  "translation": "...",
  "partOfSpeech": "...",
  "definition": "...",
  "examples": [
    { "target": "frase in ${targetName}", "native": "traduzione in ${nativeName}" }
  ],
  "notes": "eventuale nota utile o falso amico"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    res.json(JSON.parse(cleanJsonOutput(rawText)));
  } catch (err: any) {
    console.error("Error explaining word:", err);
    res.status(500).json({ error: err.message || "Failed to explain word" });
  }
});

// API 5: Parse unstructured file (PDF or raw text) for vocabulary import
router.post("/parse-import", async (req, res) => {
  try {
    const { content, targetLang = "en", nativeLang = "it", targetName = "Inglese", nativeName = "Italiano" } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const ai = getGeminiClient();
    const prompt = `Estrai coppie di vocaboli (termine in ${targetName} -> traduzione in ${nativeName}) dal seguente testo non strutturato.
Il testo potrebbe essere una lista di vocaboli, appunti, una tabella testuale o un documento.
Per ogni vocabolo individuato, restituisci:
- term: il termine nella lingua target (${targetName})
- translation: la traduzione nella lingua nativa (${nativeName})
- example: una breve frase d'esempio nella lingua target (se deducibile o generata)
- exampleTranslation: traduzione dell'esempio in lingua nativa
- level: stima del livello CEFR (A1, A2, B1, B2, C1, C2)
- tags: eventuali tag tematici (es. "viaggi", "cibo", "lavoro", "generale")

Testo da analizzare:
"""
${content.slice(0, 15000)}
"""

Rispondi SOLO in JSON con un array di oggetti:
[
  {
    "term": "parola/frase",
    "translation": "traduzione",
    "example": "esempio",
    "exampleTranslation": "traduzione esempio",
    "level": "A1",
    "tags": ["tag1"]
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "[]";
    res.json(JSON.parse(cleanJsonOutput(rawText)));
  } catch (err: any) {
    console.error("Error parsing import content:", err);
    res.status(500).json({ error: err.message || "Failed to parse import content" });
  }
});

// API 6: Translate sentence or word (Native <-> Target)
router.post("/translate", async (req, res) => {
  try {
    const { text, nativeName = "Italiano", targetName = "Inglese", nativeLang = "it", targetLang = "en" } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Traduci il seguente testo: "${text.trim()}".
Le lingue di riferimento sono:
- Lingua Nativa: ${nativeName} (${nativeLang})
- Lingua Target: ${targetName} (${targetLang})

Rileva automaticamente se il testo inserito è in ${nativeName} o in ${targetName}:
- Se è in ${nativeName}, traducilo in ${targetName}.
- Se è in ${targetName}, traducilo in ${nativeName}.

Fornisci:
1. "lingua_origine": codice della lingua rilevata ('${nativeLang}' oppure '${targetLang}').
2. "traduzione_principale": la traduzione più naturale e accurata.
3. "alternative": array di 1-3 traduzioni alternative o sfumature di significato (se presenti).

Rispondi SOLO in JSON con la struttura esatta:
{
  "lingua_origine": "...",
  "traduzione_principale": "...",
  "alternative": ["...", "..."]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    res.json(JSON.parse(cleanJsonOutput(rawText)));
  } catch (err: any) {
    console.error("Error translating text:", err);
    res.status(500).json({ error: err.message || "Failed to translate text" });
  }
});

// API 7: Word Deep Dive for individual word in context
router.post("/deep-dive", async (req, res) => {
  try {
    const { word, contextSentence = "", nativeName = "Italiano", targetName = "Inglese", nativeLang = "it", targetLang = "en" } = req.body;
    if (!word || !word.trim()) {
      return res.status(400).json({ error: "Word is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Fornisci un approfondimento linguistico completo per la parola in ${targetName} (${targetLang}) "${word.trim()}" (trovata nel contesto: "${contextSentence}").
La spiegazione deve essere rivolta a una persona di madrelingua ${nativeName} (${nativeLang}).

Includi:
1. "ipa": trascrizione fonetica IPA.
2. "livello": stima CEFR (A1, A2, B1, B2, C1, C2).
3. "significato": spiegazione chiara del significato principale in ${nativeName}.
4. "sfumature": spiegazione di quando e come si usa, registro (formale/colloquiale/slang), differenze con parole simili.
5. "collocazioni": 3-4 espressioni o collocazioni tipiche con questa parola (con traduzione in ${nativeName}).
6. "falsi_amici": se rilevante per chi parla ${nativeName}, altrimenti null.
7. "esempi": 2-3 frasi d'esempio con traduzione a fronte.

Rispondi SOLO in JSON con la struttura esatta:
{
  "ipa": "/.../",
  "livello": "B1",
  "significato": "...",
  "sfumature": "...",
  "collocazioni": [
    { "target": "...", "native": "..." }
  ],
  "falsi_amici": "..." o null,
  "esempi": [
    { "target": "...", "native": "..." }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    res.json(JSON.parse(cleanJsonOutput(rawText)));
  } catch (err: any) {
    console.error("Error getting word deep dive:", err);
    res.status(500).json({ error: err.message || "Failed to get deep dive" });
  }
});

// API 8: Deep Dive Phrase
router.post("/deep-dive-phrase", async (req, res) => {
  try {
    const { phrase, nativeName = "Italiano", targetName = "Inglese", nativeLang = "it", targetLang = "en" } = req.body;
    if (!phrase || !phrase.trim()) {
      return res.status(400).json({ error: "Phrase is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Fornisci un approfondimento sulla frase/espressione in ${targetName} (${targetLang}) "${phrase.trim()}".
Se è un'espressione idiomatica o un modo di dire, spiegalo chiaramente in ${nativeName}: non si traduce parola per parola, indica il significato reale d'uso. Se invece è una frase letterale, indicalo comunque.
Includi: quando si usa (contesto/registro tipico), 2-3 frasi di esempio in ${targetName} con traduzione in ${nativeName} che mostrano l'uso reale dell'espressione.
Rispondi SOLO in JSON:
{"tipo": "idiomatico|letterale", "quando_si_usa": "...", "esempi": [{"en": "...", "it": "..."}]}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    res.json(JSON.parse(cleanJsonOutput(rawText)));
  } catch (err: any) {
    console.error("Error getting phrase deep dive:", err);
    const phrase = (req.body.phrase || "").trim();
    res.json({
      tipo: "idiomatico",
      quando_si_usa: `Espressione "${phrase}": utilizzata in contesti colloquiali o quotidiani.`,
      esempi: [
        { en: phrase, it: `Uso reale per "${phrase}"` }
      ],
    });
  }
});

// API 8.5: Generate Scenario Mini-Gym
router.post("/generate-scenario", async (req, res) => {
  try {
    const {
      scenarioContext = "Viaggio e vacanze",
      scenarioId = "travel",
      level = "A2",
      nativeLang = "it",
      targetLang = "en",
      nativeName = "Italiano",
      targetName = "Inglese",
    } = req.body;

    const ai = getGeminiClient();

    const prompt = `Sei un tutor esperto di ${targetName} per studenti di madrelingua ${nativeName}.
Crea una palestra a tema pratico (Scenario) ambientata nel contesto reale: "${scenarioContext}".
Livello CEFR di riferimento dello studente: ${level}.

Requisiti:
1. "scenarioTitle": un titolo breve, chiaro e pulito in ${nativeName} per questo scenario (es. "Al Ristorante", "All'Aeroporto", "Intervista di Lavoro"). Se l'utente ha scritto una frase lunga o colloquiale (es. "vorrei comprare un vestito per una festa a Londra"), genera un titolo sintetico elegante (es. "Shopping di Vestiti a Londra").
2. "vocabulary": esattamente 10-15 parole o espressioni chiave in ${targetName} tipiche per il contesto "${scenarioContext}", livello CEFR ${level}, con traduzione in ${nativeName} ed esempio d'uso breve e naturale per ciascuna.
3. "exercises": esattamente 8 esercizi pratici che usano PROPRIO quelle parole del vocabolario in frasi realistiche ambientate nel contesto (non esercizi generici o fuori tema).
   Tipi ammessi per gli esercizi:
   - "multiple_choice" (con 4 opzioni plausibili)
   - "fill_in_blank" (con la parola mancante)
   - "sentence_transformation" (es. riformula la frase usando una specifica espressione)
   - "translation" (traduci una frase realistica del contesto)
   Ogni esercizio deve avere:
   - "id": string univoco es. "ex_1"..."ex_8"
   - "tipo": uno dei tipi sopra
   - "domanda": testo dell'esercizio con consegna chiara
   - "opzioni": array di 4 opzioni per multiple_choice, oppure array vuoto per altri
   - "rispostaCorretta": testo della risposta esatta
   - "spiegazione": breve e incoraggiante spiegazione d'uso in ${nativeName}
4. "dialogue": una mini-situazione / breve dialogo realistico (o testo ambientato) ambientato nello scenario che usa naturalmente il vocabolario appena visto.
   Includi:
   - "title": titolo della situazione (es. "Al bancone dell'accoglienza", "Alla cassa del negozio")
   - "context": brevissima frase descrittiva del contesto
   - "text": il dialogo o testo completo con gli interlocutori (es. "Receptionist: ...\\nGuest: ...")
   - "speakers": array dei nomi dei personaggi che parlano
   - "questions": 2-3 domande di comprensione a scelta multipla leggere e pertinenti:
     - "id": string univoco es. "q_1"
     - "domanda": testo della domanda in ${nativeName}
     - "opzioni": array di 3-4 opzioni
     - "rispostaCorretta": l'opzione corretta
     - "spiegazione": spiegazione

Rispondi RIGOROSAMENTE SOLO in JSON con questa struttura:
{
  "scenarioTitle": "...",
  "vocabulary": [
    { "termine": "...", "traduzione": "...", "esempio": "..." }
  ],
  "exercises": [
    {
      "id": "ex_1",
      "tipo": "multiple_choice",
      "domanda": "...",
      "opzioni": ["...", "...", "...", "..."],
      "rispostaCorretta": "...",
      "spiegazione": "..."
    }
  ],
  "dialogue": {
    "title": "...",
    "context": "...",
    "text": "...",
    "speakers": ["...", "..."],
    "questions": [
      {
        "id": "q_1",
        "domanda": "...",
        "opzioni": ["...", "...", "..."],
        "rispostaCorretta": "...",
        "spiegazione": "..."
      }
    ]
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(cleanJsonOutput(response.text || "{}"));
    res.json({
      scenarioId,
      scenarioTitle: parsed.scenarioTitle || scenarioContext,
      vocabulary: parsed.vocabulary || [],
      exercises: parsed.exercises || [],
      dialogue: parsed.dialogue || {
        title: parsed.scenarioTitle || scenarioContext,
        context: scenarioContext,
        text: "",
        questions: [],
      },
    });
  } catch (err: any) {
    console.error("Error generating scenario:", err);
    res.status(500).json({ error: err.message || "Failed to generate scenario" });
  }
});


// API 9: Generate Level Placement Test
router.post("/generate-level-test", async (req, res) => {
  try {
    const { targetLang = "en", nativeLang = "it", targetName = "Inglese", nativeName = "Italiano" } = req.body;
    const ai = getGeminiClient();

    const levelPrompts = [
      {
        level: "A1",
        count: 6,
        prompt: `Genera esattamente 6 domande di livello CEFR A1 per verificare la competenza nella lingua ${targetName} (${targetLang}) rivolte ad una persona madrelingua ${nativeName} (${nativeLang}).
Tipi ammessi: "multiple_choice" o "fill_in_blank".
Domande e opzioni devono essere in ${targetName} con istruzioni chiare in ${nativeName}.
Rispondi SOLO in JSON con un array di 6 oggetti con struttura esatta:
[
  {
    "level": "A1",
    "tipo": "multiple_choice" | "fill_in_blank",
    "domanda": "testo della domanda in ${targetName}",
    "opzioni": ["A", "B", "C", "D"],
    "rispostaCorretta": "risposta esatta in ${targetName}"
  }
]`
      },
      {
        level: "A2",
        count: 6,
        prompt: `Genera esattamente 6 domande di livello CEFR A2 per verificare la competenza nella lingua ${targetName} (${targetLang}) rivolte ad una persona madrelingua ${nativeName} (${nativeLang}).
Tipi ammessi: "multiple_choice" o "fill_in_blank".
Domande e opzioni devono essere in ${targetName} con istruzioni chiare in ${nativeName}.
Rispondi SOLO in JSON con un array di 6 oggetti con struttura esatta:
[
  {
    "level": "A2",
    "tipo": "multiple_choice" | "fill_in_blank",
    "domanda": "testo della domanda in ${targetName}",
    "opzioni": ["A", "B", "C", "D"],
    "rispostaCorretta": "risposta esatta in ${targetName}"
  }
]`
      },
      {
        level: "B1",
        count: 6,
        prompt: `Genera esattamente 6 domande di livello CEFR B1 per verificare la competenza nella lingua ${targetName} (${targetLang}) rivolte ad una persona madrelingua ${nativeName} (${nativeLang}).
Tipi ammessi: "multiple_choice", "fill_in_blank", "sentence_transformation".
Per "sentence_transformation", indica la frase di partenza e la parte da completare/riformulare.
Rispondi SOLO in JSON con un array di 6 oggetti con struttura esatta:
[
  {
    "level": "B1",
    "tipo": "multiple_choice" | "fill_in_blank" | "sentence_transformation",
    "domanda": "testo della domanda in ${targetName}",
    "opzioni": ["A", "B", "C", "D"],
    "rispostaCorretta": "risposta esatta in ${targetName}"
  }
]`
      },
      {
        level: "B2",
        count: 6,
        prompt: `Genera esattamente 6 domande di livello CEFR B2 per verificare la competenza nella lingua ${targetName} (${targetLang}) rivolte ad una persona madrelingua ${nativeName} (${nativeLang}).
Tipi ammessi: "multiple_choice", "sentence_transformation", oppure 1 breve testo di comprensione con 2 domande "reading_comprehension" (includi il brano in ${targetName} nel campo "testo_contesto").
Rispondi SOLO in JSON con un array di 6 oggetti con struttura esatta:
[
  {
    "level": "B2",
    "tipo": "multiple_choice" | "sentence_transformation" | "reading_comprehension",
    "testo_contesto": "...",
    "domanda": "testo della domanda in ${targetName}",
    "opzioni": ["A", "B", "C", "D"],
    "rispostaCorretta": "risposta esatta in ${targetName}"
  }
]`
      },
      {
        level: "C1",
        count: 6,
        prompt: `Genera esattamente 6 domande di livello CEFR C1 per verificare la competenza nella lingua ${targetName} (${targetLang}) rivolte ad una persona madrelingua ${nativeName} (${nativeLang}).
Tipi ammessi: "multiple_choice", "sentence_transformation", oppure 1 breve testo di comprensione con 2 domande "reading_comprehension" (includi il brano in ${targetName} nel campo "testo_contesto").
Rispondi SOLO in JSON con un array di 6 oggetti con struttura esatta:
[
  {
    "level": "C1",
    "tipo": "multiple_choice" | "sentence_transformation" | "reading_comprehension",
    "testo_contesto": "...",
    "domanda": "testo della domanda in ${targetName}",
    "opzioni": ["A", "B", "C", "D"],
    "rispostaCorretta": "risposta esatta in ${targetName}"
  }
]`
      },
      {
        level: "C2",
        count: 6,
        prompt: `Genera esattamente 6 domande di livello CEFR C2 per verificare la competenza nella lingua ${targetName} (${targetLang}) rivolte ad una persona madrelingua ${nativeName} (${nativeLang}).
Tipi ammessi: "multiple_choice", "sentence_transformation", oppure 1 breve testo di comprensione con 2 domande "reading_comprehension" (includi il brano in ${targetName} nel campo "testo_contesto").
Rispondi SOLO in JSON con un array di 6 oggetti con struttura esatta:
[
  {
    "level": "C2",
    "tipo": "multiple_choice" | "sentence_transformation" | "reading_comprehension",
    "testo_contesto": "...",
    "domanda": "testo della domanda in ${targetName}",
    "opzioni": ["A", "B", "C", "D"],
    "rispostaCorretta": "risposta esatta in ${targetName}"
  }
]`
      }
    ];

    const responses = await Promise.all(
      levelPrompts.map((item) =>
        ai.models
          .generateContent({
            model: "gemini-3.6-flash",
            contents: item.prompt,
            config: {
              responseMimeType: "application/json",
            },
          })
          .catch((err) => {
            console.error(`Error generating level test for level ${item.level}:`, err);
            return null;
          })
      )
    );

    let allQuestions: any[] = [];
    let qIndex = 1;

    responses.forEach((resp, i) => {
      const cfg = levelPrompts[i];
      if (!resp || !resp.text) return;
      try {
        const parsed = JSON.parse(cleanJsonOutput(resp.text));
        if (Array.isArray(parsed)) {
          parsed.forEach((q: any) => {
            allQuestions.push({
              ...q,
              id: `q${qIndex++}`,
              level: q.level || cfg.level,
            });
          });
        }
      } catch (e) {
        console.error(`Error parsing JSON for level ${cfg.level}:`, e);
      }
    });

    if (allQuestions.length < 24) {
      console.warn("Generated fewer questions than minimum threshold, returning fallback level test.");
      return res.json({ questions: getFallbackLevelTestQuestions() });
    }

    res.json({ questions: allQuestions });
  } catch (err: any) {
    console.error("Error generating level test:", err);
    res.json({ questions: getFallbackLevelTestQuestions() });
  }
});

function getFallbackLevelTestQuestions() {
  return [
    // A1 (6)
    { id: "q1", level: "A1", tipo: "multiple_choice", domanda: "She ___ from Italy.", opzioni: ["is", "are", "am", "be"], rispostaCorretta: "is" },
    { id: "q2", level: "A1", tipo: "fill_in_blank", domanda: "I have two ___ (dog).", rispostaCorretta: "dogs" },
    { id: "q3", level: "A1", tipo: "multiple_choice", domanda: "What time ___ you get up in the morning?", opzioni: ["do", "does", "are", "have"], rispostaCorretta: "do" },
    { id: "q4", level: "A1", tipo: "multiple_choice", domanda: "There isn't ___ milk left in the fridge.", opzioni: ["any", "some", "a", "many"], rispostaCorretta: "any" },
    { id: "q5", level: "A1", tipo: "fill_in_blank", domanda: "My birthday is ___ July.", rispostaCorretta: "in" },
    { id: "q6", level: "A1", tipo: "multiple_choice", domanda: "They ___ English and Italian.", opzioni: ["speak", "speaks", "speaking", "are speak"], rispostaCorretta: "speak" },

    // A2 (6)
    { id: "q7", level: "A2", tipo: "multiple_choice", domanda: "Yesterday I ___ to the cinema with my friends.", opzioni: ["went", "go", "gone", "was going"], rispostaCorretta: "went" },
    { id: "q8", level: "A2", tipo: "multiple_choice", domanda: "This car is ___ than that one.", opzioni: ["more expensive", "expensiver", "most expensive", "as expensive"], rispostaCorretta: "more expensive" },
    { id: "q9", level: "A2", tipo: "fill_in_blank", domanda: "While I was studying, the phone ___ (ring).", rispostaCorretta: "rang" },
    { id: "q10", level: "A2", tipo: "multiple_choice", domanda: "You ___ wear a helmet when riding a motorbike. It's the law.", opzioni: ["must", "can", "might", "would"], rispostaCorretta: "must" },
    { id: "q11", level: "A2", tipo: "fill_in_blank", domanda: "Have you ever ___ (be) to Paris?", rispostaCorretta: "been" },
    { id: "q12", level: "A2", tipo: "fill_in_blank", domanda: "I usually go to work ___ bus.", rispostaCorretta: "by" },

    // B1 (6)
    { id: "q13", level: "B1", tipo: "multiple_choice", domanda: "I've been living in London ___ three years.", opzioni: ["for", "since", "during", "from"], rispostaCorretta: "for" },
    { id: "q14", level: "B1", tipo: "sentence_transformation", domanda: "Complete: If it rains tomorrow, we ___ (stay) inside.", rispostaCorretta: "will stay" },
    { id: "q15", level: "B1", tipo: "multiple_choice", domanda: "The girl ___ won the prize is my cousin.", opzioni: ["who", "which", "whose", "whom"], rispostaCorretta: "who" },
    { id: "q16", level: "B1", tipo: "fill_in_blank", domanda: "I am really looking forward to ___ (meet) you.", rispostaCorretta: "meeting" },
    { id: "q17", level: "B1", tipo: "multiple_choice", domanda: "If I won the lottery, I ___ buy a big house.", opzioni: ["would", "will", "must", "can"], rispostaCorretta: "would" },
    { id: "q18", level: "B1", tipo: "sentence_transformation", domanda: "Transform into reported speech: 'I am tired,' he said. -> He said that he ___ tired.", rispostaCorretta: "was" },

    // B2 (6)
    { id: "q19", level: "B2", tipo: "multiple_choice", domanda: "The new bridge ___ next year.", opzioni: ["will be built", "will build", "is building", "built"], rispostaCorretta: "will be built" },
    { id: "q20", level: "B2", tipo: "sentence_transformation", domanda: "Complete with phrasal verb: Don't ___ (surrender/quit) even when it gets tough.", rispostaCorretta: "give up" },
    { id: "q21", level: "B2", tipo: "multiple_choice", domanda: "He succeeded ___ passing the exam despite the difficulty.", opzioni: ["in", "on", "at", "to"], rispostaCorretta: "in" },
    { id: "q22", level: "B2", tipo: "sentence_transformation", domanda: "It's a pity I didn't study harder. -> I wish I ___ harder.", rispostaCorretta: "had studied" },
    {
      id: "q23", level: "B2", tipo: "reading_comprehension",
      testo_contesto: "Urban green spaces provide environmental and health benefits. Recent studies show that city dwellers living near parks experience lower stress levels and improved cardiovascular health.",
      domanda: "According to the passage, what effect do urban parks have on residents?",
      opzioni: ["They lower stress and improve heart health.", "They increase noise levels.", "They make housing expensive.", "They have no noticeable effect."],
      rispostaCorretta: "They lower stress and improve heart health."
    },
    {
      id: "q24", level: "B2", tipo: "reading_comprehension",
      testo_contesto: "Urban green spaces provide environmental and health benefits. Recent studies show that city dwellers living near parks experience lower stress levels and improved cardiovascular health.",
      domanda: "Who benefits from these green spaces?",
      opzioni: ["City dwellers living near parks", "Only athletes", "Suburban commuters", "Farmers"],
      rispostaCorretta: "City dwellers living near parks"
    },

    // C1 (6)
    { id: "q25", level: "C1", tipo: "multiple_choice", domanda: "She didn't answer the phone; she ___ have been sleeping.", opzioni: ["must", "should", "would", "can"], rispostaCorretta: "must" },
    { id: "q26", level: "C1", tipo: "sentence_transformation", domanda: "Complete 3rd conditional: If I had known about the traffic, I ___ (leave) earlier.", rispostaCorretta: "would have left" },
    { id: "q27", level: "C1", tipo: "multiple_choice", domanda: "The project was cancelled owing ___ a lack of funding.", opzioni: ["to", "of", "for", "with"], rispostaCorretta: "to" },
    { id: "q28", level: "C1", tipo: "sentence_transformation", domanda: "Rephrase with inversion: I have rarely seen such dedication. -> Rarely ___ such dedication.", rispostaCorretta: "have I seen" },
    {
      id: "q29", level: "C1", tipo: "reading_comprehension",
      testo_contesto: "Artificial Intelligence has transitioned from theoretical speculation to a ubiquitous force reshaping industries. While automation enhances productivity, ethical dilemmas regarding bias and labor displacement demand robust regulatory frameworks.",
      domanda: "What main concern is highlighted regarding AI deployment?",
      opzioni: ["Ethical issues such as bias and labor displacement", "Its inability to boost productivity", "High hardware manufacturing costs", "Lack of interest from tech companies"],
      rispostaCorretta: "Ethical issues such as bias and labor displacement"
    },
    {
      id: "q30", level: "C1", tipo: "reading_comprehension",
      testo_contesto: "Artificial Intelligence has transitioned from theoretical speculation to a ubiquitous force reshaping industries. While automation enhances productivity, ethical dilemmas regarding bias and labor displacement demand robust regulatory frameworks.",
      domanda: "What solution does the text advocate for these AI challenges?",
      opzioni: ["Robust regulatory frameworks", "Banning all AI research", "Ignoring ethical dilemmas", "Promoting unmonitored automation"],
      rispostaCorretta: "Robust regulatory frameworks"
    },

    // C2 (6)
    { id: "q31", level: "C2", tipo: "multiple_choice", domanda: "Little ___ that the decision would alter the course of history.", opzioni: ["did he know", "he knew", "he was knowing", "knew he"], rispostaCorretta: "did he know" },
    { id: "q32", level: "C2", tipo: "sentence_transformation", domanda: "Complete idiom meaning 'to face a difficult situation with courage': You just have to bite the ___.", rispostaCorretta: "bullet" },
    { id: "q33", level: "C2", tipo: "multiple_choice", domanda: "Had I known about the consequences, I ___ taken the risk.", opzioni: ["would never have", "will never have", "had never", "should never"], rispostaCorretta: "would never have" },
    { id: "q34", level: "C2", tipo: "sentence_transformation", domanda: "Inversion: He not only completed the marathon, but he also broke the record. -> Not only ___ the marathon, but he also broke the record.", rispostaCorretta: "did he complete" },
    {
      id: "q35", level: "C2", tipo: "reading_comprehension",
      testo_contesto: "The nuance of literary translation lies not merely in verbatim rendition, but in capturing the subtext, cadence, and cultural resonance of the source material. A literal translation frequently stifles the aesthetic vitality of prose.",
      domanda: "Why is literal translation discouraged for literary works?",
      opzioni: ["It stifles the aesthetic vitality of the prose.", "It is too fast to produce.", "It enhances the cultural resonance too much.", "It is strictly illegal."],
      rispostaCorretta: "It stifles the aesthetic vitality of the prose."
    },
    {
      id: "q36", level: "C2", tipo: "reading_comprehension",
      testo_contesto: "The nuance of literary translation lies not merely in verbatim rendition, but in capturing the subtext, cadence, and cultural resonance of the source material. A literal translation frequently stifles the aesthetic vitality of prose.",
      domanda: "What key elements must a literary translator capture beyond words?",
      opzioni: ["Subtext, cadence, and cultural resonance", "Only grammatical punctuation", "The translator's personal memoirs", "Word count equivalence"],
      rispostaCorretta: "Subtext, cadence, and cultural resonance"
    }
  ];
}

// API 10: Generate Checkpoint (10 questions covering 8 guided lessons)
router.post("/generate-checkpoint", async (req, res) => {
  try {
    const {
      targetLang = "en",
      nativeLang = "it",
      targetName = "Inglese",
      nativeName = "Italiano",
      level = "A1",
      topicsSummary = [],
    } = req.body;

    const ai = getGeminiClient();

    const topicsText = Array.isArray(topicsSummary) && topicsSummary.length > 0
      ? `Argomenti affrontati nelle 8 lezioni: ${topicsSummary.join(", ")}.`
      : `Percorso di livello CEFR ${level}.`;

    const prompt = `Sei un esaminatore esperto di ${targetName} per studenti madrelingua ${nativeName}.
Genera un Checkpoint finale di 10 domande per verificare l'apprendimento al livello CEFR ${level}.
${topicsText}

Requisiti:
1. Genera esattamente 10 domande:
   - 4 domande di Vocabolario (significato, sinonimi, completamento in contesto)
   - 4 domande di Grammatica (regole, tempi verbali, concordanza, trasformazione)
   - 2 domande di Lettura / Comprensione breve (includi un brevissimo testo di 2 frasi nel campo della domanda o come premessa)
2. Tipi ammessi per ogni domanda: "multiple_choice" (con 4 opzioni plausibili) o "fill_in_blank".
3. Istruzioni e spiegazioni in ${nativeName}. Domande e opzioni nella lingua target (${targetName}).
4. Ogni domanda deve avere:
   - "id": "cp_1" ... "cp_10"
   - "tipo": "multiple_choice" | "fill_in_blank"
   - "lezioneTipo": "vocabolario" | "grammatica" | "lettura"
   - "domanda": testo chiaro della domanda
   - "opzioni": array di 4 opzioni per multiple_choice, oppure array vuoto [] se fill_in_blank
   - "rispostaCorretta": la risposta corretta esatta
   - "spiegazione": breve e amichevole spiegazione della risposta esatta in ${nativeName}

Rispondi RIGOROSAMENTE SOLO in JSON con questo array di 10 oggetti:
[
  {
    "id": "cp_1",
    "tipo": "multiple_choice",
    "lezioneTipo": "vocabolario",
    "domanda": "...",
    "opzioni": ["A", "B", "C", "D"],
    "rispostaCorretta": "...",
    "spiegazione": "..."
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(cleanJsonOutput(response.text || "[]"));
    if (Array.isArray(parsed) && parsed.length >= 8) {
      return res.json({ questions: parsed.slice(0, 10) });
    }

    res.json({ questions: getFallbackCheckpointQuestions(level) });
  } catch (err: any) {
    console.error("Error generating checkpoint:", err);
    res.json({ questions: getFallbackCheckpointQuestions(req.body.level || "A1") });
  }
});

function getFallbackCheckpointQuestions(level: string) {
  return [
    {
      id: "cp_1",
      tipo: "multiple_choice",
      lezioneTipo: "vocabolario",
      domanda: "Qual è il significato del termine 'Everyday'?",
      opzioni: ["Quotidiano", "Domani", "Mai", "Raramente"],
      rispostaCorretta: "Quotidiano",
      spiegazione: "'Everyday' indica qualcosa di comune o quotidiano."
    },
    {
      id: "cp_2",
      tipo: "multiple_choice",
      lezioneTipo: "grammatica",
      domanda: "Scegli la forma corretta: 'She ___ coffee every morning.'",
      opzioni: ["drinks", "drink", "drinking", "is drink"],
      rispostaCorretta: "drinks",
      spiegazione: "Alla terza persona singolare del Present Simple si aggiunge la 's'."
    },
    {
      id: "cp_3",
      tipo: "fill_in_blank",
      lezioneTipo: "vocabolario",
      domanda: "Completa con il plurale di 'child': 'They have three ___.'",
      rispostaCorretta: "children",
      spiegazione: "'Children' è il plurale irregolare di 'child'."
    },
    {
      id: "cp_4",
      tipo: "multiple_choice",
      lezioneTipo: "grammatica",
      domanda: "Scegli l'opzione corretta: 'They ___ at home yesterday.'",
      opzioni: ["were", "was", "are", "been"],
      rispostaCorretta: "were",
      spiegazione: "Per 'they' al Past Simple del verbo to be si usa 'were'."
    },
    {
      id: "cp_5",
      tipo: "multiple_choice",
      lezioneTipo: "lettura",
      domanda: "Leggi: 'Marco woke up at 7:00 and immediately had breakfast before going to the station.' A che ora si è svegliato Marco?",
      opzioni: ["Alle 7:00", "Alle 8:00", "A mezzogiorno", "Non è specificato"],
      rispostaCorretta: "Alle 7:00",
      spiegazione: "Il testo specifica 'woke up at 7:00'."
    },
    {
      id: "cp_6",
      tipo: "multiple_choice",
      lezioneTipo: "vocabolario",
      domanda: "Cosa significa l'espressione 'Looking forward to'?",
      opzioni: ["Non vedere l'ora di", "Guardare indietro", "Cercare qualcosa", "Voltarsi"],
      rispostaCorretta: "Non vedere l'ora di",
      spiegazione: "'Look forward to' significa attendere con impazienza/entusiasmo."
    },
    {
      id: "cp_7",
      tipo: "fill_in_blank",
      lezioneTipo: "grammatica",
      domanda: "Inserisci la preposizione corretta: 'I will see you ___ Monday.'",
      rispostaCorretta: "on",
      spiegazione: "Con i giorni della settimana in inglese si usa la preposizione 'on'."
    },
    {
      id: "cp_8",
      tipo: "multiple_choice",
      lezioneTipo: "grammatica",
      domanda: "Qual è la forma corretta? 'This book is ___ than that one.'",
      opzioni: ["better", "gooder", "more good", "best"],
      rispostaCorretta: "better",
      spiegazione: "'Better' è il comparativo irregolare di 'good'."
    },
    {
      id: "cp_9",
      tipo: "multiple_choice",
      lezioneTipo: "lettura",
      domanda: "Leggi: 'The library is open from Monday to Friday, but closed on weekends.' Quando è chiusa la biblioteca?",
      opzioni: ["Nel fine settimana", "Il lunedì", "Tutti i giorni", "Mai"],
      rispostaCorretta: "Nel fine settimana",
      spiegazione: "'Closed on weekends' significa chiusa il sabato e la domenica."
    },
    {
      id: "cp_10",
      tipo: "fill_in_blank",
      lezioneTipo: "vocabolario",
      domanda: "Completa con il contrario di 'difficult': 'The test was very ___ (facile)'.",
      rispostaCorretta: "easy",
      spiegazione: "L'opposto di 'difficult' è 'easy'."
    }
  ];
}

// API 11: Generate Mini-Test (10 questions at next level for level jump assessment)
router.post("/generate-mini-test", async (req, res) => {
  try {
    const {
      targetLang = "en",
      nativeLang = "it",
      targetName = "Inglese",
      nativeName = "Italiano",
      currentLevel = "A1",
      nextLevel = "A2",
    } = req.body;

    const ai = getGeminiClient();

    const prompt = `Sei un esaminatore esperto di ${targetName} per studenti madrelingua ${nativeName}.
Lo studente sta completando il livello ${currentLevel} e vuole verificare se è pronto a salire al livello CEFR ${nextLevel}.
Genera un Mini-Test rapido di esattamente 10 domande mirate al livello ${nextLevel}.

Requisiti:
1. Esattamente 10 domande focalizzate sulle competenze chiave richieste nel livello ${nextLevel} (grammatica, vocabolario pratico, comprensione).
2. Tipi ammessi: "multiple_choice" (4 opzioni) o "fill_in_blank".
3. Domande e opzioni in ${targetName}, istruzioni e spiegazioni in ${nativeName}.
4. Ogni domanda deve avere:
   - "id": "mt_1" ... "mt_10"
   - "tipo": "multiple_choice" | "fill_in_blank"
   - "domanda": testo chiaro della domanda
   - "opzioni": array di 4 opzioni per multiple_choice o []
   - "rispostaCorretta": risposta esatta
   - "spiegazione": spiegazione incoraggiante in ${nativeName}

Rispondi RIGOROSAMENTE SOLO in JSON con questo array di 10 oggetti:
[
  {
    "id": "mt_1",
    "tipo": "multiple_choice",
    "domanda": "...",
    "opzioni": ["A", "B", "C", "D"],
    "rispostaCorretta": "...",
    "spiegazione": "..."
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(cleanJsonOutput(response.text || "[]"));
    if (Array.isArray(parsed) && parsed.length >= 8) {
      return res.json({ targetLevel: nextLevel, questions: parsed.slice(0, 10) });
    }

    res.json({ targetLevel: nextLevel, questions: getFallbackMiniTestQuestions(nextLevel) });
  } catch (err: any) {
    console.error("Error generating mini-test:", err);
    res.json({ targetLevel: req.body.nextLevel || "A2", questions: getFallbackMiniTestQuestions(req.body.nextLevel || "A2") });
  }
});

function getFallbackMiniTestQuestions(level: string) {
  return [
    {
      id: "mt_1",
      tipo: "multiple_choice",
      domanda: "Yesterday we ___ to a great Italian restaurant.",
      opzioni: ["went", "go", "gone", "was going"],
      rispostaCorretta: "went",
      spiegazione: "Il past simple del verbo irregolare 'to go' è 'went'."
    },
    {
      id: "mt_2",
      tipo: "multiple_choice",
      domanda: "Have you ever ___ sushi?",
      opzioni: ["eaten", "ate", "eat", "eating"],
      rispostaCorretta: "eaten",
      spiegazione: "Con il Present Perfect si usa il participio passato 'eaten'."
    },
    {
      id: "mt_3",
      tipo: "fill_in_blank",
      domanda: "She is much ___ (tall) than her sister.",
      rispostaCorretta: "taller",
      spiegazione: "Il comparativo di maggioranza di 'tall' è 'taller'."
    },
    {
      id: "mt_4",
      tipo: "multiple_choice",
      domanda: "You ___ not smoke here, it is forbidden.",
      opzioni: ["must", "can", "should", "would"],
      rispostaCorretta: "must",
      spiegazione: "'Must not' esprime una proibizione formale."
    },
    {
      id: "mt_5",
      tipo: "multiple_choice",
      domanda: "If it rains tomorrow, we ___ at home.",
      opzioni: ["will stay", "stayed", "would stay", "staying"],
      rispostaCorretta: "will stay",
      spiegazione: "Nel primo periodo ipotetico si usa 'will + forma base' nella proposizione principale."
    },
    {
      id: "mt_6",
      tipo: "fill_in_blank",
      domanda: "I haven't seen him ___ three weeks. (for / since)",
      rispostaCorretta: "for",
      spiegazione: "'For' si usa con una durata di tempo ('three weeks')."
    },
    {
      id: "mt_7",
      tipo: "multiple_choice",
      domanda: "The person ___ helped me was very kind.",
      opzioni: ["who", "which", "where", "whose"],
      rispostaCorretta: "who",
      spiegazione: "'Who' è il pronome relativo per le persone."
    },
    {
      id: "mt_8",
      tipo: "fill_in_blank",
      domanda: "He gave ___ smoking last year (smise / phrasal verb: give ___).",
      rispostaCorretta: "up",
      spiegazione: "'Give up' significa smettere / abbandonare un'abitudine."
    },
    {
      id: "mt_9",
      tipo: "multiple_choice",
      domanda: "I would travel around the world if I ___ more time.",
      opzioni: ["had", "have", "will have", "would have"],
      rispostaCorretta: "had",
      spiegazione: "Nel secondo condizionale si usa il Past Simple ('had') dopo 'if'."
    },
    {
      id: "mt_10",
      tipo: "multiple_choice",
      domanda: "The museum was ___ by thousands of tourists last summer.",
      opzioni: ["visited", "visiting", "visit", "visits"],
      rispostaCorretta: "visited",
      spiegazione: "Forma passiva al passato: 'was + participio passato (visited)'."
    }
  ];
}

// Cron Endpoint: Daily Push Notification Reminders
// Invoked hourly by GitHub Actions or scheduled crons
router.all("/cron/send-reminders", async (req, res) => {
  try {
    // 1. Authenticate with CRON_SECRET if defined
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : ((req.query.secret as string) || "").trim();

    const expectedSecret = (process.env.CRON_SECRET || "").trim();
    if (expectedSecret && token !== expectedSecret) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authorization: Bearer CRON_SECRET required",
      });
    }

    // 2. Determine current time (using Europe/Rome timezone as base)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const partMap: Record<string, string> = {};
    parts.forEach((p) => {
      partMap[p.type] = p.value;
    });

    const todayStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const currentHour = parseInt(partMap.hour || "0", 10);

    const projectId = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0939401223";
    const apiKey = process.env.FIREBASE_API_KEY || "AIzaSyAFxfsquFnviXy77UJrqnghISyN_gxvUUc";

    let processedProfiles = 0;
    let notificationsSent = 0;
    const notifiedUsers: Array<{ userId: string; profileId: string; time: string }> = [];

    // 3. Query users from Firestore REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=300&key=${apiKey}`;
    const usersResp = await fetch(firestoreUrl);

    if (usersResp.ok) {
      const usersData: any = await usersResp.json();
      const documents: any[] = usersData.documents || [];

      for (const doc of documents) {
        const docName: string = doc.name || "";
        const userId = docName.split("/").pop() || "";
        if (!userId || userId.startsWith("local_user_")) continue;

        const fields = doc.fields || {};
        const rootActiveProfileId = fields.activeProfileId?.stringValue || "en";

        // Query profiles subcollection for this user
        const profilesUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/profiles?key=${apiKey}`;
        let profileDocs: any[] = [];
        try {
          const profResp = await fetch(profilesUrl);
          if (profResp.ok) {
            const profData: any = await profResp.json();
            profileDocs = profData.documents || [];
          }
        } catch (profErr) {
          console.warn(`Could not fetch profiles for ${userId}:`, profErr);
        }

        // If no profiles subcollection found, use root doc fields
        if (profileDocs.length === 0) {
          profileDocs = [
            {
              name: `${docName}/profiles/${rootActiveProfileId}`,
              fields: {
                reminderEnabled: fields.reminderEnabled,
                reminderTime: fields.reminderTime,
                lastActiveDate: fields.lastActiveDate,
                lastReminderSentDate: fields.lastReminderSentDate,
                fcmToken: fields.fcmToken,
                fcmTokens: fields.fcmTokens,
              },
            },
          ];
        }

        for (const pDoc of profileDocs) {
          processedProfiles++;
          const pFields = pDoc.fields || {};
          const profileId = (pDoc.name || "").split("/").pop() || rootActiveProfileId;

          const reminderEnabled = Boolean(
            pFields.reminderEnabled?.booleanValue ?? fields.reminderEnabled?.booleanValue ?? false
          );
          if (!reminderEnabled) continue;

          const reminderTime =
            pFields.reminderTime?.stringValue || fields.reminderTime?.stringValue || "20:00";
          const lastActiveDate =
            pFields.lastActiveDate?.stringValue || fields.lastActiveDate?.stringValue || null;
          const lastReminderSentDate =
            pFields.lastReminderSentDate?.stringValue || fields.lastReminderSentDate?.stringValue || null;

          // Parse reminder hour
          const [hourStr] = reminderTime.split(":");
          const reminderHour = parseInt(hourStr || "20", 10);

          // Check hour match with 1 hour tolerance
          const hourDiff = Math.abs(currentHour - reminderHour);
          const isTimeMatch = hourDiff <= 1 || hourDiff >= 23;

          // Check if user has NOT studied today
          const hasNotStudiedToday = lastActiveDate !== todayStr;

          // Check if notification has NOT already been sent today (max 1 per day)
          const notYetNotifiedToday = lastReminderSentDate !== todayStr;

          if (isTimeMatch && hasNotStudiedToday && notYetNotifiedToday) {
            // Collect target tokens
            const tokens: string[] = [];
            if (pFields.fcmToken?.stringValue) tokens.push(pFields.fcmToken.stringValue);
            if (fields.fcmToken?.stringValue) tokens.push(fields.fcmToken.stringValue);
            if (pFields.fcmTokens?.arrayValue?.values) {
              pFields.fcmTokens.arrayValue.values.forEach((v: any) => {
                if (v.stringValue) tokens.push(v.stringValue);
              });
            }
            if (fields.fcmTokens?.arrayValue?.values) {
              fields.fcmTokens.arrayValue.values.forEach((v: any) => {
                if (v.stringValue) tokens.push(v.stringValue);
              });
            }
            const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));

            // Rocky's friendly reminder text
            const title = "🦝 Raccoonary";
            const body = "Le tue parole ti aspettano in tana";

            // Dispatch push notification to tokens if available
            for (const t of uniqueTokens) {
              try {
                if (t.startsWith("http")) {
                  await fetch(t, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, body, icon: "/icon.png" }),
                  });
                } else if (!t.startsWith("web_push_")) {
                  await fetch("https://fcm.googleapis.com/fcm/send", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `key=${process.env.FCM_SERVER_KEY || apiKey}`,
                    },
                    body: JSON.stringify({
                      to: t,
                      notification: { title, body, icon: "/icon.png" },
                      data: { title, body, url: "/" },
                    }),
                  });
                }
              } catch (pushErr) {
                console.warn(`Push dispatch error for token:`, pushErr);
              }
            }

            // Update lastReminderSentDate on profile document
            try {
              const patchUrl = `https://firestore.googleapis.com/v1/${pDoc.name}?updateMask.fieldPaths=lastReminderSentDate&key=${apiKey}`;
              await fetch(patchUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fields: {
                    ...pFields,
                    lastReminderSentDate: { stringValue: todayStr },
                  },
                }),
              });
            } catch (patchErr) {
              console.warn(`Could not update lastReminderSentDate for ${pDoc.name}:`, patchErr);
            }

            notificationsSent++;
            notifiedUsers.push({ userId, profileId, time: reminderTime });
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      status: "completed",
      currentHour,
      todayStr,
      processedProfiles,
      notificationsSent,
      notifiedUsers,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Cron reminders error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process reminder cron job",
    });
  }
});

// Mount router on both /api (standard) and root / (in case serverless rewrites strip the prefix)
app.use("/api", router);
app.use("/", router);

// Default export compatible with Vercel Serverless Function and Express
export { app, router };
export default app;
