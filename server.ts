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
    const { topicName, level = "A1" } = req.body;
    if (!topicName) {
      return res.status(400).json({ error: "Topic name is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Genera 8 esercizi di grammatica inglese sull'argomento "${topicName}", livello ${level}.
Varia i formati tra: scelta multipla (multiple_choice), completamento frase (fill_in_blank), trasformazione frase (sentence_transformation).
Rispondi SOLO in JSON, un array di 8 oggetti con struttura esatta:
[
  {
    "tipo": "multiple_choice" | "fill_in_blank" | "sentence_transformation",
    "domanda": "testo della domanda o frase con ___ da completare",
    "opzioni": ["opzione A", "opzione B", "opzione C", "opzione D"],
    "rispostaCorretta": "risposta esatta",
    "spiegazione": "breve spiegazione in italiano con tono amichevole"
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
    const { level = "A1" } = req.body;
    
    // Level specs according to user instructions
    const levelSpecs: Record<string, { words: string; spec: string }> = {
      A1: { words: "100-120 parole", spec: "vocabolario di base, frasi semplici, present simple" },
      A2: { words: "120-150 parole", spec: "frasi coordinate semplici, past simple, vocabolario quotidiano" },
      B1: { words: "200-250 parole", spec: "frasi subordinate semplici, present perfect, argomenti concreti" },
      B2: { words: "250-300 parole", spec: "connettori più vari, passivo, argomenti astratti moderati" },
      C1: { words: "350-400 parole", spec: "struttura articolata, idiomi comuni, argomenti astratti" },
      C2: { words: "400-450 parole", spec: "registro sofisticato, lessico ricercato, argomenti complessi/specialistici" },
    };

    const currentSpec = levelSpecs[level] || levelSpecs["A1"];

    const ai = getGeminiClient();
    const prompt = `Scrivi un testo in inglese di livello CEFR ${level}, lunghezza ${currentSpec.words}, stile simile ai testi degli esami Cambridge per quel livello (${currentSpec.spec}). Argomento: scegli un argomento vario e interessante (es. natura, viaggi, cultura, tecnologia).
Poi genera 5 domande di comprensione, variando tra scelta multipla (multiple_choice) e risposta aperta (open_ended).
Rispondi SOLO in JSON con la struttura esatta:
{
  "title": "Titolo in inglese",
  "testo": "Testo completo del brano in inglese...",
  "estimatedMinutes": 3,
  "domande": [
    {
      "id": "q1",
      "tipo": "multiple_choice" | "open_ended",
      "domanda": "Testo della domanda in italiano o inglese",
      "opzioni": ["A", "B", "C", "D"], // solo se tipo è multiple_choice
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
    const { word, contextSentence } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Word is required." });
    }

    const ai = getGeminiClient();
    const prompt = `Fornisci la traduzione in italiano e una brevissima spiegazione d'uso (con un frase di esempio) per la parola o espressione inglese "${word}" estrapolata dal contesto: "${contextSentence || ""}".
Rispondi SOLO in JSON:
{
  "term": "${word}",
  "translation": "traduzione principale in italiano",
  "explanation": "breve nota d'uso amichevole in italiano",
  "exampleSource": "frase d'esempio pulita in inglese",
  "exampleTranslation": "traduzione dell'esempio in italiano"
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
