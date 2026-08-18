import { LessonPath, LessonItem, LessonType, GrammarTopic, GrammarTopicProgress, VocabItem, CEFRLevel } from '../types';
import { GRAMMAR_SYLLABUS } from '../data/grammarSyllabus';

const READING_THEMES: { title: string; subtitle: string; theme: string }[] = [
  { title: 'Una Giornata a Londra', subtitle: 'Racconto di viaggio e vita quotidiana', theme: 'Viaggi e routine' },
  { title: 'Il Segreto del Vecchio Caffè', subtitle: 'Un piccolo mistero in città', theme: 'Mistero e curiosità' },
  { title: 'Sapori dal Mondo', subtitle: 'Cultura, piatti tipici e tradizioni', theme: 'Cultura e cibo' },
  { title: 'Avventura nella Natura', subtitle: 'Escursione nei parchi naturali', theme: 'Natura e scoperta' },
  { title: 'Un Nuovo Inizio', subtitle: 'Primo giorno di lavoro e nuove conoscenze', theme: 'Lavoro e relazioni' },
  { title: 'La Festa di Quartiere', subtitle: 'Musica, incontri e celebrazioni', theme: 'Eventi e comunità' },
];

const VOCAB_FOCUSES: { title: string; subtitle: string; focus: string }[] = [
  { title: 'Parole Fondamentali', subtitle: 'I termini più frequenti e utili', focus: 'Parole base' },
  { title: 'Verbi d\'Azione Quotidiana', subtitle: 'I verbi indispensabili per comunicare', focus: 'Verbi chiave' },
  { title: 'Descrizioni e Aggettivi', subtitle: 'Aggettivi per descrivere persone e luoghi', focus: 'Aggettivi utili' },
  { title: 'Espressioni e Modi di Dire', subtitle: 'Frasi idiomatiche e formule di cortesia', focus: 'Espressioni naturali' },
  { title: 'Vita Quotidiana e Routine', subtitle: 'Lessico per descrivere la tua giornata', focus: 'Routine e tempo' },
  { title: 'Casa, Città e Spazi', subtitle: 'Luoghi, oggetti e orientamento', focus: 'Ambiente circostante' },
];

export function createDefaultLessonPath(
  level: string = 'A1',
  allGrammarTopics: GrammarTopic[] = GRAMMAR_SYLLABUS,
  grammarProgress: Record<string, GrammarTopicProgress> = {},
  vocabItems: VocabItem[] = []
): LessonPath {
  const cefrLevel = (level || 'A1').toUpperCase() as CEFRLevel;

  // 1. Filter grammar topics for the current level
  const levelGrammarTopics = allGrammarTopics.filter(
    (t) => (t.level || 'A1').toUpperCase() === cefrLevel
  );

  // Fallback to all topics if level has no specific syllabus
  const candidateTopics = levelGrammarTopics.length > 0 ? levelGrammarTopics : allGrammarTopics;

  // Prioritize uncompleted topics
  const unpassedTopics = candidateTopics.filter((t) => !grammarProgress[t.id]?.passed);
  const passedTopics = candidateTopics.filter((t) => grammarProgress[t.id]?.passed);

  // Shuffle pools slightly for variety
  const shuffledUnpassed = [...unpassedTopics].sort(() => 0.5 - Math.random());
  const shuffledPassed = [...passedTopics].sort(() => 0.5 - Math.random());
  const combinedGrammar = [...shuffledUnpassed, ...shuffledPassed];

  // 2. Build balanced 8-lesson sequence (no more than 2 consecutive of same type)
  // Pattern: [Vocabolario, Grammatica, Lettura, Grammatica, Vocabolario, Lettura, Vocabolario, Grammatica]
  const pattern: LessonType[] = [
    'vocabolario',
    'grammatica',
    'lettura',
    'vocabolario',
    'grammatica',
    'lettura',
    'vocabolario',
    'grammatica',
  ];

  let grammarIdx = 0;
  let readingIdx = 0;
  let vocabIdx = 0;

  const lezioni: LessonItem[] = pattern.map((tipo, idx) => {
    const ordine = idx + 1;
    const id = `lesson_${ordine}_${tipo}_${Date.now().toString(36)}`;

    if (tipo === 'grammatica') {
      const topic = combinedGrammar[grammarIdx % combinedGrammar.length] || {
        id: `grammar_topic_${ordine}`,
        name: `Grammatica ${cefrLevel} - Lezione ${ordine}`,
        summary: 'Regole ed esercizi guidati',
      };
      grammarIdx++;
      return {
        id,
        tipo,
        argomentoRiferimento: topic.id,
        stato: 'da_fare',
        ordine,
        title: topic.name,
        subtitle: topic.summary || `Esercizi e regole ${cefrLevel}`,
      };
    } else if (tipo === 'lettura') {
      const theme = READING_THEMES[readingIdx % READING_THEMES.length];
      readingIdx++;
      return {
        id,
        tipo,
        argomentoRiferimento: theme.theme,
        stato: 'da_fare',
        ordine,
        title: theme.title,
        subtitle: theme.subtitle,
      };
    } else {
      // Vocabolario
      const vf = VOCAB_FOCUSES[vocabIdx % VOCAB_FOCUSES.length];
      vocabIdx++;
      return {
        id,
        tipo,
        argomentoRiferimento: vf.focus,
        stato: 'da_fare',
        ordine,
        title: vf.title,
        subtitle: vf.subtitle,
      };
    }
  });

  return {
    id: `path_${cefrLevel}_${Date.now()}`,
    livelloTarget: cefrLevel,
    lezioni,
    checkpointSuperato: null,
    miniTestSuperato: null,
    creatoIl: Date.now(),
  };
}
