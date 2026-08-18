import React, { useState, useEffect, useRef } from 'react';
import { PhraseDeepDiveResult, TranslationResult, VocabItem, WordDeepDiveResult } from '../types';
import { getPhraseDeepDive, getWordDeepDive, translateText } from '../services/gemini';
import { Mascot } from '../mascot/Mascot';

interface TranslatorProps {
  vocabItems: VocabItem[];
  onAddVocabItem: (item: VocabItem) => void;
  onDeleteItem: (itemId: string) => void;
  nativeLang?: string;
  targetLang?: string;
  nativeName?: string;
  targetName?: string;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Translator: React.FC<TranslatorProps> = ({
  vocabItems,
  onAddVocabItem,
  onDeleteItem,
  nativeLang = 'it',
  targetLang = 'en',
  nativeName = 'Italiano',
  targetName = 'Inglese',
  t,
}) => {
  const [query, setQuery] = useState('');
  const [directionMode, setDirectionMode] = useState<'auto' | 'it-en' | 'en-it'>('auto');
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentResult, setCurrentResult] = useState<TranslationResult | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [searchedText, setSearchedText] = useState('');
  const [hasSpeech, setHasSpeech] = useState(false);

  // Recent queries stored locally for convenience
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('raccoonary_recent_queries');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Deep Dive Modal state for words
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);
  const [deepDiveData, setDeepDiveData] = useState<WordDeepDiveResult | null>(null);

  // Deep Dive Modal state for full phrase
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);
  const [isLoadingPhraseDeepDive, setIsLoadingPhraseDeepDive] = useState(false);
  const [phraseDeepDiveData, setPhraseDeepDiveData] = useState<PhraseDeepDiveResult | null>(null);

  // Star animation triggers
  const [animateMainStar, setAnimateMainStar] = useState(false);
  const [animateWordStar, setAnimateWordStar] = useState(false);

  // Speech synthesis capability check
  useEffect(() => {
    setHasSpeech(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const speakText = (text: string, lang: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!text || !text.trim()) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = lang; // 'en-US' or 'it-IT'
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  };

  const saveQueryToHistory = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentQueries.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
    setRecentQueries(updated);
    try {
      localStorage.setItem('raccoonary_recent_queries', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleSearchSubmit = async (textToTranslate: string) => {
    const cleanText = textToTranslate.trim();
    if (!cleanText) {
      setCurrentResult(null);
      setTranslationError(null);
      return;
    }

    setIsTranslating(true);
    setCurrentResult(null);
    setTranslationError(null);
    setPhraseDeepDiveData(null);
    setSearchedText(cleanText);
    saveQueryToHistory(cleanText);

    try {
      const res = await translateText(cleanText, nativeLang, targetLang, nativeName, targetName);
      setCurrentResult(res);
    } catch (err) {
      console.error(err);
      setTranslationError('Non sono riuscito a tradurre in questo momento.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwapDirection = () => {
    if (directionMode === 'auto') {
      const isCurrentIt = currentResult?.lingua_origine === 'it' || /[àèéìòù]/i.test(query);
      setDirectionMode(isCurrentIt ? 'en-it' : 'it-en');
    } else if (directionMode === 'it-en') {
      setDirectionMode('en-it');
    } else {
      setDirectionMode('it-en');
    }

    // If we have output and query, swap query text with output
    if (currentResult?.traduzione_principale) {
      const prevOutput = currentResult.traduzione_principale;
      setQuery(prevOutput);
    }
  };

  const handleWordClick = async (word: string) => {
    const cleanWord = word.replace(/[^\w'-]/g, '').trim();
    if (!cleanWord) return;

    setSelectedWord(cleanWord);
    setIsLoadingDeepDive(true);
    setDeepDiveData(null);

    try {
      const deepDive = await getWordDeepDive(cleanWord, searchedText);
      setDeepDiveData(deepDive);
    } catch (err) {
      console.error(err);
      setDeepDiveData({
        definizione: `Termine in contesto: ${cleanWord}`,
        nota_uso: 'Utilizzato nella frase cercata.',
        esempi: [{ en: `Example with ${cleanWord}`, it: `Esempio con ${cleanWord}` }],
      });
    } finally {
      setIsLoadingDeepDive(false);
    }
  };

  const handlePhraseDeepDiveClick = async () => {
    if (!searchedText) return;
    setSelectedPhrase(searchedText);
    setIsLoadingPhraseDeepDive(true);
    setPhraseDeepDiveData(null);

    try {
      const res = await getPhraseDeepDive(searchedText);
      setPhraseDeepDiveData(res);

      if (savedMainItem) {
        const enrichedItem: VocabItem = {
          ...savedMainItem,
          usageNote: res.quando_si_usa,
          exampleSource: res.esempi?.[0]?.en || savedMainItem.exampleSource || '',
          exampleTranslation: res.esempi?.[0]?.it || savedMainItem.exampleTranslation || '',
        };
        onAddVocabItem(enrichedItem);
      }
    } catch (err) {
      console.error(err);
      setPhraseDeepDiveData({
        tipo: 'idiomatico',
        quando_si_usa: `Espressione "${searchedText}": utilizzata in contesti colloquiali o quotidiani.`,
        esempi: [{ en: searchedText, it: currentResult?.traduzione_principale || '' }],
      });
    } finally {
      setIsLoadingPhraseDeepDive(false);
    }
  };

  // Check if main search result is saved in tana
  const savedMainItem = currentResult
    ? vocabItems.find((i) => i.term.toLowerCase() === searchedText.toLowerCase())
    : undefined;

  const toggleMainStar = () => {
    setAnimateMainStar(true);
    setTimeout(() => setAnimateMainStar(false), 300);

    if (savedMainItem) {
      onDeleteItem(savedMainItem.id);
    } else if (currentResult && searchedText) {
      const newItemId = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newVocabItem: VocabItem = {
        id: newItemId,
        term: searchedText,
        translation: currentResult.traduzione_principale,
        sourceLang: currentResult.lingua_origine,
        targetLang: currentResult.lingua_origine === 'it' ? 'en' : 'it',
        synonyms: currentResult.alternative || [],
        exampleSource: phraseDeepDiveData?.esempi?.[0]?.en || '',
        exampleTranslation: phraseDeepDiveData?.esempi?.[0]?.it || '',
        usageNote: phraseDeepDiveData?.quando_si_usa || '',
        origin: 'translator_search',
        originDetail: 'Ricerca Traduttore',
        createdAt: Date.now(),
        lastReviewedAt: null,
        box: 1,
        nextReviewAt: Date.now(),
        correctStreak: 0,
        wrongCount: 0,
      };
      onAddVocabItem(newVocabItem);
    }
  };

  // Check if currently selected word deep dive is saved in tana
  const savedWordItem = selectedWord
    ? vocabItems.find((i) => i.term.toLowerCase() === selectedWord.toLowerCase())
    : undefined;

  const toggleWordStar = () => {
    setAnimateWordStar(true);
    setTimeout(() => setAnimateWordStar(false), 300);

    if (savedWordItem) {
      onDeleteItem(savedWordItem.id);
    } else if (selectedWord) {
      const wordItemId = `lookup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const wordVocabItem: VocabItem = {
        id: wordItemId,
        term: selectedWord,
        translation: deepDiveData?.definizione || currentResult?.traduzione_principale || 'Approfondimento',
        sourceLang: 'en',
        targetLang: 'it',
        synonyms: [],
        exampleSource: deepDiveData?.esempi?.[0]?.en || '',
        exampleTranslation: deepDiveData?.esempi?.[0]?.it || '',
        origin: 'translator_lookup',
        originDetail: searchedText,
        createdAt: Date.now(),
        lastReviewedAt: null,
        box: 1,
        nextReviewAt: Date.now(),
        correctStreak: 0,
        wrongCount: 0,
      };
      onAddVocabItem(wordVocabItem);
    }
  };

  // Language display logic for input & output panels
  const nativeCodeUpper = (nativeLang || 'it').toUpperCase();
  const targetCodeUpper = (targetLang || 'en').toUpperCase();
  const nativeLabel = `${nativeName} (${nativeCodeUpper})`;
  const targetLabel = `${targetName} (${targetCodeUpper})`;

  const detectedSourceLang = currentResult?.lingua_origine || (/[àèéìòù]/i.test(query) ? nativeLang : targetLang);
  const inputLangLabel = directionMode === 'it-en' ? nativeLabel : directionMode === 'en-it' ? targetLabel : detectedSourceLang === nativeLang ? nativeLabel : targetLabel;
  const outputLangLabel = directionMode === 'it-en' ? targetLabel : directionMode === 'en-it' ? nativeLabel : detectedSourceLang === nativeLang ? targetLabel : nativeLabel;

  const inputLangCode = (directionMode === 'it-en' || (directionMode === 'auto' && detectedSourceLang === nativeLang)) ? `${nativeLang}-${nativeCodeUpper}` : `${targetLang}-${targetCodeUpper}`;
  const outputLangCode = inputLangCode.startsWith(nativeLang) ? `${targetLang}-${targetCodeUpper}` : `${nativeLang}-${nativeCodeUpper}`;

  // Split sentence into words & whitespace for clickable tokens
  const renderClickableTokens = (text: string) => {
    const tokens = text.split(/(\s+)/);
    return tokens.map((token, idx) => {
      if (/^\s+$/.test(token)) {
        return <span key={idx}>{token}</span>;
      }
      const clean = token.replace(/[^\w'-]/g, '');
      if (!clean) return <span key={idx}>{token}</span>;

      const isTokenSaved = vocabItems.some((i) => i.term.toLowerCase() === clean.toLowerCase());

      return (
        <button
          key={idx}
          onClick={() => handleWordClick(clean)}
          className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-xl border shadow-xs transition-all cursor-pointer mx-0.5 text-base sm:text-lg ${
            isTokenSaved
              ? 'bg-[#E8802F]/20 border-[#E8802F] text-[#E8802F]'
              : 'bg-[#1A1512] hover:bg-[#E8802F] hover:text-[#1A1512] text-[#F2E8D5] border-[#6B7C4F]/30'
          }`}
          title={`Tocca per approfondire "${clean}"`}
        >
          <span>{token}</span>
          {isTokenSaved && <span className="text-xs text-[#E8802F]">★</span>}
        </button>
      );
    });
  };

  return (
    <div className="bg-[#2B2622] p-5 sm:p-6 rounded-3xl border-2 border-[#6B7C4F]/30 shadow-xl space-y-4 text-[#F2E8D5]">
      {/* Top Header & Language Bar */}
      <div className="flex items-center justify-between border-b border-[#6B7C4F]/20 pb-2">
        <span className="text-xs sm:text-sm font-black text-[#859966] uppercase tracking-wider font-display flex items-center gap-1.5">
          <span>🦝</span> Traduttore Raccoonary
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#F2E8D5] bg-[#1A1512] px-3 py-1 rounded-xl border border-[#6B7C4F]/30 font-display">
            {inputLangLabel.split(' ')[0]} ➔ {outputLangLabel.split(' ')[0]}
          </span>
          <button
            type="button"
            onClick={handleSwapDirection}
            className="p-1.5 bg-[#1A1512] hover:bg-[#342D28] text-[#F2E8D5] border border-[#6B7C4F]/30 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
            title="Inverti direzione lingua (⇄)"
          >
            ⇄
          </button>
        </div>
      </div>

      {/* TWO STACKED PANELS (Input & Output) */}
      <div className="space-y-3">
        {/* UPPER PANEL: INPUT TEXTAREA */}
        <div className="bg-[#1A1512] rounded-2xl p-3.5 sm:p-4 border-2 border-[#6B7C4F]/30 focus-within:border-[#E8802F] transition-all shadow-inner space-y-2 relative">
          <div className="flex items-center justify-between text-xs font-bold text-[#859966] font-display">
            <span>Da: {inputLangLabel}</span>
            <div className="flex items-center gap-2">
              {hasSpeech && query.trim() && (
                <button
                  type="button"
                  onClick={() => speakText(query, inputLangCode)}
                  className="p-1 hover:bg-[#6B7C4F]/20 rounded-lg text-lg text-[#E8802F] cursor-pointer transition-all"
                  title="Ascolta pronuncia testo digitato"
                >
                  🔊
                </button>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCurrentResult(null);
                    setTranslationError(null);
                  }}
                  className="text-[#F2E8D5]/40 hover:text-[#F2E8D5] text-xs font-bold cursor-pointer px-1"
                  title="Cancella testo"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <textarea
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setCurrentResult(null);
                setTranslationError(null);
              }
            }}
            placeholder={`Scrivi o incolla una parola o frase in ${nativeName.toLowerCase()} o ${targetName.toLowerCase()}...`}
            rows={3}
            className="w-full bg-transparent text-[#F2E8D5] placeholder-[#F2E8D5]/40 font-medium text-sm sm:text-base outline-none resize-none leading-relaxed"
          />
        </div>

        {/* MIDDLE BAR: CONTROLS & MANUAL TRANSLATE BUTTON */}
        <div className="flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={handleSwapDirection}
            className="text-xs font-bold font-display text-[#859966] bg-[#1A1512] hover:bg-[#342D28] px-3 py-2 rounded-xl border border-[#6B7C4F]/30 cursor-pointer flex items-center gap-1 transition-all"
          >
            <span>Inverti</span>
            <span className="text-base">⇄</span>
          </button>

          <button
            type="button"
            onClick={() => handleSearchSubmit(query)}
            disabled={!query.trim() || isTranslating}
            className="btn-zucca px-6 py-2.5 text-xs sm:text-sm shrink-0 disabled:opacity-50 flex items-center gap-2"
          >
            {isTranslating ? 'Traduzione...' : 'Traduci ⚡'}
          </button>
        </div>

        {/* LOWER PANEL: OUTPUT DISPLAY */}
        <div className="bg-[#1A1512] rounded-2xl p-4 border-2 border-[#6B7C4F]/30 shadow-xs space-y-3 relative min-h-[110px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-[#859966] font-display">
            <span>A: {outputLangLabel}</span>
            <div className="flex items-center gap-2">
              {hasSpeech && currentResult?.traduzione_principale && (
                <button
                  type="button"
                  onClick={() => speakText(currentResult.traduzione_principale, outputLangCode)}
                  className="p-1 hover:bg-[#6B7C4F]/20 rounded-lg text-lg text-[#E8802F] cursor-pointer transition-all"
                  title="Ascolta pronuncia traduzione"
                >
                  🔊
                </button>
              )}

              {currentResult && (
                <button
                  type="button"
                  onClick={toggleMainStar}
                  className={`p-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    savedMainItem ? 'text-[#E8802F]' : 'text-[#F2E8D5]/40 hover:text-[#E8802F]'
                  } ${animateMainStar ? 'scale-125' : 'scale-100'}`}
                  title={savedMainItem ? 'Rimuovi dalla tana' : 'Salva in tana'}
                >
                  <span className="text-lg leading-none">{savedMainItem ? '★' : '☆'}</span>
                  <span className="text-[10px] font-bold font-display">
                    {savedMainItem ? 'In tana' : 'Salva'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Translation Result Content */}
          {isTranslating ? (
            <div className="flex items-center gap-3 py-2 animate-pulse">
              <Mascot pose="thinking" size={40} />
              <p className="text-xs sm:text-sm font-semibold text-[#F2E8D5] font-display">
                Il procione sta analizzando e traducendo...
              </p>
            </div>
          ) : translationError ? (
            <div className="flex flex-col sm:flex-row items-center gap-3 py-2 text-center sm:text-left">
              <Mascot pose="thinking" size={48} />
              <div className="space-y-1.5 flex-1">
                <p className="text-xs sm:text-sm font-bold text-[#F2E8D5] font-display">
                  Non sono riuscito a tradurre in questo momento.
                </p>
                <button
                  type="button"
                  onClick={() => handleSearchSubmit(query)}
                  className="px-3.5 py-1.5 bg-[#E8802F] hover:bg-[#E8802F]/90 text-[#1A1512] font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all inline-flex items-center gap-1.5 font-display"
                >
                  <span>🔄</span> Riprova
                </button>
              </div>
            </div>
          ) : currentResult ? (
            <div className="py-1">
              <h3 className="text-xl sm:text-2xl font-black font-display text-[#F2E8D5] leading-snug">
                {currentResult.traduzione_principale}
              </h3>
            </div>
          ) : (
            <p className="text-xs sm:text-sm font-medium text-[#F2E8D5]/40 italic py-2">
              La traduzione comparirà qui...
            </p>
          )}
        </div>
      </div>

      {/* DETAILS BELOW PANELS (Word Tokens, Alternatives, Deep Dive) */}
      {currentResult && !isTranslating && (
        <div className="space-y-4 pt-2 border-t border-[#6B7C4F]/20">
          {/* Original Searched Phrase with Clickable Tokens */}
          <div>
            <p className="text-xs font-bold text-[#859966] mb-1 font-display">
              Frase cercata <span className="text-[11px] font-normal text-[#F2E8D5]/60">(tocca ogni parola per approfondirla)</span>:
            </p>
            <div className="leading-relaxed py-1">{renderClickableTokens(searchedText)}</div>
          </div>

          {/* Alternative Translations */}
          {currentResult.alternative && currentResult.alternative.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#859966] mb-1.5 font-display">Alternative d'uso:</p>
              <div className="flex flex-wrap gap-2">
                {currentResult.alternative.map((alt, i) => (
                  <span
                    key={i}
                    className="bg-[#1A1512] text-[#F2E8D5] text-xs sm:text-sm font-medium px-3 py-1 rounded-full border border-[#6B7C4F]/30 shadow-xs flex items-center gap-1.5"
                  >
                    <span>{alt}</span>
                    {hasSpeech && (
                      <button
                        type="button"
                        onClick={() => speakText(alt, outputLangCode)}
                        className="text-[#F2E8D5]/50 hover:text-[#E8802F] text-xs cursor-pointer"
                        title="Ascolta alternativa"
                      >
                        🔊
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Deep Dive Action for Full Expression */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handlePhraseDeepDiveClick}
              className="inline-flex items-center gap-2 bg-[#1A1512] hover:bg-[#6B7C4F] hover:text-[#F2E8D5] text-[#859966] border-2 border-[#6B7C4F]/30 text-xs sm:text-sm font-bold font-display px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>💡</span>
              <span>Approfondisci questa espressione</span>
            </button>
          </div>
        </div>
      )}

      {/* Recent Search History */}
      {recentQueries.length > 0 && !currentResult && !isTranslating && (
        <div className="pt-1">
          <p className="text-xs font-bold text-[#859966] mb-2 font-display flex items-center gap-1.5">
            <span>🕒</span> Ricerche recenti nel traduttore:
          </p>
          <div className="flex flex-wrap gap-2">
            {recentQueries.map((q, idx) => {
              const isSavedInTana = vocabItems.some((i) => i.term.toLowerCase() === q.toLowerCase());
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(q);
                    handleSearchSubmit(q);
                  }}
                  className="bg-[#1A1512] hover:bg-[#342D28] text-[#F2E8D5] text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#6B7C4F]/30 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{q}</span>
                  {isSavedInTana && <span className="text-[#E8802F] text-xs">★</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Word Deep Dive Modal / Bottom Sheet */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="bg-[#2B2622] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-2 border-[#6B7C4F]/40 p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 text-[#F2E8D5]">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#6B7C4F]/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1A1512] rounded-full border-2 border-[#6B7C4F]/40 p-0.5 flex items-center justify-center overflow-hidden">
                  <Mascot pose="reading" size={44} />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-[#E8802F] uppercase tracking-wider font-display">
                    Approfondimento Parola
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black font-display text-[#F2E8D5]">{selectedWord}</h3>
                    {hasSpeech && (
                      <button
                        type="button"
                        onClick={() => speakText(selectedWord, 'en-US')}
                        className="text-lg text-[#E8802F] hover:scale-110 cursor-pointer transition-all"
                        title="Ascolta pronuncia parola"
                      >
                        🔊
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedWord(null)}
                className="text-[#F2E8D5]/50 hover:text-[#F2E8D5] text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Loading */}
            {isLoadingDeepDive ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <div className="w-6 h-6 border-3 border-[#E8802F] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-[#F2E8D5] font-display">
                  Caricamento definizione ed esempi...
                </span>
              </div>
            ) : deepDiveData ? (
              <div className="space-y-4">
                {/* Word Star Save Toggle Bar */}
                <div className="bg-[#1A1512] p-3.5 rounded-2xl border border-[#6B7C4F]/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#859966] uppercase font-display">
                      Definizione
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-[#F2E8D5]">
                      {deepDiveData.definizione}
                    </p>
                  </div>

                  {/* Word Star button */}
                  <button
                    onClick={toggleWordStar}
                    className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center shrink-0 ${
                      savedWordItem
                        ? 'bg-[#E8802F]/20 border-[#E8802F] text-[#E8802F]'
                        : 'bg-[#2B2622] border-[#6B7C4F]/30 text-[#F2E8D5]/40 hover:border-[#E8802F] hover:text-[#E8802F]'
                    } ${animateWordStar ? 'scale-125' : 'scale-100'}`}
                    title={savedWordItem ? 'Rimuovi dalla tana' : 'Salva in tana'}
                  >
                    <span className="text-2xl leading-none">{savedWordItem ? '★' : '☆'}</span>
                    <span className="text-[10px] font-bold font-display mt-0.5">
                      {savedWordItem ? 'In tana' : 'Salva'}
                    </span>
                  </button>
                </div>

                {/* Usage Note */}
                {deepDiveData.nota_uso && (
                  <div className="bg-[#1A1512] p-3.5 rounded-2xl border border-[#C99A3D]/40 space-y-1">
                    <span className="text-xs font-black text-[#C99A3D] uppercase font-display">
                      Nota d'uso / Registro
                    </span>
                    <p className="text-xs sm:text-sm text-[#F2E8D5]/85 font-medium leading-relaxed">
                      {deepDiveData.nota_uso}
                    </p>
                  </div>
                )}

                {/* Example Sentences */}
                {deepDiveData.esempi && deepDiveData.esempi.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#859966] uppercase font-display">
                      Frasi di esempio
                    </span>
                    <div className="space-y-2">
                      {deepDiveData.esempi.map((ex, idx) => (
                        <div key={idx} className="bg-[#1A1512] p-3 rounded-xl border border-[#6B7C4F]/30 text-xs sm:text-sm space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-[#F2E8D5]">"{ex.en}"</p>
                            {hasSpeech && (
                              <button
                                type="button"
                                onClick={() => speakText(ex.en, 'en-US')}
                                className="text-xs text-[#E8802F] cursor-pointer hover:scale-110 transition-all shrink-0"
                                title="Ascolta frase"
                              >
                                🔊
                              </button>
                            )}
                          </div>
                          <p className="text-[#F2E8D5]/60 italic">"{ex.it}"</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-[#F2E8D5]/40 italic pt-1">
                      * Le frasi di esempio sono generate per mostrare l'uso nel contesto.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Close Button */}
            <button
              onClick={() => setSelectedWord(null)}
              className="w-full btn-zucca py-3 text-sm font-bold mt-2"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Phrase Deep Dive Modal / Bottom Sheet */}
      {selectedPhrase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-[#2B2622] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-2 border-[#6B7C4F]/40 p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 text-[#F2E8D5]">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#6B7C4F]/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1A1512] rounded-full border-2 border-[#6B7C4F]/40 p-0.5 flex items-center justify-center overflow-hidden">
                  <Mascot pose="reading" size={44} />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-[#E8802F] uppercase tracking-wider font-display">
                    Approfondimento Espressione
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-black font-display text-[#F2E8D5]">{selectedPhrase}</h3>
                    {hasSpeech && (
                      <button
                        type="button"
                        onClick={() => speakText(selectedPhrase, inputLangCode)}
                        className="text-lg text-[#E8802F] hover:scale-110 cursor-pointer transition-all"
                        title="Ascolta frase"
                      >
                        🔊
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPhrase(null)}
                className="text-[#F2E8D5]/50 hover:text-[#F2E8D5] text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Loading */}
            {isLoadingPhraseDeepDive ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <div className="w-6 h-6 border-3 border-[#E8802F] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-[#F2E8D5] font-display">
                  Analisi dell'espressione e contesto reale...
                </span>
              </div>
            ) : phraseDeepDiveData ? (
              <div className="space-y-4">
                {/* Phrase Badge & Main Star Save Toggle Bar */}
                <div className="bg-[#1A1512] p-3.5 rounded-2xl border border-[#6B7C4F]/30 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className={`inline-block text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full font-display ${
                      phraseDeepDiveData.tipo === 'idiomatico'
                        ? 'bg-[#E8802F]/20 text-[#E8802F]'
                        : 'bg-[#6B7C4F]/20 text-[#859966]'
                    }`}>
                      {phraseDeepDiveData.tipo === 'idiomatico' ? '✨ Espressione Idiomatica / Modo di dire' : '📖 Frase Letterale'}
                    </span>
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base font-bold text-[#F2E8D5]">
                        {currentResult?.traduzione_principale || selectedPhrase}
                      </p>
                      {hasSpeech && currentResult?.traduzione_principale && (
                        <button
                          type="button"
                          onClick={() => speakText(currentResult.traduzione_principale, outputLangCode)}
                          className="text-sm text-[#E8802F] cursor-pointer hover:scale-110 transition-all"
                          title="Ascolta traduzione"
                        >
                          🔊
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Toggle Main Star Button */}
                  <button
                    onClick={toggleMainStar}
                    className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center shrink-0 ${
                      savedMainItem
                        ? 'bg-[#E8802F]/20 border-[#E8802F] text-[#E8802F]'
                        : 'bg-[#2B2622] border-[#6B7C4F]/30 text-[#F2E8D5]/40 hover:border-[#E8802F] hover:text-[#E8802F]'
                    } ${animateMainStar ? 'scale-125' : 'scale-100'}`}
                    title={savedMainItem ? 'Rimuovi dalla tana' : 'Salva in tana'}
                  >
                    <span className="text-2xl leading-none">{savedMainItem ? '★' : '☆'}</span>
                    <span className="text-[10px] font-bold font-display mt-0.5">
                      {savedMainItem ? 'In tana' : 'Salva'}
                    </span>
                  </button>
                </div>

                {/* Usage Note / Quando si usa */}
                {phraseDeepDiveData.quando_si_usa && (
                  <div className="bg-[#1A1512] p-3.5 rounded-2xl border border-[#C99A3D]/40 space-y-1">
                    <span className="text-xs font-black text-[#C99A3D] uppercase font-display">
                      Quando e come si usa (Contesto e Registro)
                    </span>
                    <p className="text-xs sm:text-sm text-[#F2E8D5]/85 font-medium leading-relaxed">
                      {phraseDeepDiveData.quando_si_usa}
                    </p>
                  </div>
                )}

                {/* Example Sentences */}
                {phraseDeepDiveData.esempi && phraseDeepDiveData.esempi.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#859966] uppercase font-display">
                      Frasi di esempio reali
                    </span>
                    <div className="space-y-2">
                      {phraseDeepDiveData.esempi.map((ex, idx) => (
                        <div key={idx} className="bg-[#1A1512] p-3 rounded-xl border border-[#6B7C4F]/30 text-xs sm:text-sm space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-[#F2E8D5]">"{ex.en}"</p>
                            {hasSpeech && (
                              <button
                                type="button"
                                onClick={() => speakText(ex.en, 'en-US')}
                                className="text-xs text-[#E8802F] cursor-pointer hover:scale-110 transition-all shrink-0"
                                title="Ascolta frase"
                              >
                                🔊
                              </button>
                            )}
                          </div>
                          <p className="text-[#F2E8D5]/60 italic">"{ex.it}"</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-[#F2E8D5]/40 italic pt-1">
                      * Le frasi di esempio mostrano l'uso reale dell'espressione in contesto.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Close Button */}
            <button
              onClick={() => setSelectedPhrase(null)}
              className="w-full btn-zucca py-3 text-sm font-bold mt-2"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

