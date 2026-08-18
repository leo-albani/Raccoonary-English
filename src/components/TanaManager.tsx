import React, { useState } from 'react';
import { VocabItem, ExerciseError, VocabOrigin, ExerciseErrorType } from '../types';
import { Mascot } from '../mascot/Mascot';

interface TanaManagerProps {
  vocabItems: VocabItem[];
  exerciseErrors?: ExerciseError[];
  onDeleteItem: (itemId: string) => void;
  onDeleteExerciseError?: (errorId: string) => void;
  onClose?: () => void;
}

export const TanaManager: React.FC<TanaManagerProps> = ({
  vocabItems,
  exerciseErrors = [],
  onDeleteItem,
  onDeleteExerciseError,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'vocab' | 'errors'>('vocab');
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>('all');
  const [itemToDelete, setItemToDelete] = useState<VocabItem | null>(null);
  const [errorToDelete, setErrorToDelete] = useState<ExerciseError | null>(null);

  const getOriginLabel = (origin: VocabOrigin) => {
    switch (origin) {
      case 'import':
        return 'Importato da file';
      case 'translator_search':
        return 'Traduttore (ricerca)';
      case 'translator_lookup':
        return 'Traduttore (parola)';
      case 'reading_word':
        return 'Lettura (parola)';
      case 'grammar_error':
        return 'Grammatica';
      case 'reading_error':
        return 'Lettura';
      case 'exercise_error':
        return 'Esercizio';
      default:
        return origin;
    }
  };

  const getOriginColor = (origin: VocabOrigin) => {
    switch (origin) {
      case 'import':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'translator_search':
      case 'translator_lookup':
        return 'bg-[#E8802F]/20 text-[#E8802F] border-[#E8802F]/40';
      case 'reading_word':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'grammar_error':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'reading_error':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-neutral-700/50 text-neutral-300 border-neutral-600';
    }
  };

  const getErrorTypeLabel = (type: ExerciseErrorType) => {
    switch (type) {
      case 'grammatica':
        return 'Grammatica';
      case 'test_livello':
        return 'Test di Livello';
      case 'lettura':
        return 'Lettura';
      default:
        return type;
    }
  };

  const getErrorTypeColor = (type: ExerciseErrorType) => {
    switch (type) {
      case 'grammatica':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'test_livello':
        return 'bg-[#E8802F]/20 text-[#E8802F] border-[#E8802F]/40';
      case 'lettura':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-neutral-700/50 text-neutral-300 border-neutral-600';
    }
  };

  const filteredVocabItems = vocabItems.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrigin = originFilter === 'all' || item.origin === originFilter;
    return matchesSearch && matchesOrigin;
  });

  const filteredExerciseErrors = exerciseErrors.filter((item) => {
    const matchesSearch =
      item.domanda.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rispostaCorretta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.argomentoRiferimento.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = errorTypeFilter === 'all' || item.tipo === errorTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleDeleteVocabClick = (item: VocabItem) => {
    const hasProgress = item.box > 1 || (item.lastReviewedAt !== null && item.lastReviewedAt > 0);
    if (!hasProgress) {
      onDeleteItem(item.id);
    } else {
      setItemToDelete(item);
    }
  };

  const handleDeleteErrorClick = (error: ExerciseError) => {
    const hasProgress = error.box > 1 || (error.lastReviewedAt !== null && error.lastReviewedAt > 0);
    if (!hasProgress && onDeleteExerciseError) {
      onDeleteExerciseError(error.id);
    } else {
      setErrorToDelete(error);
    }
  };

  const confirmDeleteVocab = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const confirmDeleteError = () => {
    if (errorToDelete && onDeleteExerciseError) {
      onDeleteExerciseError(errorToDelete.id);
      setErrorToDelete(null);
    }
  };

  return (
    <div className="bg-[#2B2622] rounded-3xl p-5 sm:p-6 border-2 border-[#6B7C4F]/30 shadow-xl space-y-4 max-w-4xl mx-auto text-[#F2E8D5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#6B7C4F]/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1A1512] flex items-center justify-center border border-[#6B7C4F]/40 overflow-hidden shrink-0">
            <Mascot pose="reading" size={38} />
          </div>
          <div>
            <span className="badge-leaf text-[10px]">Tana di Raccoonary</span>
            <h2 className="text-xl sm:text-2xl font-black font-display text-[#F2E8D5]">
              La mia tana
            </h2>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-[#F2E8D5]/60 hover:text-[#F2E8D5] font-bold text-lg cursor-pointer"
            title="Chiudi gestore tana"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Switch Tabs: Vocaboli vs Errori di Esercizio */}
      <div className="flex bg-[#1A1512] p-1 rounded-2xl border border-[#6B7C4F]/30 gap-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab('vocab');
            setSearchTerm('');
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-display text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'vocab'
              ? 'bg-[#6B7C4F] text-[#F2E8D5] shadow-xs'
              : 'text-[#F2E8D5]/65 hover:text-[#F2E8D5]'
          }`}
        >
          <span>📖 Vocabolario</span>
          <span className="px-2 py-0.5 rounded-full bg-black/25 text-[11px] font-bold">
            {vocabItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('errors');
            setSearchTerm('');
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-display text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'errors'
              ? 'bg-[#E8802F] text-white shadow-xs'
              : 'text-[#F2E8D5]/65 hover:text-[#F2E8D5]'
          }`}
        >
          <span>🎯 Errori Esercizio</span>
          <span className="px-2 py-0.5 rounded-full bg-black/25 text-[11px] font-bold">
            {exerciseErrors.length}
          </span>
        </button>
      </div>

      {/* Search and Category Filters */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'vocab'
                ? 'Cerca parola o traduzione...'
                : 'Cerca per domanda, argomento o risposta...'
            }
            className="w-full p-3.5 pl-10 rounded-2xl bg-[#1A1512] border-2 border-[#6B7C4F]/30 text-sm font-medium text-[#F2E8D5] placeholder-[#F2E8D5]/40 focus:outline-none focus:border-[#E8802F]"
          />
          <span className="absolute left-3.5 top-3.5 text-[#F2E8D5]/40 text-sm">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-3 text-[#F2E8D5]/40 hover:text-[#F2E8D5] font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        {activeTab === 'vocab' ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'Tutti' },
              { id: 'import', label: 'Importati' },
              { id: 'translator_search', label: 'Traduttore (ricerca)' },
              { id: 'translator_lookup', label: 'Traduttore (parola)' },
              { id: 'reading_word', label: 'Lettura (parola)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setOriginFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap cursor-pointer ${
                  originFilter === f.id
                    ? 'bg-[#6B7C4F] text-[#F2E8D5] shadow-xs'
                    : 'bg-[#1A1512] text-[#F2E8D5]/70 hover:text-[#F2E8D5] hover:bg-[#342D28]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'Tutti i tipi' },
              { id: 'grammatica', label: 'Grammatica' },
              { id: 'test_livello', label: 'Test di Livello' },
              { id: 'lettura', label: 'Lettura' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setErrorTypeFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap cursor-pointer ${
                  errorTypeFilter === f.id
                    ? 'bg-[#E8802F] text-white shadow-xs'
                    : 'bg-[#1A1512] text-[#F2E8D5]/70 hover:text-[#F2E8D5] hover:bg-[#342D28]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List Display */}
      {activeTab === 'vocab' ? (
        <div className="divide-y divide-[#6B7C4F]/15 max-h-[55vh] overflow-y-auto pr-1">
          {filteredVocabItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Mascot pose="thinking" size={70} />
              <p className="text-sm font-semibold text-[#F2E8D5]/70 font-display">
                Nessun vocabolo trovato con questi filtri.
              </p>
            </div>
          ) : (
            filteredVocabItems.map((item) => (
              <div
                key={item.id}
                className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[#1A1512]/60 rounded-xl transition-all"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#F2E8D5] font-display text-base">
                      {item.term}
                    </span>
                    <span className="text-[#859966] text-sm font-bold">
                      ➔ {item.translation}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="bg-[#C99A3D]/20 text-[#C99A3D] font-black px-2 py-0.5 rounded-md text-[11px] border border-[#C99A3D]/30">
                      Box {item.box}
                    </span>
                    <span
                      className={`border px-2 py-0.5 rounded-md text-[11px] font-semibold ${getOriginColor(
                        item.origin
                      )}`}
                    >
                      {getOriginLabel(item.origin)}
                    </span>
                    {item.exampleSource && (
                      <span className="text-[#F2E8D5]/50 truncate max-w-xs text-[11px] italic">
                        "{item.exampleSource}"
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteVocabClick(item)}
                  className="p-2.5 text-[#F2E8D5]/40 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-all cursor-pointer shrink-0"
                  title="Elimina parola dalla tana"
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#6B7C4F]/15 max-h-[55vh] overflow-y-auto pr-1">
          {filteredExerciseErrors.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Mascot pose="happy" size={70} />
              <p className="text-sm font-semibold text-[#F2E8D5]/70 font-display">
                Nessun errore di esercizio registrato! Ottimo lavoro!
              </p>
            </div>
          ) : (
            filteredExerciseErrors.map((err) => (
              <div
                key={err.id}
                className="py-3.5 px-3 flex items-start justify-between gap-3 hover:bg-[#1A1512]/60 rounded-xl transition-all"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`border px-2 py-0.5 rounded-md text-[11px] font-black uppercase font-display ${getErrorTypeColor(
                        err.tipo
                      )}`}
                    >
                      {getErrorTypeLabel(err.tipo)}
                    </span>
                    <span className="text-xs font-bold text-[#859966] bg-[#6B7C4F]/15 px-2 py-0.5 rounded-md">
                      {err.argomentoRiferimento}
                    </span>
                    <span className="bg-[#C99A3D]/20 text-[#C99A3D] font-black px-2 py-0.5 rounded-md text-[11px] border border-[#C99A3D]/30">
                      Box {err.box}
                    </span>
                  </div>

                  <p className="font-bold text-[#F2E8D5] font-display text-sm leading-relaxed">
                    {err.domanda}
                  </p>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#859966] font-bold">Risposta corretta:</span>
                    <span className="text-[#E8802F] font-black font-display bg-[#E8802F]/10 px-2 py-0.5 rounded border border-[#E8802F]/20">
                      {err.rispostaCorretta}
                    </span>
                  </div>

                  {err.spiegazione && (
                    <p className="text-[11px] text-[#F2E8D5]/70 italic bg-[#1A1512] p-2 rounded-lg border border-[#6B7C4F]/20">
                      💡 {err.spiegazione}
                    </p>
                  )}
                </div>

                {onDeleteExerciseError && (
                  <button
                    onClick={() => handleDeleteErrorClick(err)}
                    className="p-2.5 text-[#F2E8D5]/40 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-all cursor-pointer shrink-0 mt-1"
                    title="Elimina errore"
                  >
                    🗑
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal for Vocab Items */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#2B2622] rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-red-500/60 shadow-2xl animate-in fade-in zoom-in-95 text-[#F2E8D5]">
            <Mascot pose="thinking" size={90} />
            <h3 className="text-lg font-bold font-display text-[#F2E8D5]">
              Rimuovere "{itemToDelete.term}"?
            </h3>
            <p className="text-xs text-[#F2E8D5]/80 leading-relaxed">
              Questa parola è attualmente nel <strong className="text-[#E8802F]">Box {itemToDelete.box}</strong> ed ha già uno storico di ripasso. Eliminandola, perderai i progressi fatti finora su questo termine.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-[#1A1512] hover:bg-[#342D28] text-[#F2E8D5] font-bold text-xs cursor-pointer border border-[#6B7C4F]/30"
              >
                Annulla
              </button>
              <button
                onClick={confirmDeleteVocab}
                className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
              >
                Sì, elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Exercise Error Items */}
      {errorToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#2B2622] rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-red-500/60 shadow-2xl animate-in fade-in zoom-in-95 text-[#F2E8D5]">
            <Mascot pose="thinking" size={90} />
            <h3 className="text-lg font-bold font-display text-[#F2E8D5]">
              Rimuovere questo esercizio?
            </h3>
            <p className="text-xs text-[#F2E8D5]/80 leading-relaxed">
              Questo esercizio è attualmente nel <strong className="text-[#E8802F]">Box {errorToDelete.box}</strong>. Eliminandolo, non ti verrà più riproposto nel ripasso Leitner.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setErrorToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-[#1A1512] hover:bg-[#342D28] text-[#F2E8D5] font-bold text-xs cursor-pointer border border-[#6B7C4F]/30"
              >
                Annulla
              </button>
              <button
                onClick={confirmDeleteError}
                className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
              >
                Sì, elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
