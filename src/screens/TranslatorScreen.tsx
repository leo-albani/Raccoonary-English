import React, { useState } from 'react';
import { Translator } from '../components/Translator';
import { TanaManager } from '../components/TanaManager';
import { UserProfile, VocabItem, ExerciseError } from '../types';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../data/languages';
import { Mascot } from '../mascot/Mascot';
import { playSound } from '../services/sound';

interface TranslatorScreenProps {
  user: UserProfile;
  vocabItems: VocabItem[];
  exerciseErrors?: ExerciseError[];
  onAddVocabItem: (item: VocabItem) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteExerciseError?: (errorId: string) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const TranslatorScreen: React.FC<TranslatorScreenProps> = ({
  user,
  vocabItems,
  exerciseErrors = [],
  onAddVocabItem,
  onDeleteItem,
  onDeleteExerciseError,
  t,
}) => {
  const [showTanaManagerModal, setShowTanaManagerModal] = useState(false);

  const activeLang = TARGET_LANGUAGES.find((l) => l.code === (user.activeProfileId || 'en')) || {
    code: 'en',
    name: 'Inglese',
    flag: '🇬🇧',
  };

  const nativeLangObj = NATIVE_LANGUAGES.find((l) => l.code === (user.nativeLanguage || 'it')) || {
    code: 'it',
    name: 'Italiano',
    flag: '🇮🇹',
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-20 pt-16 sm:pt-14">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2B2622] p-5 sm:p-6 rounded-3xl border-2 border-[#6B7C4F]/30 shadow-xl text-[#F2E8D5]">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-leaf">Dizionario & Traduzione</span>
            <span className="text-xs font-extrabold text-[#859966] font-display">
              {nativeLangObj.flag} ↔ {activeLang.flag} {activeLang.name}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-[#F2E8D5]">
            La mia tana & Traduttore 📚
          </h1>
          <p className="text-xs sm:text-sm text-[#F2E8D5]/75 font-medium leading-relaxed max-w-xl">
            Cerca e traduci vocaboli o frasi, tocca ogni termine per scoprirne le sfumature e consulta tutte le parole salvate nella tua tana.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                playSound('acorn');
                setShowTanaManagerModal(true);
              }}
              id="btn-translator-open-tana"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#1A1512] hover:bg-[#342D28] border-2 border-[#6B7C4F]/40 hover:border-[#E8802F] text-[#F2E8D5] text-xs sm:text-sm font-black font-display cursor-pointer transition-all shadow-md active:scale-95 group"
            >
              <span className="text-base group-hover:scale-110 transition-transform">📖</span>
              <span>Gestisci le parole in tana ({vocabItems.length})</span>
              <span className="text-[#859966] group-hover:text-[#E8802F] transition-colors">→</span>
            </button>
          </div>
        </div>

        <div className="hidden sm:block shrink-0">
          <Mascot pose="thinking" size={85} activeOutfit={user.activeOutfit} />
        </div>
      </div>

      {/* Embedded Full Translator Component */}
      <div id="tour-target-translator">
        <Translator
          vocabItems={vocabItems}
          onAddVocabItem={onAddVocabItem}
          onDeleteItem={onDeleteItem}
          nativeLang={user.nativeLanguage || 'it'}
          targetLang={user.activeProfileId || 'en'}
          nativeName={nativeLangObj.name}
          targetName={activeLang.name}
          t={t}
        />
      </div>

      {/* Tana Manager Modal */}
      {showTanaManagerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <TanaManager
              vocabItems={vocabItems}
              exerciseErrors={exerciseErrors}
              onDeleteItem={(id) => {
                if (onDeleteItem) onDeleteItem(id);
              }}
              onDeleteExerciseError={(id) => {
                if (onDeleteExerciseError) onDeleteExerciseError(id);
              }}
              onClose={() => setShowTanaManagerModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
