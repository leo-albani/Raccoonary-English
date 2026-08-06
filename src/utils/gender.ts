import { Gender } from '../types';

/**
 * Returns a gendered word or a neutral rephrased fallback.
 * @param gender 'M' | 'F' | 'undisclosed' | undefined
 * @param masculine Word for masculine ('M')
 * @param feminine Word for feminine ('F')
 * @param fallbackWithoutWord Fallback string for 'undisclosed' or undefined (no gender assumed)
 */
export function genderedWord(
  gender: Gender | undefined | null,
  masculine: string,
  feminine: string,
  fallbackWithoutWord: string
): string {
  if (gender === 'M') return masculine;
  if (gender === 'F') return feminine;
  return fallbackWithoutWord;
}
