import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ParsedImportRow } from '../types';

/**
 * Fix triple-encoded UTF-8 (mojibake) from export tools like Reverso Context.
 */
export function fixMojibake(str: string): string {
  if (!str) return '';
  let result = str;
  for (let i = 0; i < 3; i++) {
    if (!/[ÃÂ]/.test(result)) break; // nessun segnale di doppia codifica residuo
    try {
      const bytes = Uint8Array.from(result, (c) => c.charCodeAt(0) & 0xFF);
      const attempt = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (attempt === result) break;
      result = attempt;
    } catch (e) {
      break; // non è più UTF-8 valido: la stringa precedente era già corretta
    }
  }
  return result;
}

/**
 * Utility to strip HTML tags like <em>...</em> or <em class="..."> from example sentences.
 * Updated regex handles both <em...> and </em> as requested.
 */
export function cleanHtmlTags(str: string): string {
  if (!str) return '';
  const fixed = fixMojibake(str);
  return fixed
    .replace(/<em[^>]*>/g, '')
    .replace(/<\/em>/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Parse CSV content using PapaParse with header: true, skipEmptyLines: true,
 * tolerant header matching (case-insensitive, space/underscore tolerant),
 * triple-encoding (mojibake) fix, and isolated row-level error handling.
 */
export function parseCsvContent(csvText: string): ParsedImportRow[] {
  if (!csvText || !csvText.trim()) return [];

  // Parse using PapaParse
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const results: ParsedImportRow[] = [];

  const normalizeKey = (k: string) => k.toLowerCase().replace(/[\s_]+/g, '');

  if (parsed.data && parsed.data.length > 0) {
    for (const rawRow of parsed.data) {
      try {
        const normalizedRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawRow)) {
          if (k) {
            normalizedRow[normalizeKey(k)] = fixMojibake(String(v || ''));
          }
        }

        let term = '';
        let translation = '';
        let srcLang: 'it' | 'en' = 'en';
        let tgtLang: 'it' | 'en' = 'it';
        let synonyms: string[] = [];
        let exampleSource = '';
        let exampleTranslation = '';

        // Case-insensitive, space/underscore-tolerant header lookup
        for (const k in normalizedRow) {
          const val = normalizedRow[k];
          if (/^(searchtext|search|term|word|parola|sourcetext|expression)$/i.test(k)) {
            if (!term) term = val;
          } else if (/^(translation|translationtext|targettext|traduzione)$/i.test(k)) {
            if (!translation) translation = val;
          } else if (/^(searchlanguage|sourcelanguage|srclang|source|lang1)$/i.test(k)) {
            if (val.toLowerCase().includes('it')) srcLang = 'it';
            else if (val.toLowerCase().includes('en')) srcLang = 'en';
          } else if (/^(targetlanguage|tgtlang|target|lang2)$/i.test(k)) {
            if (val.toLowerCase().includes('it')) tgtLang = 'it';
            else if (val.toLowerCase().includes('en')) tgtLang = 'en';
          } else if (/^(tags|tag|comments|synonyms|sinonimi)$/i.test(k)) {
            if (val) {
              synonyms = val.split(',').map((s) => fixMojibake(s).trim()).filter(Boolean);
            }
          } else if (/^(examplesource|sourceexample|example|sentence|frase|context)$/i.test(k)) {
            if (!exampleSource) exampleSource = val;
          } else if (/^(exampletranslation|targetexample|traduzioneesempio)$/i.test(k)) {
            if (!exampleTranslation) exampleTranslation = val;
          }
        }

        // Positional fallback if headers did not match standard names
        if (!term || !translation) {
          const values = Object.values(rawRow).map((v) => fixMojibake(String(v || '')).trim());
          if (values.length >= 2) {
            term = term || values[0];
            translation = translation || values[1];
            if (values[2] && synonyms.length === 0) {
              synonyms = values[2].split(',').map((s) => fixMojibake(s).trim()).filter(Boolean);
            }
            if (values[3] && !exampleSource) exampleSource = values[3];
            if (values[4] && !exampleTranslation) exampleTranslation = values[4];
          }
        }

        // Clean example sentences
        exampleSource = cleanHtmlTags(exampleSource);
        exampleTranslation = cleanHtmlTags(exampleTranslation);

        term = fixMojibake(term.trim());
        translation = fixMojibake(translation.trim());

        if (term && translation) {
          results.push({
            term,
            translation,
            sourceLang: srcLang,
            targetLang: tgtLang,
            synonyms,
            exampleSource,
            exampleTranslation,
            selected: true,
          });
        } else {
          // Row couldn't be parsed fully - do not fail import, skip or mark for manual review
          console.warn('Riga saltata o parzialmente non valida:', rawRow);
        }
      } catch (err) {
        console.warn('Errore parsing su singola riga, saltata:', err);
      }
    }
  }

  return results;
}

/**
 * Parse Excel file buffer or ArrayBuffer using xlsx library with fixMojibake and cleanHtmlTags
 */
export function parseExcelFile(arrayBuffer: ArrayBuffer): ParsedImportRow[] {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

  if (!jsonData || jsonData.length === 0) return [];

  const results: ParsedImportRow[] = [];
  let startIndex = 0;

  // Header inspection
  const firstRow = (jsonData[0] as any[]) || [];
  const isHeader = firstRow.some((cell) => typeof cell === 'string' && /search|term|parola|traduzione|translation/i.test(cell));
  if (isHeader) {
    startIndex = 1;
  }

  for (let i = startIndex; i < jsonData.length; i++) {
    try {
      const row = (jsonData[i] as any[]) || [];
      if (!row || row.length < 2) continue;

      const term = fixMojibake(String(row[0] || '').trim());
      const translation = fixMojibake(String(row[1] || '').trim());
      if (!term || !translation) continue;

      const rawSynonyms = row[2] ? String(row[2]) : '';
      const synonyms = rawSynonyms
        ? rawSynonyms.split(',').map((s) => fixMojibake(s).trim()).filter(Boolean)
        : [];
      const exampleSource = cleanHtmlTags(row[3] ? String(row[3]) : '');
      const exampleTranslation = cleanHtmlTags(row[4] ? String(row[4]) : '');

      results.push({
        term,
        translation,
        sourceLang: 'en',
        targetLang: 'it',
        synonyms,
        exampleSource,
        exampleTranslation,
        selected: true,
      });
    } catch (e) {
      console.warn('Errore riga excel:', e);
    }
  }

  return results;
}
