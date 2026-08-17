import { ScenarioContent } from '../types';

export interface PredefinedScenarioInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultTitle: string;
}

export const PREDEFINED_SCENARIOS: PredefinedScenarioInfo[] = [
  {
    id: 'travel',
    name: 'Viaggio e vacanze',
    icon: '✈️',
    description: 'Aeroporto, hotel, trasporti, direzioni e pianificazione itinerari.',
    defaultTitle: 'Viaggio e Vacanze',
  },
  {
    id: 'work',
    name: 'Ufficio e lavoro',
    icon: '💼',
    description: 'Email professionali, riunioni di team, presentazioni e colleghi.',
    defaultTitle: 'Ufficio e Lavoro',
  },
  {
    id: 'restaurant',
    name: 'Al ristorante',
    icon: '🍽️',
    description: 'Ordinare al tavolo, chiedere consigli, intolleranze e il conto.',
    defaultTitle: 'Al Ristorante',
  },
  {
    id: 'shopping',
    name: 'Fare la spesa',
    icon: '🛒',
    description: 'Supermercato, taglie nei negozi, offerte, sconti e casse.',
    defaultTitle: 'Fare la Spesa',
  },
  {
    id: 'doctor',
    name: 'Dal medico',
    icon: '🩺',
    description: 'Sintomi, farmacia, visite mediche, dosaggi e appuntamenti.',
    defaultTitle: 'Dal Medico e Farmacia',
  },
  {
    id: 'daily_life',
    name: 'Vita di tutti i giorni',
    icon: '🏠',
    description: 'Routine in casa, commissioni, meteo, vicini e tempo libero.',
    defaultTitle: 'Vita di Tutti i Giorni',
  },
  {
    id: 'socializing',
    name: 'Socializzare',
    icon: '☕',
    description: 'Fare due chiacchiere, rompere il ghiaccio, hobby e inviti tra amici.',
    defaultTitle: 'Socializzare e Small Talk',
  },
  {
    id: 'emergencies',
    name: 'Emergenze',
    icon: '🚨',
    description: 'Chiedere aiuto, smarrimento oggetti, ritardi critici e urgenze.',
    defaultTitle: 'Emergenze e Imprevisti',
  },
];

