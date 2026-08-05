import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile, VocabItem, SharedLanguagePairContent } from '../types';
import { GRAMMAR_SYLLABUS } from '../data/grammarSyllabus';
import { Translator } from '../components/Translator';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../data/languages';
import { NavTab } from '../components/Navigation';

interface HomeProps {
  user: UserProfile;
  vocabItems: VocabItem[];
  userProfiles?: string[];
  sharedContent?: SharedLanguagePairContent | null;
  streakFreezeActivated?: boolean;
  onCloseFreezeBanner?: () => void;
  onSwitchProfile?: (targetLanguage: string) => void;
  onAddNewLanguage?: (targetLanguage: string) => void;
  onStartReview: () => void;
  onNavigate: (tab: NavTab) => void;
  onSelectGrammarTopic: (topicId: string) => void;
  onAddVocabItem: (item: VocabItem) => void;
  onDeleteItem: (itemId: string) => void;
  onOpenLevelTest: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Home: React.FC<HomeProps> = ({
  user,
  vocabItems,
  userProfiles = ['en'],
  sharedContent,
  streakFreezeActivated,
  onCloseFreezeBanner,
  onSwitchProfile,
  onAddNewLanguage,
  onStartReview,
  onNavigate,
  onSelectGrammarTopic,
  onAddVocabItem,
  onDeleteItem,
  onOpenLevelTest,
  t,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const activeLang = TARGET_LANGUAGES.find((l) => l.code === (user.activeProfileId || 'en')) || {
    code: 'en',
    name: 'Inglese',
    flag: '🇬🇧',
  };
  const availableLanguages = TARGET_LANGUAGES.filter((l) => !userProfiles.includes(l.code));

  const now = Date.now();
  const dueItems = vocabItems.filter((i) => i.nextReviewAt <= now);
  const totalCount = vocabItems.length;

  // Level Test calculation for card
  let levelTestCardSub = `Fai il test di 35 domande per scoprire il tuo livello di ${activeLang.name}`;
  if (user.currentLevel) {
    if (user.lastTestDate) {
      const diffDays = Math.floor((now - user.lastTestDate) / (1000 * 60 * 60 * 24));
      const daysLabel = diffDays === 0 ? 'oggi' : diffDays === 1 ? '1 giorno fa' : `${diffDays} giorni fa`;
      levelTestCardSub = `Ultimo test effettuato ${daysLabel}`;
    } else {
      levelTestCardSub = 'Test completato recentemente';
    }
  }

  // Contextual greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Buondì';
  if (hour >= 18 || hour < 5) timeGreeting = 'Buonasera';
  else if (hour >= 12) timeGreeting = 'Buon pomeriggio';

  const raccoonGreeting =
    dueItems.length > 0
      ? `Ci sono ${dueItems.length} parole pronte per il ripasso.`
      : totalCount === 0
      ? 'La tana è vuota. Puoi aggiungere parole nuove o fare un esercizio.'
      : 'Tutto in ordine in tana per oggi.';

  return (
    <div className="pb-28 pt-4 px-4 sm:px-6 max-w-5xl mx-auto space-y-6">
      {/* Streak Freeze Banner Notification */}
      {streakFreezeActivated && (
        <div className="bg-[#EEF6FF] border-2 border-[#3B82F6] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center text-xl shrink-0">
              🛡️
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1E293B]">Salvagente attivato!</h4>
              <p className="text-xs text-[#1E293B]/80 font-medium">
                La tua serie è salva per un pelo! Un salvagente è stato consumato automaticamente.
              </p>
            </div>
          </div>
          {onCloseFreezeBanner && (
            <button
              onClick={onCloseFreezeBanner}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white text-[#2563EB] border border-[#3B82F6]/30 hover:bg-blue-50 cursor-pointer"
            >
              Capito!
            </button>
          )}
        </div>
      )}

      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-[#6B7C4F]/20 shadow-xs relative">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 cursor-pointer" onClick={() => onNavigate('wardrobe')} title="Apri il Guardaroba">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#6B7C4F]/10 rounded-full border-2 border-[#3A2B22] flex items-center justify-center overflow-hidden shadow-xs hover:scale-105 transition-transform">
              <Mascot pose={dueItems.length > 0 ? 'greeting' : 'sleeping'} activeOutfit={user.activeOutfit} size={75} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B7C4F] font-display">
                {timeGreeting}, Esploratore
              </span>

              {/* Language Switcher Pill */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-[#6B7C4F]/30 hover:border-[#6B7C4F] shadow-xs text-[#3A2B22] font-bold text-xs cursor-pointer transition-all"
                  title="Cambia o aggiungi lingua"
                >
                  <span>{activeLang.flag}</span>
                  <span>{activeLang.name}</span>
                  <span className="text-[#6B7C4F] text-[10px]">▾</span>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
                    <div className="absolute top-full left-0 mt-2 w-60 bg-white rounded-2xl border-2 border-[#6B7C4F]/30 shadow-xl p-2 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        I tuoi profili lingua
                      </div>
                      {userProfiles.map((code) => {
                        const lang = TARGET_LANGUAGES.find((l) => l.code === code) || {
                          code,
                          name: code,
                          flag: '🌐',
                        };
                        const isActive = code === (user.activeProfileId || 'en');
                        return (
                          <button
                            key={code}
                            onClick={() => {
                              setShowProfileMenu(false);
                              if (!isActive && onSwitchProfile) onSwitchProfile(code);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between font-bold text-xs transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#6B7C4F]/15 text-[#3A2B22] border border-[#6B7C4F]/40'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-base">{lang.flag}</span>
                              <span>{lang.name}</span>
                            </span>
                            {isActive && <span className="text-[#6B7C4F] font-black">✓</span>}
                          </button>
                        );
                      })}

                      {availableLanguages.length > 0 && (
                        <div className="pt-1 mt-1 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              setShowAddModal(true);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 font-bold text-xs text-[#E8802F] hover:bg-[#E8802F]/10 transition-all cursor-pointer border border-dashed border-[#E8802F]/40"
                          >
                            <span className="text-sm">➕</span>
                            <span>Aggiungi lingua</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22] leading-tight mt-0.5">
              La tua tana di {activeLang.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium mt-0.5">
              {raccoonGreeting}
            </p>
          </div>
        </div>

        {/* Header Stats Badges */}
        <div id="tour-target-streak" className="flex gap-3 justify-between md:justify-end">
          <button
            onClick={() => onNavigate('wardrobe')}
            className="bg-white hover:bg-amber-50/50 rounded-2xl px-4 py-2.5 flex items-center gap-3 border-b-4 border-gray-200 hover:border-[#6B7C4F]/30 shadow-xs flex-1 md:flex-none cursor-pointer transition-all text-left"
            title="Gestisci Salvagente e Guardaroba"
          >
            <span className="text-2xl">🌙</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Streak</p>
              <p className="text-base font-bold font-display text-[#3A2B22]">
                {user.streakCount} notti {user.streakFreezes ? `(🛡️${user.streakFreezes})` : ''}
              </p>
            </div>
          </button>
          <button
            onClick={() => onNavigate('wardrobe')}
            className="bg-white hover:bg-amber-50/50 rounded-2xl px-4 py-2.5 flex items-center gap-3 border-b-4 border-gray-200 hover:border-[#E8802F]/30 shadow-xs flex-1 md:flex-none cursor-pointer transition-all text-left"
            title="Apri il Guardaroba"
          >
            <span className="text-2xl">🌰</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Ghiande</p>
              <p className="text-base font-bold font-display text-[#E8802F]">{user.totalAcorns}</p>
            </div>
          </button>
        </div>
      </header>

      {/* Fixed Search / Translator Bar at Top of Home */}
      <div id="tour-target-translator">
        <Translator
          vocabItems={vocabItems}
          onAddVocabItem={onAddVocabItem}
          onDeleteItem={onDeleteItem}
          nativeLang={user.nativeLanguage || 'it'}
          targetLang={user.activeProfileId || 'en'}
          nativeName={NATIVE_LANGUAGES.find((l) => l.code === (user.nativeLanguage || 'it'))?.name || 'Italiano'}
          targetName={activeLang.name}
          t={t}
        />
      </div>

      {/* Compact Level Test Card */}
      <div
        onClick={onOpenLevelTest}
        className="bento-card p-4 sm:p-5 bg-gradient-to-r from-[#C99A3D]/15 via-white to-[#6B7C4F]/15 border-2 border-[#C99A3D]/40 hover:border-[#C99A3D] cursor-pointer flex items-center justify-between gap-4 transition-all"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#C99A3D] text-white flex items-center justify-center font-extrabold text-xl font-display shadow-xs shrink-0">
            🎯
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="badge-leaf bg-[#C99A3D] text-white">Test di Livello</span>
              {user.currentLevel && (
                <span className="text-xs font-bold text-[#E8802F] font-display">
                  Livello attuale: {user.currentLevel}
                </span>
              )}
            </div>
            <h3 className="font-bold text-base text-[#3A2B22] font-display mt-0.5 truncate">
              {user.currentLevel ? `Il tuo livello: ${user.currentLevel}` : 'Non hai ancora fatto il test'}
            </h3>
            <p className="text-xs text-[#3A2B22]/70 font-medium truncate mt-0.5">
              {levelTestCardSub}
            </p>
          </div>
        </div>

        <button className="btn-zucca py-2.5 px-4 text-xs font-bold shrink-0">
          {user.currentLevel ? 'Rifai il Test 🔄' : 'Inizia Test 🎯'}
        </button>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Primary Review Action Bento Card */}
        <div className="md:col-span-7 bento-card bg-gradient-to-br from-[#6B7C4F] to-[#52623a] text-white relative overflow-hidden flex flex-col justify-between min-h-[260px]">
          <div className="z-10 space-y-3">
            <span className="badge-leaf">Attività del giorno</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-white leading-tight">
              {dueItems.length > 0
                ? `Hai ${dueItems.length} parole pronte in tana.`
                : totalCount > 0
                ? 'I tuoi vocaboli sono aggiornati.'
                : 'La tua tana è pronta.'}
            </h2>
            <p className="text-white/85 text-sm sm:text-base max-w-md font-medium">
              {dueItems.length > 0
                ? 'Te le ripropongo ora prima che sfuggano dalla memoria.'
                : 'Puoi fare un ripasso extra o iniziare un esercizio di grammatica.'}
            </p>
          </div>

          <div className="z-10 mt-6 flex items-center gap-3">
            <button id="tour-target-review-btn" onClick={onStartReview} className="btn-zucca text-base sm:text-lg px-8 py-3.5">
              {dueItems.length > 0 ? 'Ripassa ora' : 'Inizia ripasso'}
            </button>
          </div>

          {/* Background Raccoon element */}
          <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none select-none">
            <Mascot pose="thinking" size={240} />
          </div>
        </div>

        {/* Progress & Vocabulary Stats Bento Card */}
        <div className="md:col-span-5 bento-card border-2 border-[#6B7C4F]/30 border-dashed flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="badge-leaf bg-[#C99A3D]">Stato Tana</span>
              <span className="text-xs font-bold text-[#6B7C4F] font-display">
                {totalCount} parole salvate
              </span>
            </div>
            <h3 className="text-xl font-bold font-display text-[#3A2B22] mt-2">
              Padronanza Vocaboli
            </h3>
            <p className="text-xs text-[#3A2B22]/70 mt-1">
              Progresso basato sulle tue risposte recenti
            </p>

            {/* Visual Bar */}
            <div className="w-full bg-gray-100 h-3.5 rounded-full mt-4 overflow-hidden border border-gray-200">
              <div
                className="bg-[#C99A3D] h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    totalCount === 0
                      ? 0
                      : Math.round(((totalCount - dueItems.length) / Math.max(1, totalCount)) * 100)
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 italic font-medium">
              {totalCount === 0
                ? 'Importa un elenco di parole per iniziare'
                : `${Math.round(
                    ((totalCount - dueItems.length) / Math.max(1, totalCount)) * 100
                  )}% in memoria a lungo termine`}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs">
            <span className="text-[#3A2B22]/70">Parole da ripassare:</span>
            <span className="font-bold text-[#E8802F] font-display text-sm">{dueItems.length}</span>
          </div>
        </div>

        {/* Quick Access Grid (4 Cards) */}
        <div className="md:col-span-3 bento-card cursor-pointer hover:border-[#E8802F]/50 transition-all" onClick={() => onNavigate('import')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#E8802F]/15 text-[#E8802F] flex items-center justify-center text-xl font-bold shrink-0">
              📥
            </div>
            <div>
              <h3 className="font-bold font-display text-sm text-[#3A2B22]">Importa Vocaboli</h3>
              <p className="text-[11px] text-gray-500">Aggiungi file o liste</p>
            </div>
          </div>
          <p className="text-xs text-[#3A2B22]/70 italic mt-2 font-medium">
            Carica ed estrai coppie di parole.
          </p>
        </div>

        <div className="md:col-span-3 bento-card cursor-pointer hover:border-[#6B7C4F]/50 transition-all" onClick={() => onNavigate('grammar')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#6B7C4F]/15 text-[#6B7C4F] flex items-center justify-center text-xl font-bold shrink-0">
              🌲
            </div>
            <div>
              <h3 className="font-bold font-display text-sm text-[#3A2B22]">Grammatica</h3>
              <p className="text-[11px] text-gray-500">Da A1 a C2</p>
            </div>
          </div>
          <p className="text-xs text-[#3A2B22]/70 italic mt-2 font-medium">
            Esercizi e spiegazioni sul syllabus.
          </p>
        </div>

        <div className="md:col-span-3 bento-card cursor-pointer hover:border-[#E8802F]/50 transition-all" onClick={() => onNavigate('pronunciation')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#E8802F]/15 text-[#E8802F] flex items-center justify-center text-xl font-bold shrink-0">
              🎙️
            </div>
            <div>
              <h3 className="font-bold font-display text-sm text-[#3A2B22]">Pronuncia</h3>
              <p className="text-[11px] text-gray-500">Ascolto & registrazione</p>
            </div>
          </div>
          <p className="text-xs text-[#3A2B22]/70 italic mt-2 font-medium">
            Registrati, confronta l'audio ed esercitati.
          </p>
        </div>

        <div className="md:col-span-3 bento-card cursor-pointer hover:border-[#6B7C4F]/50 transition-all bg-gradient-to-br from-[#F2E8D5]/60 to-[#6B7C4F]/10 border-2 border-[#6B7C4F]/30" onClick={() => onNavigate('wardrobe')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#6B7C4F]/20 text-[#6B7C4F] flex items-center justify-center text-xl font-bold shrink-0">
              👗
            </div>
            <div>
              <h3 className="font-bold font-display text-sm text-[#3A2B22]">Guardaroba</h3>
              <p className="text-[11px] text-[#6B7C4F] font-bold">Outfit & Salvagente</p>
            </div>
          </div>
          <p className="text-xs text-[#3A2B22]/70 italic mt-2 font-medium">
            Spendi ghiande per sbloccare vestiti e proteggere la tua streak 🛡️.
          </p>
        </div>

        <div className="md:col-span-3 bento-card cursor-pointer hover:border-[#C99A3D]/50 transition-all" onClick={() => onNavigate('reading')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#C99A3D]/15 text-[#C99A3D] flex items-center justify-center text-xl font-bold shrink-0">
              📚
            </div>
            <div>
              <h3 className="font-bold font-display text-sm text-[#3A2B22]">Comprensione</h3>
              <p className="text-[11px] text-gray-500">Letture interattive</p>
            </div>
          </div>
          <p className="text-xs text-[#3A2B22]/70 italic mt-2 font-medium">
            Tocca qualsiasi parola per la tana.
          </p>
        </div>

        {/* Tip of the Day Bento Card */}
        <div className="md:col-span-5 bento-card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 flex flex-col justify-between">
          <div>
            <h3 className="font-bold font-display text-base text-[#3A2B22] flex items-center gap-2">
              <span className="text-xl">💡</span> Nota del procione
            </h3>
            <p className="text-sm italic text-[#3A2B22]/85 mt-2 leading-relaxed font-medium">
              "Ripassare poche parole ogni giorno è molto più efficace dello studio intensivo concentrato in un solo momento."
            </p>
          </div>
          <div className="flex justify-between items-end mt-4 pt-3 border-t border-amber-200/40">
            <span className="text-[11px] font-bold text-[#C99A3D] font-display">Tana di Raccoonary</span>
            <span className="text-xl">🦝</span>
          </div>
        </div>

        {/* Forest Trail Grammar Preview Bento Card */}
        <div className="md:col-span-7 bento-card space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold font-display text-lg text-[#3A2B22]">
                Sentiero di Grammatica 🌲
              </h3>
              <p className="text-xs text-gray-500">Un passo alla volta nel bosco</p>
            </div>
            <button
              onClick={() => onNavigate('grammar')}
              className="text-xs font-bold text-[#6B7C4F] hover:underline font-display cursor-pointer"
            >
              Vedi tutti →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(() => {
              const displaySyllabus = sharedContent?.syllabus
                ? [
                    ...(sharedContent.syllabus.base || []),
                    ...(sharedContent.syllabus.intermedio || []),
                    ...(sharedContent.syllabus.avanzato || []),
                  ]
                : GRAMMAR_SYLLABUS;

              return displaySyllabus.slice(0, 4).map((topic, index) => (
                <div
                  key={topic.id}
                  onClick={() => onSelectGrammarTopic(topic.id)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-[#6B7C4F]/15 hover:border-[#6B7C4F] hover:bg-[#F2E8D5]/30 transition-all cursor-pointer bg-white shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-full bg-[#6B7C4F] text-white flex items-center justify-center font-bold text-xs font-display shadow-xs shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#C99A3D]/20 text-[#C99A3D]">
                        {topic.level}
                      </span>
                      <span className="font-bold text-xs text-[#3A2B22] font-display truncate">
                        {topic.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3A2B22]/65 truncate mt-0.5 font-medium">
                      {topic.summary}
                    </p>
                  </div>
                  <span className="text-[#6B7C4F] text-base shrink-0">›</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Add Language Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#F2E8D5] rounded-3xl p-6 max-w-md w-full border-2 border-[#3A2B22] shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#3A2B22] font-bold text-xl cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold font-display text-[#3A2B22]">
                Aggiungi una lingua 🌍
              </h2>
              <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium">
                Scegli la nuova lingua che desideri imparare o esercitare:
              </p>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setShowAddModal(false);
                    if (onAddNewLanguage) onAddNewLanguage(lang.code);
                  }}
                  className="w-full p-3.5 bg-white hover:bg-[#6B7C4F]/10 rounded-2xl border-2 border-gray-200 hover:border-[#6B7C4F] flex items-center justify-between font-bold text-[#3A2B22] shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-base font-display">{lang.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#6B7C4F] font-display">Inizia →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
