import React, { useState } from 'react';
import { VocabItem, VocabOrigin } from '../types';
import { Mascot } from '../mascot/Mascot';

interface TanaManagerProps {
  vocabItems: VocabItem[];
  onDeleteItem: (itemId: string) => void;
  onClose?: () => void;
}

export const TanaManager: React.FC<TanaManagerProps> = ({
  vocabItems,
  onDeleteItem,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [itemToDelete, setItemToDelete] = useState<VocabItem | null>(null);

  const getOriginLabel = (origin: VocabOrigin) => {
    switch (origin) {
      case 'import':
        return 'Importato da file';
      case 'translator_search':
        return 'Traduttore (ricerca)';
      case 'translator_lookup':
        return 'Traduttore (parola)';
      case 'grammar_error':
        return 'Errore grammatica';
      case 'reading_error':
        return 'Errore lettura';
      case 'exercise_error':
        return 'Esercizio';
      default:
        return origin;
    }
  };

  const getOriginColor = (origin: VocabOrigin) => {
    switch (origin) {
      case 'import':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'translator_search':
      case 'translator_lookup':
        return 'bg-[#E8802F]/15 text-[#E8802F] border-[#E8802F]/30';
      case 'grammar_error':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'reading_error':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredItems = vocabItems.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrigin = originFilter === 'all' || item.origin === originFilter;
    return matchesSearch && matchesOrigin;
  });

  const handleDeleteClick = (item: VocabItem) => {
    // Direct deletion if item has no review progress yet (box 1 and never reviewed)
    const hasProgress = item.box > 1 || (item.lastReviewedAt !== null && item.lastReviewedAt > 0);
    if (!hasProgress) {
      onDeleteItem(item.id);
    } else {
      setItemToDelete(item);
    }
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border-2 border-[#6B7C4F]/30 shadow-sm space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3A2B22]/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F2E8D5] flex items-center justify-center border border-[#6B7C4F]/30 overflow-hidden">
            <Mascot pose="reading" size={38} />
          </div>
          <div>
            <span className="badge-leaf text-[10px]">Tana di Raccoonary</span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[#3A2B22]">
              La mia tana ({vocabItems.length} parole)
            </h2>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-[#3A2B22] font-bold text-lg cursor-pointer"
            title="Chiudi gestore tana"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca parola o traduzione..."
            className="w-full p-3.5 pl-10 rounded-2xl bg-[#FAF5EB] border-2 border-[#6B7C4F]/25 text-sm font-medium focus:outline-none focus:border-[#E8802F]"
          />
          <span className="absolute left-3.5 top-3.5 text-gray-400 text-sm">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Origin Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'Tutti' },
            { id: 'import', label: 'Importati' },
            { id: 'translator_search', label: 'Traduttore (ricerca)' },
            { id: 'translator_lookup', label: 'Traduttore (parola)' },
            { id: 'grammar_error', label: 'Grammatica' },
            { id: 'reading_error', label: 'Lettura' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setOriginFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all whitespace-nowrap cursor-pointer ${
                originFilter === f.id
                  ? 'bg-[#6B7C4F] text-white shadow-2xs'
                  : 'bg-[#F2E8D5]/60 text-[#3A2B22]/70 hover:text-[#3A2B22] hover:bg-[#F2E8D5]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary Item List */}
      <div className="divide-y divide-[#6B7C4F]/10 max-h-[60vh] overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Mascot pose="thinking" size={70} />
            <p className="text-sm font-semibold text-[#3A2B22]/70 font-display">
              Nessuna parola trovata con questi filtri.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="py-3 px-1 flex items-center justify-between gap-3 hover:bg-[#FAF5EB]/60 rounded-xl transition-all"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#3A2B22] font-display text-base">
                    {item.term}
                  </span>
                  <span className="text-[#6B7C4F] text-sm font-medium">
                    ➔ {item.translation}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="bg-[#C99A3D]/20 text-[#3A2B22] font-bold px-2 py-0.5 rounded-md text-[11px]">
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
                    <span className="text-gray-400 truncate max-w-xs text-[11px] italic">
                      "{item.exampleSource}"
                    </span>
                  )}
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDeleteClick(item)}
                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer shrink-0"
                title="Elimina parola dalla tana"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal for Items with SRS Progress */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-red-300 shadow-2xl animate-in fade-in zoom-in-95">
            <Mascot pose="thinking" size={90} />
            <h3 className="text-lg font-bold font-display text-[#3A2B22]">
              Rimuovere "{itemToDelete.term}"?
            </h3>
            <p className="text-xs text-[#3A2B22]/80 leading-relaxed">
              Questa parola è attualmente nel <strong className="text-[#E8802F]">Box {itemToDelete.box}</strong> ed ha già uno storico di ripasso. Eliminandola, perderai i progressi fatti finora su questo termine.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-[#3A2B22] font-bold text-xs cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={confirmDelete}
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
