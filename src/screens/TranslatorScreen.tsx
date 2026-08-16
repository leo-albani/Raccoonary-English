import React from 'react';
import { Translator } from '../components/Translator';
import { UserProfile, VocabItem } from '../types';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../data/languages';
import { Mascot } from '../mascot/Mascot';

interface TranslatorScreenProps {
  user: UserProfile;
  vocabItems: VocabItem[];
  onAddVocabItem: (item: VocabItem) => void;
  onDeleteItem: (itemId: string) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const TranslatorScreen: React.FC<TranslatorScreenProps> = ({
  user,
  vocabItems,
  onAddVocabItem,
  onDeleteItem,
  t,
}) => {
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* Screen Header */}
      <div className="flex items-center justify-between gap-4 bg-white/70 backdrop-blur-xs p-4 sm:p-5 rounded-3xl border border-[#6B7C4F]/20 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge-leaf">Dizionario & Traduzione</span>
            <span className="text-xs font-bold text-[#6B7C4F] font-display">
              {nativeLangObj.flag} ↔ {activeLang.flag} {activeLang.name}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22]">
            Traduttore 🔤
          </h1>
          <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium">
            Traduci parole o frasi, tocca ogni termine per scoprirne le sfumature e salva le parole nella tua tana.
          </p>
        </div>

        <div className="hidden sm:block shrink-0">
          <Mascot pose="thinking" size={70} activeOutfit={user.activeOutfit} />
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
    </div>
  );
};