export const SEED_SCENARIOS: Record<string, ScenarioContent> = {
  travel: {
    scenarioId: 'travel',
    scenarioTitle: 'Viaggio e Vacanze',
    vocabulary: [
      { termine: 'boarding pass', traduzione: 'carta d\'imbarco', esempio: 'Please have your boarding pass ready at the gate.' },
      { termine: 'carry-on luggage', traduzione: 'bagaglio a mano', esempio: 'You can bring one piece of carry-on luggage.' },
      { termine: 'delayed', traduzione: 'in ritardo', esempio: 'Our train to London has been delayed by twenty minutes.' },
      { termine: 'book in advance', traduzione: 'prenotare in anticipo', esempio: 'It is cheaper to book your flight tickets in advance.' },
      { termine: 'check-in desk', traduzione: 'banco del check-in', esempio: 'We went straight to the check-in desk to drop our bags.' },
      { termine: 'round trip', traduzione: 'viaggio di andata e ritorno', esempio: 'I bought a round trip ticket for the express train.' },
      { termine: 'gate', traduzione: 'uscita d\'imbarco / gate', esempio: 'Flight BA450 is now boarding at gate 14.' },
      { termine: 'customs', traduzione: 'dogana', esempio: 'We had to pass through customs before leaving the airport.' },
      { termine: 'luggage claim', traduzione: 'ritiro bagagli', esempio: 'Follow the green signs to reach the luggage claim area.' },
      { termine: 'aisle seat', traduzione: 'posto corridoio', esempio: 'I prefer an aisle seat so I can stand up easily.' },
      { termine: 'window seat', traduzione: 'posto finestrino', esempio: 'She booked a window seat to enjoy the mountain view.' },
      { termine: 'shuttle bus', traduzione: 'navetta', esempio: 'A complimentary shuttle bus runs between the terminal and the hotel.' },
    ],
    exercises: [
      {
        id: 'travel_ex_1',
        tipo: 'multiple_choice',
        domanda: 'Quale documento devi mostrare prima di salire sull\'aereo al gate?',
        opzioni: ['Boarding pass', 'Luggage claim', 'Shuttle bus', 'Customs receipt'],
        rispostaCorretta: 'Boarding pass',
        spiegazione: '"Boarding pass" è la carta d\'imbarco necessaria per accedere all\'aereo.',
      },
      {
        id: 'travel_ex_2',
        tipo: 'fill_in_blank',
        domanda: 'I would like a _____ seat, please. I love looking at the clouds during takeoff.',
        rispostaCorretta: 'window',
        spiegazione: '"Window seat" significa posto vicino al finestrino.',
      },
      {
        id: 'travel_ex_3',
        tipo: 'multiple_choice',
        domanda: 'Come si dice in inglese "bagaglio a mano"?',
        opzioni: ['Carry-on luggage', 'Heavy baggage', 'Drop desk', 'Boarding pass'],
        rispostaCorretta: 'Carry-on luggage',
        spiegazione: '"Carry-on luggage" o "hand luggage" indica la borsa/valigia portata a bordo.',
      },
      {
        id: 'travel_ex_4',
        tipo: 'translation',
        domanda: 'Traduci in inglese: "Il nostro volo è in ritardo."',
        rispostaCorretta: 'Our flight is delayed.',
        spiegazione: '"Delayed" significa in ritardo / posticipato.',
      },
      {
        id: 'travel_ex_5',
        tipo: 'multiple_choice',
        domanda: 'Dove vai a ritirare la tua valigia dopo l\'atterraggio?',
        opzioni: ['Luggage claim', 'Check-in desk', 'Customs office', 'Runway'],
        rispostaCorretta: 'Luggage claim',
        spiegazione: '"Luggage claim" (o baggage claim) è l\'area di ritiro bagagli.',
      },
      {
        id: 'travel_ex_6',
        tipo: 'sentence_transformation',
        domanda: 'Trasforma usando "book in advance": "You should reserve the hotel early."',
        rispostaCorretta: 'You should book the hotel in advance.',
        spiegazione: '"Book in advance" è l\'espressione tipica e naturale per "prenotare con anticipo".',
      },
      {
        id: 'travel_ex_7',
        tipo: 'multiple_choice',
        domanda: 'Se compri un biglietto per andare e tornare, compri un...',
        opzioni: ['Round trip ticket', 'One-way ticket', 'Boarding desk', 'Aisle seat'],
        rispostaCorretta: 'Round trip ticket',
        spiegazione: '"Round trip ticket" (in inglese britannico "return ticket") è il biglietto A/R.',
      },
      {
        id: 'travel_ex_8',
        tipo: 'fill_in_blank',
        domanda: 'We can take the free _____ bus from the airport directly to our hotel.',
        rispostaCorretta: 'shuttle',
        spiegazione: '"Shuttle bus" indica il servizio navetta di collegamento.',
      },
    ],
    dialogue: {
      title: 'Al banco delle informazioni dell\'aeroporto',
      context: 'Marco chiede informazioni all\'agente aeroportuale su come raggiungere il gate e ritirare il bagaglio.',
      text: `Agent: "Good morning! How can I help you today?"
Marco: "Hello! My boarding pass says gate 14, but the screen says the flight is delayed."
Agent: "Yes, flight BA450 is delayed by 15 minutes. Boarding will start at 10:30 at gate 14."
Marco: "Great, thank you. And is my carry-on luggage the right size for the overhead bin?"
Agent: "Yes, that bag is perfectly fine. Have a wonderful trip!"`,
      speakers: ['Agent', 'Marco'],
      questions: [
        {
          id: 'dq_1',
          domanda: 'A che ora inizierà l\'imbarco per il volo BA450?',
          opzioni: ['Alle 10:30', 'Alle 10:00', 'Tra un\'ora', 'Il volo è stato cancellato'],
          rispostaCorretta: 'Alle 10:30',
          spiegazione: 'L\'agente conferma che l\'imbarco comincerà alle 10:30.',
        },
        {
          id: 'dq_2',
          domanda: 'Cosa chiede Marco a proposito del suo bagaglio a mano?',
          opzioni: [
            'Se le dimensioni vanno bene per la cappelliera',
            'Se può imbarcarlo gratis',
            'Dove comprare una valigia nuova',
            'A che ora ritirarlo alla dogana',
          ],
          rispostaCorretta: 'Se le dimensioni vanno bene per la cappelliera',
          spiegazione: 'Marco chiede: "Is my carry-on luggage the right size for the overhead bin?".',
        },
      ],
    },
  },
  restaurant: {
    scenarioId: 'restaurant',
    scenarioTitle: 'Al Ristorante',
    vocabulary: [
      { termine: 'table for two', traduzione: 'tavolo per due', esempio: 'We would like a table for two by the window, please.' },
      { termine: 'sparkling water', traduzione: 'acqua frizzante', esempio: 'Could we have a bottle of chilled sparkling water?' },
      { termine: 'still water', traduzione: 'acqua naturale', esempio: 'I prefer still water with a slice of lemon.' },
      { termine: 'bill / check', traduzione: 'il conto', esempio: 'Could we get the bill, please? We are in a hurry.' },
      { termine: 'appetizer', traduzione: 'antipasto', esempio: 'Would you like to order some appetizers while you decide?' },
      { termine: 'main course', traduzione: 'secondo piatto / portata principale', esempio: 'For my main course, I will have the grilled salmon.' },
      { termine: 'dairy-free', traduzione: 'senza latticini', esempio: 'Is this creamy soup dairy-free or made with milk?' },
      { termine: 'rare / medium / well-done', traduzione: 'al sangue / media / ben cotta', esempio: 'How would you like your steak cooked? Medium, please.' },
      { termine: 'tip', traduzione: 'mancia', esempio: 'In many countries, it is customary to leave a 10% tip.' },
      { termine: 'delicious', traduzione: 'delizioso', esempio: 'The pasta was absolutely delicious, compliments to the chef.' },
      { termine: 'recommend', traduzione: 'consigliare', esempio: 'What dish do you recommend for someone who loves seafood?' },
      { termine: 'keep the change', traduzione: 'tenga il resto', esempio: 'Here is twenty pounds, keep the change.' },
    ],
    exercises: [
      {
        id: 'rest_ex_1',
        tipo: 'multiple_choice',
        domanda: 'Come chiedi educatamente il conto al cameriere in inglese?',
        opzioni: ['Could we have the bill, please?', 'Give me the money now!', 'Where is my table?', 'I want water.'],
        rispostaCorretta: 'Could we have the bill, please?',
        spiegazione: '"Could we have the bill, please?" (o "the check" in USA) è la formula più educata e comune.',
      },
      {
        id: 'rest_ex_2',
        tipo: 'fill_in_blank',
        domanda: 'Could we have a bottle of _____ water? We don\'t like carbonated or fizzy water.',
        rispostaCorretta: 'still',
        spiegazione: '"Still water" è l\'acqua naturale, mentre "sparkling" è frizzante.',
      },
      {
        id: 'rest_ex_3',
        tipo: 'multiple_choice',
        domanda: 'Se non puoi mangiare formaggio e latte, cerchi piatti...',
        opzioni: ['Dairy-free', 'Spicy', 'Well-done', 'Rare'],
        rispostaCorretta: 'Dairy-free',
        spiegazione: '"Dairy-free" significa privo di latticini.',
      },
      {
        id: 'rest_ex_4',
        tipo: 'translation',
        domanda: 'Traduci in inglese: "Cosa ci consiglia per cena?"',
        rispostaCorretta: 'What do you recommend for dinner?',
        spiegazione: '"To recommend" significa raccomandare o consigliare.',
      },
      {
        id: 'rest_ex_5',
        tipo: 'multiple_choice',
        domanda: 'Quando paghi e vuoi dire al cameriere di tenere il resto, cosa dici?',
        opzioni: ['Keep the change', 'Take the bill', 'Leave the plate', 'Order the dessert'],
        rispostaCorretta: 'Keep the change',
        spiegazione: '"Keep the change" significa letteralmente "tenga pure il resto".',
      },
      {
        id: 'rest_ex_6',
        tipo: 'fill_in_blank',
        domanda: 'For my _____ course, I would like the roasted chicken with vegetables.',
        rispostaCorretta: 'main',
        spiegazione: '"Main course" è la portata principale.',
      },
      {
        id: 'rest_ex_7',
        tipo: 'multiple_choice',
        domanda: 'Come si definisce una bistecca cotta "al sangue"?',
        opzioni: ['Rare', 'Well-done', 'Medium', 'Cold'],
        rispostaCorretta: 'Rare',
        spiegazione: '"Rare" è al sangue, "Medium" è a media cottura, "Well-done" è ben cotta.',
      },
      {
        id: 'rest_ex_8',
        tipo: 'sentence_transformation',
        domanda: 'Esprimi l\'ordine con "I will have": "Voglio il salmone alla griglia."',
        rispostaCorretta: 'I will have the grilled salmon.',
        spiegazione: '"I will have..." o "I would like..." è il modo più elegante per ordinare.',
      },
    ],
    dialogue: {
      title: 'Cena al bistrot',
      context: 'Sara e Luca ordinano la cena in un accogliente bistrot nel centro di Edimburgo.',
      text: `Waiter: "Good evening! Have you decided on what you would like to order?"
Sara: "Yes, we are ready. To start, we would like the bruschetta as an appetizer."
Luca: "And for the main course, what fish do you recommend today?"
Waiter: "The grilled sea bass is fresh and delicious today."
Luca: "Perfect, I will have the grilled sea bass, and could we get a bottle of sparkling water?"
Waiter: "Certainly! I will bring your drinks right away."`,
      speakers: ['Waiter', 'Sara', 'Luca'],
      questions: [
        {
          id: 'dq_rest_1',
          domanda: 'Cosa scelgono come antipasto (appetizer)?',
          opzioni: ['La bruschetta', 'La zuppa di pesce', 'Il salmone', 'Le patatine'],
          rispostaCorretta: 'La bruschetta',
          spiegazione: 'Sara ordina: "the bruschetta as an appetizer".',
        },
        {
          id: 'dq_rest_2',
          domanda: 'Che tipo di acqua ordina Luca?',
          opzioni: ['Acqua frizzante (sparkling water)', 'Acqua naturale', 'Acqua calda con limone', 'Vino rosso'],
          rispostaCorretta: 'Acqua frizzante (sparkling water)',
          spiegazione: 'Luca chiede "a bottle of sparkling water".',
        },
      ],
    },
  },
};
