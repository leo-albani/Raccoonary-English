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
      <div className="flex items-center justify-between gap-4 bg-[#2B2622] p-5 sm:p-6 rounded-3xl border-2 border-[#6B7C4F]/30 shadow-xl text-[#F2E8D5]">
        <div className="space-y-1.5">
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
        </div>

        <div className="hidden sm:block shrink-0">
          <Mascot pose="thinking" size={75} activeOutfit={user.activeOutfit} />
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
