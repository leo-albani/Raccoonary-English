import baseImg from '../assets/images/raccoon_greeting_1785942177114.jpg';
import hoodieImg from '../assets/images/outfit_hoodie_verde_1785945687004.jpg';
import berrettoImg from '../assets/images/outfit_berretto_rosso_1785945709291.jpg';
import giaccaImg from '../assets/images/outfit_giacca_occhiali_1785945722858.jpg';
import sciarpaImg from '../assets/images/outfit_sciarpa_autunno_1785945738681.jpg';
import esploratoreImg from '../assets/images/outfit_esploratore_1785945753267.jpg';
import motociclistaImg from '../assets/images/outfit_motociclista_1785945766372.jpg';
import spazialeImg from '../assets/images/outfit_spaziale_1785945780167.jpg';

export interface Outfit {
  id: string;
  name: string;
  description: string;
  cost: number;
  image: string;
  category: 'base' | 'semplice' | 'medio' | 'elaborato';
}

export const RACCOON_OUTFITS: Outfit[] = [
  {
    id: 'base',
    name: 'Procione Classico',
    description: 'L\'outfit naturale e accogliente della tana.',
    cost: 0,
    image: baseImg,
    category: 'base',
  },
  {
    id: 'hoodie_verde',
    name: 'Felpa Verde Accogliente',
    description: 'Morbida e comoda per studiare nelle giornate uggiose.',
    cost: 60,
    image: hoodieImg,
    category: 'semplice',
  },
  {
    id: 'berretto_rosso',
    name: 'Berretto & Sciarpa Invernale',
    description: 'Mantiene le orecchie al caldo durante le sessioni estreme.',
    cost: 100,
    image: berrettoImg,
    category: 'semplice',
  },
  {
    id: 'giacca_occhiali',
    name: 'Giacca Jeans & Occhiali',
    description: 'Stile urban fresco e deciso per dominare i vocaboli.',
    cost: 160,
    image: giaccaImg,
    category: 'medio',
  },
  {
    id: 'sciarpa_autunno',
    name: 'Maglione & Sciarpa Autunnale',
    description: 'Per la stagione del grande raccolto delle ghiande.',
    cost: 220,
    image: sciarpaImg,
    category: 'medio',
  },
  {
    id: 'esploratore',
    name: 'Procione Esploratore',
    description: 'Cappello da safari e bussola per avventure linguistiche.',
    cost: 300,
    image: esploratoreImg,
    category: 'elaborato',
  },
  {
    id: 'motociclista',
    name: 'Giacca da Motociclista',
    description: 'In pelle nera per un ripasso grintoso e sfrecciante.',
    cost: 380,
    image: motociclistaImg,
    category: 'elaborato',
  },
  {
    id: 'spaziale',
    name: 'Procione Spaziale',
    description: 'Tuta da astronauta per esplorare la galassia delle lingue.',
    cost: 450,
    image: spazialeImg,
    category: 'elaborato',
  },
];

export function getOutfitById(id?: string): Outfit {
  if (!id) return RACCOON_OUTFITS[0];
  return RACCOON_OUTFITS.find((o) => o.id === id) || RACCOON_OUTFITS[0];
}
