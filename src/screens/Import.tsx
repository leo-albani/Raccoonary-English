import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { VocabItem, ParsedImportRow } from '../types';
import { parseCsvContent, parseExcelFile } from '../services/parsers';
import { parseUnstructuredImport } from '../services/gemini';

interface ImportProps {
  existingVocabItems: VocabItem[];
  onBulkImport: (newItems: VocabItem[]) => void;
  onNavigateToHome: () => void;
}

export const Import: React.FC<ImportProps> = ({
  existingVocabItems,
  onBulkImport,
  onNavigateToHome,
}) => {
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [rawText, setRawText] = useState('');
  const [importSource, setImportSource] = useState<'file' | 'text'>('file');
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setSuccessCount(null);

    try {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await file.text();
        const rows = parseCsvContent(text);
        setParsedRows(rows);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const rows = parseExcelFile(buffer);
        setParsedRows(rows);
      } else {
        // Fallback or PDF via Gemini parsing
        const text = await file.text();
        const items = await parseUnstructuredImport(text);
        const rows: ParsedImportRow[] = items.map((i: any) => ({
          term: i.term || '',
          translation: i.translation || '',
          sourceLang: i.sourceLang || 'en',
          targetLang: i.targetLang || 'it',
          synonyms: i.synonyms || [],
          exampleSource: i.exampleSource || '',
          exampleTranslation: i.exampleTranslation || '',
          selected: true,
        }));
        setParsedRows(rows);
      }
    } catch (err) {
      console.error(err);
      alert('Non sono riuscito a leggere questo file. Assicurati che sia un CSV, Excel o file di testo.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleTextParse = async () => {
    if (!rawText.trim() || isParsing) return;
    setIsParsing(true);
    setSuccessCount(null);

    try {
      // First try standard CSV parse
      let rows = parseCsvContent(rawText);
      if (rows.length === 0) {
        // Fallback to Gemini AI text parser
        const items = await parseUnstructuredImport(rawText);
        rows = items.map((i: any) => ({
          term: i.term || '',
          translation: i.translation || '',
          sourceLang: i.sourceLang || 'en',
          targetLang: i.targetLang || 'it',
          synonyms: i.synonyms || [],
          exampleSource: i.exampleSource || '',
          exampleTranslation: i.exampleTranslation || '',
          selected: true,
        }));
      }
      setParsedRows(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setIsParsing(false);
    }
  };

  const toggleSelectAll = (select: boolean) => {
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  const handleConfirmImport = () => {
    const selected = parsedRows.filter((r) => r.selected && r.term.trim() && r.translation.trim());
    if (selected.length === 0) return;

    const existingMap = new Map<string, VocabItem>();
    existingVocabItems.forEach((item) => {
      const key = `${item.term.trim().toLowerCase()}_${item.sourceLang}`;
      existingMap.set(key, item);
    });

    const itemsToSave: VocabItem[] = [];

    selected.forEach((row) => {
      const key = `${row.term.trim().toLowerCase()}_${row.sourceLang}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Merge without resetting box level or review date
        const updatedSynonyms = Array.from(new Set([...existing.synonyms, ...row.synonyms]));
        itemsToSave.push({
          ...existing,
          synonyms: updatedSynonyms,
          exampleSource: existing.exampleSource || row.exampleSource,
          exampleTranslation: existing.exampleTranslation || row.exampleTranslation,
        });
      } else {
        // Create new VocabItem in Box 1
        itemsToSave.push({
          id: `imported_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          term: row.term.trim(),
          translation: row.translation.trim(),
          sourceLang: row.sourceLang,
          targetLang: row.targetLang,
          synonyms: row.synonyms,
          exampleSource: row.exampleSource,
          exampleTranslation: row.exampleTranslation,
          origin: 'import',
          originDetail: 'File importato',
          createdAt: Date.now(),
          lastReviewedAt: null,
          box: 1,
          nextReviewAt: Date.now(),
          correctStreak: 0,
          wrongCount: 0,
        });
      }
    });

    onBulkImport(itemsToSave);
    setSuccessCount(itemsToSave.length);
    setParsedRows([]);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* Top Header Bento Card */}
      <div className="bento-card text-center space-y-3 max-w-2xl mx-auto">
        <div className="flex justify-center">
          <Mascot pose="digging" size={100} />
        </div>
        <span className="badge-muschio inline-flex">Strumento di Importazione</span>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#F2E8D5]">
          Importa i tuoi vocaboli 📥
        </h1>
        <p className="text-xs sm:text-sm text-[#F2E8D5]/80 leading-relaxed font-medium">
          Puoi importare i file esportati da Reverso Context (CSV), tabelle Excel (.xlsx) o incollare direttamente un testo.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="bg-[#1A1512] p-1.5 rounded-2xl border border-[#6B7C4F]/30 flex shadow-xs max-w-md mx-auto">
        <button
          onClick={() => setImportSource('file')}
          className={`flex-1 py-2.5 rounded-xl font-bold font-display text-xs transition-all cursor-pointer ${
            importSource === 'file' ? 'bg-[#E8802F] text-[#1A1512] shadow-xs' : 'text-[#F2E8D5]/70 hover:text-[#F2E8D5]'
          }`}
        >
          📄 File CSV / Excel
        </button>
        <button
          onClick={() => setImportSource('text')}
          className={`flex-1 py-2.5 rounded-xl font-bold font-display text-xs transition-all cursor-pointer ${
            importSource === 'text' ? 'bg-[#E8802F] text-[#1A1512] shadow-xs' : 'text-[#F2E8D5]/70 hover:text-[#F2E8D5]'
          }`}
        >
          ✍️ Incolla Testo
        </button>
      </div>

      {/* Input Section */}
      <div className="max-w-2xl mx-auto">
        {importSource === 'file' ? (
          <div className="bento-card border-2 border-dashed border-[#6B7C4F]/40 text-center space-y-4 hover:border-[#E8802F] transition-all">
            <div className="text-5xl">📂</div>
            <div className="space-y-1">
              <p className="text-base font-bold text-[#F2E8D5] font-display">
                Trascina qui il tuo file o selezionalo
              </p>
              <p className="text-xs text-[#859966] font-medium">
                Supporta .csv (Reverso Context), .xlsx, .txt
              </p>
            </div>

            <label className="btn-zucca text-sm px-8 py-3.5 inline-flex cursor-pointer">
              <span>Sfoglia file</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="bento-card space-y-4">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
              placeholder={`Esempio:\napple, mela\nbook, libro\nbeautiful, bello`}
              className="w-full p-4 rounded-2xl bg-[#1A1512] border border-[#6B7C4F]/35 focus:border-[#E8802F] focus:outline-none text-sm text-[#F2E8D5] placeholder-[#F2E8D5]/40 font-medium leading-relaxed"
            />
            <button
              onClick={handleTextParse}
              disabled={!rawText.trim() || isParsing}
              className="btn-zucca w-full py-4 text-base disabled:opacity-50"
            >
              Estrai Vocaboli ⚡
            </button>
          </div>
        )}
      </div>

      {/* Loading Digging Raccoon */}
      {isParsing && (
        <div className="bento-card text-center py-8 space-y-3 max-w-2xl mx-auto">
          <Mascot pose="digging" size={110} speechBubble="Sto scavando per trovare i tuoi vocaboli..." />
          <p className="text-xs text-[#859966] font-medium">Analisi in corso...</p>
        </div>
      )}

      {/* Success Notification */}
      {successCount !== null && (
        <div className="bento-card border-2 border-[#6B7C4F] text-center space-y-3 animate-fade-in max-w-2xl mx-auto">
          <div className="text-3xl">🎉</div>
          <h3 className="font-bold font-display text-[#F2E8D5] text-xl">
            {successCount} parole aggiunte in tana!
          </h3>
          <p className="text-xs sm:text-sm text-[#859966] font-medium">
            Sono pronte nel tuo sistema di memorizzazione Spaced Repetition.
          </p>
          <button
            onClick={onNavigateToHome}
            className="btn-zucca px-8 py-3 text-sm mt-2"
          >
            Torna alla tana 🏠
          </button>
        </div>
      )}

      {/* Parsed Preview Table */}
      {parsedRows.length > 0 && (
        <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold font-display text-[#F2E8D5]">
              Trovati {parsedRows.length} vocaboli
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => toggleSelectAll(true)}
                className="text-xs font-bold font-display text-[#859966] hover:underline cursor-pointer"
              >
                Seleziona tutti
              </button>
              <button
                onClick={() => toggleSelectAll(false)}
                className="text-xs font-bold font-display text-[#F2E8D5]/60 hover:underline cursor-pointer"
              >
                Deseleziona
              </button>
            </div>
          </div>

          <div className="bento-card p-2 overflow-hidden max-h-96 overflow-y-auto divide-y divide-[#6B7C4F]/20">
            {parsedRows.map((row, idx) => (
              <div key={idx} className="p-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setParsedRows((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, selected: checked } : r))
                    );
                  }}
                  className="w-4 h-4 accent-[#E8802F] cursor-pointer"
                />
                <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={row.term}
                    onChange={(e) => {
                      const val = e.target.value;
                      setParsedRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, term: val } : r))
                      );
                    }}
                    className="p-2.5 rounded-xl bg-[#1A1512] border border-[#6B7C4F]/30 font-bold text-[#F2E8D5] text-sm focus:outline-none focus:border-[#E8802F]"
                  />
                  <input
                    type="text"
                    value={row.translation}
                    onChange={(e) => {
                      const val = e.target.value;
                      setParsedRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, translation: val } : r))
                      );
                    }}
                    className="p-2.5 rounded-xl bg-[#1A1512] border border-[#6B7C4F]/30 text-[#859966] text-sm font-medium focus:outline-none focus:border-[#E8802F]"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirmImport}
            className="btn-zucca w-full py-4 text-lg shadow-md"
          >
            Conferma e Salva ({parsedRows.filter((r) => r.selected).length}) in Tana 🌰
          </button>
        </div>
      )}
    </div>
  );
};
