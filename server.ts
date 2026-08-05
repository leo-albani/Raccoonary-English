import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client lazily or safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined.");
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

// API Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Raccoonary" });
});

// API 0: Generate Shared Content for Language Pair
app.post("/api/generate-shared-content", async (req, res) => {
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
    res.status(500).json({ error: "Impossibile generare i contenuti condivisi.", details: err.message });
  }
});

// API 0.5: Generate UI Translations for Native Language
app.post("/api/generate-ui-translations", async (req, res) => {
  try {
    const { nativeLang = "en", nativeName = "English", masterTranslations } = req.body;
    const ai = getGeminiClient();

    const prompt = `Traduci e adatta questo set di testi dell'interfaccia di un'app di apprendimento linguistico dall'italiano al ${nativeName}.
Non tradurre parola per parola: adatta il tono mantenendo lo stesso spirito nella lingua di destinazione, seguendo queste regole:
- La mascotte (un procione) parla in prima persona, tono caldo, mai infantile, mai punitivo sugli errori
- Massimo un punto esclamativo per messaggio, solo per veri traguardi (mai su testi di spiegazione/istruzioni)
- Niente entusiasmo forzato da pubblicità, niente gergo tecnico nei testi rivolti all'utente
- Frasi brevi e dirette

Testi da tradurre (chiave → testo italiano):
${JSON.stringify(masterTranslations, null, 2)}

Rispondi SOLO in JSON con la stessa struttura di chiavi, valori tradotti e adattati (non traduzioni letterali).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const translatedStrings = JSON.parse(cleanJsonOutput(response.text || "{}"));
    res.json({
      langCode: nativeLang,
      strings: translatedStrings,
      generatedAt: Date.now(),
    });
  } catch (err: any) {
    console.error("Error generating UI translations:", err);
    res.status(500).json({ error: "Impossibile generare le traduzioni dell'interfaccia.", details: err.message });
  }
});

// API 1: Evaluate Answer (Non-rigid Spaced Repetition)
app.post("/api/evaluate-answer", async (req, res) => {
  try {
    const { term, translation, userAnswer, synonyms = [] } = req.body;

    if (!term || !userAnswer) {
      return res.status(400).json({ error: "Term and userAnswer are required." });
    }

    const ai = getGeminiClient();
    const prompt = `Valuta se la risposta dell'utente è una traduzione o un sinonimo accettabile del termine target, anche se non è la traduzione esatta salvata. Considera i sinonimi noti: ${JSON.stringify(synonyms)}.
Termine: "${term}" — Risposta salvata: "${translation}" — Risposta utente: "${userAnswer}"
Rispondi SOLO in JSON, nessun altro testo:
{"corretto": true|false, "spiegazione": "una frase breve, tono amichevole in italiano"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    const parsed = JSON.parse(cleanJsonOutput(rawText));
    res.json(parsed);
  } catch (err: any) {
    console.error("Error evaluating answer:", err);
    // Fallback if AI call or key missing
    const { translation, userAnswer, synonyms = [] } = req.body;
    const cleanUser = (userAnswer || "").trim().toLowerCase();
    const cleanSaved = (translation || "").trim().toLowerCase();
    const isSynonym = synonyms.some((s: string) => s.trim().toLowerCase() === cleanUser);
    const isExact = cleanUser === cleanSaved;

    res.json({
      corretto: isExact || isSynonym,
      spiegazione: isExact || isSynonym
        ? "Ottimo lavoro! Traduzione o sinonimo corretto."
        : `Quasi! La traduzione principale è "${translation}".`,
    });
  }
});

// API 2: Generate Grammar Exercises
app.post("/api/generate-grammar", async (req, res) => {
  try {
    const { topicName, level = "A1", targetLang = "en", nativeLang = "it", targetName = "Inglese", nativeName = "Italiano" } = req.body;
    if (!topicName) {
      return res.status(400).json({ error: "Topic name is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Genera 8 esercizi di grammatica per l'apprendimento della lingua ${targetName} (${targetLang}) sull'argomento "${topicName}", livello ${level}, rivolti ad una persona di madrelingua ${nativeName} (${nativeLang}).
Varia i formati tra: scelta multipla (multiple_choice), completamento frase (fill_in_blank), trasformazione frase (sentence_transformation).
Rispondi SOLO in JSON, un array di 8 oggetti con struttura esatta:
[
  {
    "tipo": "multiple_choice" | "fill_in_blank" | "sentence_transformation",
    "domanda": "testo della domanda in ${targetName} o frase con ___ da completare",
    "opzioni": ["opzione A", "opzione B", "opzione C", "opzione D"],
    "rispostaCorretta": "risposta esatta in ${targetName}",
    "spiegazione": "breve spiegazione in ${nativeName} con tono amichevole"
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
    const exercises = JSON.parse(cleanJsonOutput(rawText));
    res.json({ exercises });
  } catch (err: any) {
    console.error("Error generating grammar exercises:", err);
    res.status(500).json({ error: "Impossibile generare esercizi al momento.", details: err.message });
  }
});

// API 3: Generate Reading Text & Questions
app.post("/api/generate-reading", async (req, res) => {
  try {
    const { level = "A1", targetLang = "en", nativeLang = "it", targetName = "Inglese", nativeName = "Italiano" } = req.body;
    
    // Level specs according to user instructions
    const levelSpecs: Record<string, { words: string; spec: string }> = {
      A1: { words: "100-120 parole", spec: "vocabolario di base, frasi semplici" },
      A2: { words: "120-150 parole", spec: "frasi coordinate semplici, vocabolario quotidiano" },
      B1: { words: "200-250 parole", spec: "frasi subordinate semplici, argomenti concreti" },
      B2: { words: "250-300 parole", spec: "connettori più vari, argomenti astratti moderati" },
      C1: { words: "350-400 parole", spec: "struttura articolata, idiomi comuni, argomenti astratti" },
      C2: { words: "400-450 parole", spec: "registro sofisticato, lessico ricercato, argomenti complessi/specialistici" },
    };

    const currentSpec = levelSpecs[level] || levelSpecs["A1"];

    const ai = getGeminiClient();
    const prompt = `Scrivi un testo in ${targetName} (${targetLang}) di livello CEFR ${level}, lunghezza ${currentSpec.words}, stile simile ai testi degli esami di certificazione per quel livello (${currentSpec.spec}). Argomento: scegli un argomento vario e interessante (es. natura, viaggi, cultura, tecnologia).
Poi genera 5 domande di comprensione, variando tra scelta multipla (multiple_choice) e risposta aperta (open_ended). Domande e opzioni devono essere formulate per uno studente madrelingua ${nativeName} (${nativeLang}).
Rispondi SOLO in JSON con la struttura esatta:
{
  "title": "Titolo in ${targetName}",
  "testo": "Testo completo del brano in ${targetName}...",
  "estimatedMinutes": 3,
  "domande": [
    {
      "id": "q1",
      "tipo": "multiple_choice" | "open_ended",
      "domanda": "Testo della domanda in ${nativeName} o ${targetName}",
      "opzioni": ["A", "B", "C", "D"],
      "rispostaCorretta": "Risposta corretta"
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
    const readingData = JSON.parse(cleanJsonOutput(rawText));
    res.json(readingData);
  } catch (err: any) {
    console.error("Error generating reading text:", err);
    res.status(500).json({ error: "Impossibile generare il testo di comprensione.", details: err.message });
  }
});

// API 4: Explain highlighted word or phrase in reading
app.post("/api/explain-word", async (req, res) => {
  try {
    const { word, contextSentence, nativeName = "Italiano", targetName = "Inglese" } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Word is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Fornisci la traduzione in ${nativeName} e una brevissima spiegazione d'uso (con un frase di esempio) per la parola o espressione in ${targetName} "${word}" estrapolata dal contesto: "${contextSentence || ""}".
Rispondi SOLO in JSON:
{
  "term": "${word}",
  "translation": "traduzione principale in ${nativeName}",
  "explanation": "breve nota d'uso amichevole in ${nativeName}",
  "exampleSource": "frase d'esempio pulita in ${targetName}",
  "exampleTranslation": "traduzione dell'esempio in ${nativeName}"
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
    res.status(500).json({ error: "Non riesco a spiegare questa parola al momento." });
  }
});

// API 5: Parse unstructured file (PDF or raw text) for vocabulary import
app.post("/api/parse-import", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Estrai tutte le coppie di vocaboli (parola/espressione inglese e traduzione italiana o viceversa) contenute nel seguente testo.
Per ciascuna coppia estrai anche eventuali sinonimi ed una frase di esempio pulita se disponibile nel testo.
Testo:
"""
${content.slice(0, 15000)}
"""
Rispondi SOLO in JSON con un array di oggetti:
[
  {
    "term": "parola/frase originale",
    "translation": "traduzione",
    "sourceLang": "it" | "en",
    "targetLang": "it" | "en",
    "synonyms": ["sinonimo1", "sinonimo2"],
    "exampleSource": "esempio in lingua origine senza tag HTML",
    "exampleTranslation": "traduzione esempio"
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
    const items = JSON.parse(cleanJsonOutput(rawText));
    res.json({ items });
  } catch (err: any) {
    console.error("Error parsing import content:", err);
    res.status(500).json({ error: "Non sono riuscito a estrarre i vocaboli da questo contenuto." });
  }
});

// API 6: Translate sentence or word (Native <-> Target)
app.post("/api/translate", async (req, res) => {
  try {
    const { text, nativeName = "Italiano", targetName = "Inglese", nativeLang = "it", targetLang = "en" } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Traduci questa parola o frase tra ${nativeName} e ${targetName} (rileva automaticamente la direzione): "${text.trim()}".
Se ambigua, fornisci la traduzione più comune più eventuali alternative.
Rispondi SOLO in JSON:
{"lingua_origine": "${nativeLang}|${targetLang}", "traduzione_principale": "...", "alternative": ["..."]}`;

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
    // Smart fallback if API fails
    const text = (req.body.text || "").trim();
    const isEn = /[a-zA-Z]/.test(text) && !/[àèéìòù]/i.test(text);
    res.json({
      lingua_origine: isEn ? "en" : "it",
      traduzione_principale: `Traduzione per "${text}"`,
      alternative: [],
    });
  }
});

// API 7: Word Deep Dive for individual word in context
app.post("/api/deep-dive", async (req, res) => {
  try {
    const { word, contextSentence = "" } = req.body;
    if (!word || !word.trim()) {
      return res.status(400).json({ error: "Word is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Fornisci un approfondimento sulla parola/espressione "${word.trim()}" in inglese, nel contesto della frase "${contextSentence.trim()}".
Includi: definizione breve, eventuale nota d'uso/registro, 2-3 frasi di esempio tipiche in inglese con traduzione italiana.
Rispondi SOLO in JSON:
{"definizione": "...", "nota_uso": "...", "esempi": [{"en": "...", "it": "..."}]}`;

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
    console.error("Error getting deep dive:", err);
    const word = (req.body.word || "").trim();
    res.json({
      definizione: `Definizione di base per "${word}"`,
      nota_uso: "Termine comune in lingua inglese.",
      esempi: [
        { en: `Example with ${word}`, it: `Esempio con ${word}` }
      ],
    });
  }
});

// API 9: Generate Level Placement Test (35 questions across A1-C2)
app.post("/api/generate-level-test", async (req, res) => {
  try {
    const { targetLang = "en", nativeLang = "it", targetName = "Inglese", nativeName = "Italiano" } = req.body;
    const ai = getGeminiClient();
    const prompt = `Genera un test di livello CEFR per la lingua ${targetName} (${targetLang}) rivolto ad una persona madrelingua ${nativeName} (${nativeLang}), stile esame di certificazione ufficiale (sezioni Use of Language e Reading).
Crea esattamente 35 domande suddivise per livello CEFR come segue:
- A1: 5 domande (tipo: "multiple_choice" o "fill_in_blank")
- A2: 5 domande (tipo: "multiple_choice" o "fill_in_blank")
- B1: 6 domande (tipo: "multiple_choice", "fill_in_blank" o "sentence_transformation")
- B2: 6 domande (tipo: "multiple_choice", "sentence_transformation", oppure 1 breve testo di comprensione con 2 domande "reading_comprehension")
- C1: 6 domande (tipo: "multiple_choice", "sentence_transformation", oppure 1 breve testo di comprensione con 2 domande "reading_comprehension")
- C2: 7 domande (tipo: "multiple_choice", "sentence_transformation", oppure 1 breve testo di comprensione con 3 domande "reading_comprehension")

Nessuna domanda orale o di produzione parlata.
Le domande devono verificare la competenza nella lingua ${targetName}. Domande e opzioni devono essere formulate chiaramente per un madrelingua ${nativeName}.
Per le domande di tipo "reading_comprehension", includi il testo del brano in ${targetName} in "testo_contesto".
Per "sentence_transformation", la domanda deve indicare la frase di partenza in ${targetName} e come riformularla.

Rispondi SOLO in JSON con un array di 35 oggetti con struttura esatta:
[
  {
    "id": "q1",
    "level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    "tipo": "multiple_choice" | "fill_in_blank" | "sentence_transformation" | "reading_comprehension",
    "testo_contesto": "...", // opzionale
    "domanda": "testo della domanda in ${targetName}",
    "opzioni": ["A", "B", "C", "D"], // opzionale per scelta multipla/reading
    "rispostaCorretta": "risposta esatta"
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
    const questions = JSON.parse(cleanJsonOutput(rawText));
    res.json({ questions });
  } catch (err: any) {
    console.error("Error generating level test:", err);
    // Return rich 35-question default fallback set
    res.json({ questions: getFallbackLevelTestQuestions() });
  }
});

function getFallbackLevelTestQuestions() {
  return [
    // A1 (5)
    { id: "q1", level: "A1", tipo: "multiple_choice", domanda: "She ___ from Italy.", opzioni: ["is", "are", "am", "be"], rispostaCorretta: "is" },
    { id: "q2", level: "A1", tipo: "fill_in_blank", domanda: "I have two ___ (dog).", rispostaCorretta: "dogs" },
    { id: "q3", level: "A1", tipo: "multiple_choice", domanda: "What time ___ you get up in the morning?", opzioni: ["do", "does", "are", "have"], rispostaCorretta: "do" },
    { id: "q4", level: "A1", tipo: "multiple_choice", domanda: "There isn't ___ milk left in the fridge.", opzioni: ["any", "some", "a", "many"], rispostaCorretta: "any" },
    { id: "q5", level: "A1", tipo: "fill_in_blank", domanda: "My birthday is ___ July.", rispostaCorretta: "in" },

    // A2 (5)
    { id: "q6", level: "A2", tipo: "multiple_choice", domanda: "Yesterday I ___ to the cinema with my friends.", opzioni: ["went", "go", "gone", "was going"], rispostaCorretta: "went" },
    { id: "q7", level: "A2", tipo: "multiple_choice", domanda: "This car is ___ than that one.", opzioni: ["more expensive", "expensiver", "most expensive", "as expensive"], rispostaCorretta: "more expensive" },
    { id: "q8", level: "A2", tipo: "fill_in_blank", domanda: "While I was studying, the phone ___ (ring).", rispostaCorretta: "rang" },
    { id: "q9", level: "A2", tipo: "multiple_choice", domanda: "You ___ wear a helmet when riding a motorbike. It's the law.", opzioni: ["must", "can", "might", "would"], rispostaCorretta: "must" },
    { id: "q10", level: "A2", tipo: "fill_in_blank", domanda: "Have you ever ___ (be) to Paris?", rispostaCorretta: "been" },

    // B1 (6)
    { id: "q11", level: "B1", tipo: "multiple_choice", domanda: "I've been living in London ___ three years.", opzioni: ["for", "since", "during", "from"], rispostaCorretta: "for" },
    { id: "q12", level: "B1", tipo: "sentence_transformation", domanda: "Complete: If it rains tomorrow, we ___ (stay) inside.", rispostaCorretta: "will stay" },
    { id: "q13", level: "B1", tipo: "multiple_choice", domanda: "The girl ___ won the prize is my cousin.", opzioni: ["who", "which", "whose", "whom"], rispostaCorretta: "who" },
    { id: "q14", level: "B1", tipo: "fill_in_blank", domanda: "I am really looking forward to ___ (meet) you.", rispostaCorretta: "meeting" },
    { id: "q15", level: "B1", tipo: "multiple_choice", domanda: "If I won the lottery, I ___ buy a big house.", opzioni: ["would", "will", "must", "can"], rispostaCorretta: "would" },
    { id: "q16", level: "B1", tipo: "sentence_transformation", domanda: "Transform into reported speech: 'I am tired,' he said. -> He said that he ___ tired.", rispostaCorretta: "was" },

    // B2 (6)
    { id: "q17", level: "B2", tipo: "multiple_choice", domanda: "The new bridge ___ next year.", opzioni: ["will be built", "will build", "is building", "built"], rispostaCorretta: "will be built" },
    { id: "q18", level: "B2", tipo: "sentence_transformation", domanda: "Complete with phrasal verb: Don't ___ (surrender/quit) even when it gets tough.", rispostaCorretta: "give up" },
    { id: "q19", level: "B2", tipo: "multiple_choice", domanda: "He succeeded ___ passing the exam despite the difficulty.", opzioni: ["in", "on", "at", "to"], rispostaCorretta: "in" },
    { id: "q20", level: "B2", tipo: "sentence_transformation", domanda: "It's a pity I didn't study harder. -> I wish I ___ harder.", rispostaCorretta: "had studied" },
    {
      id: "q21", level: "B2", tipo: "reading_comprehension",
      testo_contesto: "Urban green spaces provide environmental and health benefits. Recent studies show that city dwellers living near parks experience lower stress levels and improved cardiovascular health.",
      domanda: "According to the passage, what effect do urban parks have on residents?",
      opzioni: ["They lower stress and improve heart health.", "They increase noise levels.", "They make housing expensive.", "They have no noticeable effect."],
      rispostaCorretta: "They lower stress and improve heart health."
    },
    {
      id: "q22", level: "B2", tipo: "reading_comprehension",
      testo_contesto: "Urban green spaces provide environmental and health benefits. Recent studies show that city dwellers living near parks experience lower stress levels and improved cardiovascular health.",
      domanda: "Who benefits from these green spaces?",
      opzioni: ["City dwellers living near parks", "Only athletes", "Suburban commuters", "Farmers"],
      rispostaCorretta: "City dwellers living near parks"
    },

    // C1 (6)
    { id: "q23", level: "C1", tipo: "multiple_choice", domanda: "She didn't answer the phone; she ___ have been sleeping.", opzioni: ["must", "should", "would", "can"], rispostaCorretta: "must" },
    { id: "q24", level: "C1", tipo: "sentence_transformation", domanda: "Complete 3rd conditional: If I had known about the traffic, I ___ (leave) earlier.", rispostaCorretta: "would have left" },
    { id: "q25", level: "C1", tipo: "multiple_choice", domanda: "The project was cancelled owing ___ a lack of funding.", opzioni: ["to", "of", "for", "with"], rispostaCorretta: "to" },
    { id: "q26", level: "C1", tipo: "sentence_transformation", domanda: "Rephrase with inversion: I have rarely seen such dedication. -> Rarely ___ such dedication.", rispostaCorretta: "have I seen" },
    {
      id: "q27", level: "C1", tipo: "reading_comprehension",
      testo_contesto: "Artificial Intelligence has transitioned from theoretical speculation to a ubiquitous force reshaping industries. While automation enhances productivity, ethical dilemmas regarding bias and labor displacement demand robust regulatory frameworks.",
      domanda: "What main concern is highlighted regarding AI deployment?",
      opzioni: ["Ethical issues such as bias and labor displacement", "Its inability to boost productivity", "High hardware manufacturing costs", "Lack of interest from tech companies"],
      rispostaCorretta: "Ethical issues such as bias and labor displacement"
    },
    {
      id: "q28", level: "C1", tipo: "reading_comprehension",
      testo_contesto: "Artificial Intelligence has transitioned from theoretical speculation to a ubiquitous force reshaping industries. While automation enhances productivity, ethical dilemmas regarding bias and labor displacement demand robust regulatory frameworks.",
      domanda: "What solution does the text advocate for these AI challenges?",
      opzioni: ["Robust regulatory frameworks", "Banning all AI research", "Ignoring ethical dilemmas", "Promoting unmonitored automation"],
      rispostaCorretta: "Robust regulatory frameworks"
    },

    // C2 (7)
    { id: "q29", level: "C2", tipo: "multiple_choice", domanda: "Little ___ that the decision would alter the course of history.", opzioni: ["did he know", "he knew", "he was knowing", "knew he"], rispostaCorretta: "did he know" },
    { id: "q30", level: "C2", tipo: "sentence_transformation", domanda: "Complete idiom meaning 'to face a difficult situation with courage': You just have to bite the ___.", rispostaCorretta: "bullet" },
    { id: "q31", level: "C2", tipo: "multiple_choice", domanda: "Had I known about the consequences, I ___ taken the risk.", opzioni: ["would never have", "will never have", "had never", "should never"], rispostaCorretta: "would never have" },
    { id: "q32", level: "C2", tipo: "sentence_transformation", domanda: "Inversion: He not only completed the marathon, but he also broke the record. -> Not only ___ the marathon, but he also broke the record.", rispostaCorretta: "did he complete" },
    {
      id: "q33", level: "C2", tipo: "reading_comprehension",
      testo_contesto: "The nuance of literary translation lies not merely in verbatim rendition, but in capturing the subtext, cadence, and cultural resonance of the source material. A literal translation frequently stifles the aesthetic vitality of prose.",
      domanda: "Why is literal translation discouraged for literary works?",
      opzioni: ["It stifles the aesthetic vitality of the prose.", "It is too fast to produce.", "It enhances the cultural resonance too much.", "It is strictly illegal."],
      rispostaCorretta: "It stifles the aesthetic vitality of the prose."
    },
    {
      id: "q34", level: "C2", tipo: "reading_comprehension",
      testo_contesto: "The nuance of literary translation lies not merely in verbatim rendition, but in capturing the subtext, cadence, and cultural resonance of the source material. A literal translation frequently stifles the aesthetic vitality of prose.",
      domanda: "What key elements must a literary translator capture beyond words?",
      opzioni: ["Subtext, cadence, and cultural resonance", "Only grammatical punctuation", "The translator's personal memoirs", "Word count equivalence"],
      rispostaCorretta: "Subtext, cadence, and cultural resonance"
    },
    {
      id: "q35", level: "C2", tipo: "reading_comprehension",
      testo_contesto: "The nuance of literary translation lies not merely in verbatim rendition, but in capturing the subtext, cadence, and cultural resonance of the source material. A literal translation frequently stifles the aesthetic vitality of prose.",
      domanda: "The word 'verbatim' in the passage most nearly means:",
      opzioni: ["Word-for-word", "Poetic", "Summary", "Inaccurate"],
      rispostaCorretta: "Word-for-word"
    }
  ];
}
app.post("/api/deep-dive-phrase", async (req, res) => {
  try {
    const { phrase } = req.body;
    if (!phrase || !phrase.trim()) {
      return res.status(400).json({ error: "Phrase is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Fornisci un approfondimento sulla frase/espressione inglese "${phrase.trim()}".
Se è un'espressione idiomatica o un modo di dire, spiegalo chiaramente: non si traduce parola per parola, indica il significato reale d'uso. Se invece è una frase letterale, indicalo comunque.
Includi: quando si usa (contesto/registro tipico), 2-3 frasi di esempio in inglese con traduzione italiana che mostrano l'uso reale dell'espressione.
Rispondi SOLO in JSON:
{"tipo": "idiomatico|letterale", "quando_si_usa": "...", "esempi": [{"en": "...", "it": "..."}]}`;

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

async function startServer() {
  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Raccoonary running on http://localhost:${PORT}`);
  });
}

startServer();
