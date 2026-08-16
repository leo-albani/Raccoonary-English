export const INTEREST_OPTIONS = [
  'Sport',
  'Musica',
  'Cinema e TV',
  'Tecnologia',
  'Viaggi',
  'Cucina',
  'Finanza',
  'Scienza',
  'Storia e cultura',
  'Attualità',
  'Natura',
] as const;

export type InterestOption = (typeof INTEREST_OPTIONS)[number];

export const INTEREST_ICONS: Record<string, string> = {
  Sport: '⚽',
  Musica: '🎵',
  'Cinema e TV': '🎬',
  Tecnologia: '💻',
  Viaggi: '✈️',
  Cucina: '🍳',
  Finanza: '📈',
  Scienza: '🔬',
  'Storia e cultura': '🏛️',
  Attualità: '📰',
  Natura: '🌿',
  Sorprendimi: '🎲',
};
