import * as XLSX from 'xlsx';
import { ParsedImportRow } from '../types';

// Utility to strip HTML tags like <em>...</em> from example sentences
export function cleanHtmlTags(str: string): string {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

// Parse CSV content line by line handling quotes and accents
export function parseCsvContent(csvText: string): ParsedImportRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse rows (simple quote-aware parser)
  const rows: string[][] = [];
  for (const line of lines) {
    const row: string[] = [];
    let insideQuotes = false;
    let currentCell = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    rows.push(row);
  }

  if (rows.length === 0) return [];

  // Detect header row if present
  let startIndex = 0;
  const header = rows[0].map((h) => h.toLowerCase());
  const isHeader =
    header.some((h) => h.includes('search') || h.includes('translation') || h.includes('parola') || h.includes('term'));

  if (isHeader) {
    startIndex = 1;
  }

  const results: ParsedImportRow[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 2) continue;

    // Check if Reverso Context structure (9 columns)
    let srcLang: 'it' | 'en' = 'en';
    let tgtLang: 'it' | 'en' = 'it';
    let term = '';
    let translation = '';
    let synonyms: string[] = [];
    let exampleSource = '';
    let exampleTranslation = '';

    if (r.length >= 4 && (r[0].toLowerCase() === 'en' || r[0].toLowerCase() === 'it' || r[1].toLowerCase() === 'en' || r[1].toLowerCase() === 'it')) {
      // Reverso Context format
      srcLang = (r[0].toLowerCase() === 'it' ? 'it' : 'en');
      tgtLang = (r[1].toLowerCase() === 'en' ? 'en' : 'it');
      term = r[2] || '';
      translation = r[3] || '';
      if (r[4]) {
        synonyms = r[4].split(',').map((s) => s.trim()).filter(Boolean);
      }
      exampleSource = cleanHtmlTags(r[5] || '');
      exampleTranslation = cleanHtmlTags(r[6] || '');
    } else {
      // General 2-column or 3-column format
      term = r[0] || '';
      translation = r[1] || '';
      if (r[2]) {
        synonyms = r[2].split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (r[3]) exampleSource = cleanHtmlTags(r[3]);
      if (r[4]) exampleTranslation = cleanHtmlTags(r[4]);
    }

    if (!term || !translation) continue;

    results.push({
      term: term.trim(),
      translation: translation.trim(),
      sourceLang: srcLang,
      targetLang: tgtLang,
      synonyms,
      exampleSource,
      exampleTranslation,
      selected: true,
    });
  }

  return results;
}

// Parse Excel file buffer or ArrayBuffer using xlsx library
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
    const row = (jsonData[i] as any[]) || [];
    if (!row || row.length < 2) continue;

    const term = String(row[0] || '').trim();
    const translation = String(row[1] || '').trim();
    if (!term || !translation) continue;

    const rawSynonyms = row[2] ? String(row[2]) : '';
    const synonyms = rawSynonyms ? rawSynonyms.split(',').map((s) => s.trim()).filter(Boolean) : [];
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
  }

  return results;
}
