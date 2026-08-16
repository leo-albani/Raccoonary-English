import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile, VocabItem, SharedLanguagePairContent, CEFRLevel, GrammarTopicProgress } from '../types';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../data/languages';
import { NavTab } from '../components/Navigation';
import { genderedWord } from '../utils/gender';
import { playSound } from '../services/sound';

const CEFR_LEVEL_DETAILS: { level: CEFRLevel; title: string; desc: string }[] = [
  { level: 'A1', title: 'Principiante', desc: 'Frasi base quotidiane e presentazioni' },
  { level: 'A2', title: 'Elementare', desc: 'Conversazioni semplici e routine' },
  { level: 'B1', title: 'Intermedio', desc: 'Autonomia su viaggi, lavoro e opinioni' },
  { level: 'B2', title: 'Intermedio Superiore', desc: 'Fluidità spontanea e testi complessi' },
  { level: 'C1', title: 'Avanzato', desc: 'Espressione flessibile e sfumature' },
  { level: 'C2', title: 'Padronanza', desc: 'Comprensione e precisione da madrelingua' },
];

interface HomeProps {
  user: UserProfile;
  vocabItems: VocabItem[];
  userProfiles?: string[];
  sharedContent?: SharedLanguagePairContent | null;
  grammarProgress?: Record<string, GrammarTopicProgress>;
  streakFreezeActivated?: boolean;
  onCloseFreezeBanner?: () => void;
  onSwitchProfile?: (targetLanguage: string) => void;
  onAddNewLanguage?: (targetLanguage: string) => void;
  onStartReview: () => void;
  onNavigate: (tab: NavTab) => void;
  onSelectGrammarTopic?: (topicId: string) => void;
  onAddVocabItem?: (item: VocabItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onOpenLevelTest: () => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Home: React.FC<HomeProps> = ({
  user,
  vocabItems,
  userProfiles = ['en'],
  grammarProgress = {},
  streakFreezeActivated,
  onCloseFreezeBanner,
  onSwitchProfile,
  onAddNewLanguage,
  onStartReview,
  onNavigate,
  onOpenLevelTest,
  onUpdateProfile,
  t,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);

  const activeLang = TARGET_LANGUAGES.find((l) => l.code === (user.activeProfileId || 'en')) || {
    code: 'en',
    name: 'Inglese',
    flag: '🇬🇧',
  };
  const availableLanguages = TARGET_LANGUAGES.filter((l) => !userProfiles.includes(l.code));

  const now = Date.now();
  const dueItems = vocabItems.filter((i) => i.nextReviewAt <= now);
  const totalCount = vocabItems.length;
  const passedGrammarCount = (Object.values(grammarProgress || {}) as GrammarTopicProgress[]).filter((p) => p?.passed).length;
  const currentStudyLevel = user.livelloStudioAttivo || user.currentLevel || 'A1';

  // Contextual greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Buondì';
  if (hour >= 18 || hour < 5) timeGreeting = 'Buonasera';
  else if (hour >= 12) timeGreeting = 'Buon pomeriggio';

  const namePart = user.username ? user.username.toUpperCase() : user.firstName ? user.firstName.toUpperCase() : '';
  const titleWord = genderedWord(user.gender, 'ESPLORATORE', 'ESPLORATRICE', '');

  let headerGreeting = timeGreeting.toUpperCase();
  if (titleWord && namePart) {
    headerGreeting += `, ${titleWord} ${namePart}`;
  } else if (titleWord && !namePart) {
    headerGreeting += `, ${titleWord}`;
  } else if (!titleWord && namePart) {
    headerGreeting += `, ${namePart}`;
  }

  const raccoonGreeting =
    dueItems.length > 0
      ? `Ci sono ${dueItems.length} parole pronte per il ripasso oggi.`
      : totalCount === 0
      ? 'La tana è pronta per iniziare a salvare i tuoi primi vocaboli.'
      : 'Tutti i vocaboli in tana sono in pari per oggi!';

  const retentionPercent =
    totalCount === 0 ? 0 : Math.round(((totalCount - dueItems.length) / Math.max(1, totalCount)) * 100);

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
          <div
            className="relative shrink-0 cursor-pointer"
            onClick={() => onNavigate('wardrobe')}
            title="Apri il Guardaroba"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#6B7C4F]/10 rounded-full border-2 border-[#3A2B22] flex items-center justify-center overflow-hidden shadow-xs hover:scale-105 transition-transform">
              <Mascot
                pose={dueItems.length > 0 ? 'greeting' : 'happy'}
                activeOutfit={user.activeOutfit}
                size={75}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B7C4F] font-display">
                {headerGreeting}
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

              {/* Level of Study Pill Badge */}
              {user.livelloStudioAttivo ? (
                <button
                  onClick={() => setShowLevelModal(true)}
                  className="flex items-center gap-1.5 bg-[#6B7C4F]/15 hover:bg-[#6B7C4F]/25 text-[#3A2B22] border border-[#6B7C4F]/30 px-2.5 py-1 rounded-full shadow-xs text-xs font-bold font-display cursor-pointer transition-all"
                  title="Livello attivo di studio. Tocca per cambiare."
                >
                  <span className="text-[10px] text-[#6B7C4F] uppercase tracking-wider font-extrabold">Livello attivo</span>
                  <span className="bg-[#6B7C4F] text-white px-1.5 py-0.2 rounded-md text-[11px] font-black">{user.livelloStudioAttivo}</span>
                  <span className="text-[#6B7C4F] text-[10px]">✏️</span>
                </button>
              ) : (
                <button
                  onClick={onOpenLevelTest}
                  className="flex items-center gap-1.5 bg-[#E8802F]/15 hover:bg-[#E8802F]/25 text-[#E8802F] border border-[#E8802F]/30 px-2.5 py-1 rounded-full shadow-xs text-xs font-bold font-display cursor-pointer transition-all animate-pulse"
                  title="Scopri il tuo livello con il test adattivo"
                >
                  <span>🎯</span>
                  <span>Scopri il tuo livello</span>
                  <span className="text-[10px]">→</span>
                </button>
              )}
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

      {/* 1. Card "La tua tana di parole" */}
      <div
        id="tour-target-word-burrow"
        className="bento-card bg-gradient-to-br from-[#6B7C4F] to-[#52623a] text-white p-6 sm:p-7 relative overflow-hidden shadow-md flex flex-col justify-between min-h-[220px]"
      >
        <div className="z-10 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="badge-leaf bg-white/20 text-white font-display border border-white/30">
              La tua tana di parole 🌰
            </span>
            <span className="text-xs font-bold text-white/80 font-display">
              {totalCount} vocaboli salvati
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white leading-tight">
            {dueItems.length > 0
              ? `Hai ${dueItems.length} ${dueItems.length === 1 ? 'parola da ripassare' : 'parole da ripassare'} oggi.`
              : totalCount > 0
              ? 'Tutti i tuoi vocaboli sono aggiornati!'
              : 'La tua tana è pronta per nuovi vocaboli.'}
          </h2>

          <p className="text-white/85 text-xs sm:text-sm max-w-xl font-medium">
            {dueItems.length > 0
              ? 'Allenati con la ripetizione spaziata per fissare i termini nella memoria a lungo termine.'
              : totalCount > 0
              ? 'Ottimo lavoro! Puoi fare un ripasso extra oppure aggiungere nuove parole.'
              : 'Aggiungi vocaboli dal traduttore, dalle letture o importandoli da file e liste.'}
          </p>

          {/* Retention Progress Bar inside Burrow Card */}
          {totalCount > 0 && (
            <div className="pt-2 max-w-md">
              <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden border border-white/20">
                <div
                  className="bg-[#E8802F] h-full transition-all duration-500 rounded-full shadow-xs"
                  style={{ width: `${retentionPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-white/75 mt-1 font-medium">
                {retentionPercent}% in memoria solida
              </p>
            </div>
          )}
        </div>

        {/* Card Action Buttons & Import Link */}
        <div className="z-10 mt-6 pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            id="tour-target-review-btn"
            onClick={onStartReview}
            className="btn-zucca text-base px-7 py-3 font-bold shadow-md cursor-pointer"
          >
            {dueItems.length > 0 ? 'Ripassa ora ⚡' : 'Inizia ripasso ⚡'}
          </button>

          {/* Spostato qui l'accesso all'import dei vocaboli */}
          <button
            onClick={() => onNavigate('import')}
            className="text-xs sm:text-sm font-bold text-white/90 hover:text-white hover:underline flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto py-1"
          >
            <span>📥</span>
            <span>Importa vocaboli da file o testo →</span>
          </button>
        </div>

        {/* Subtle Background Raccoon */}
        <div className="absolute -right-6 -bottom-8 opacity-15 pointer-events-none select-none">
          <Mascot pose="thinking" size={210} />
        </div>
      </div>

      {/* 2. Riga di richiami rapidi (Sintesi attività) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm text-[#3A2B22] font-display flex items-center gap-1.5">
            <span>🧭</span>
            <span>Attività del Sentiero</span>
          </h3>
          <button
            onClick={() => onNavigate('trail')}
            className="text-xs font-bold text-[#6B7C4F] hover:underline font-display flex items-center gap-1 cursor-pointer"
          >
            <span>Vedi tutto il Sentiero</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Quick Item 1: Grammatica */}
          <div
            onClick={() => onNavigate('grammar')}
            className="bento-card p-4 hover:border-[#6B7C4F] cursor-pointer flex items-center justify-between gap-3 group transition-all bg-white"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#6B7C4F]/15 text-[#6B7C4F] flex items-center justify-center text-xl shrink-0">
                🌲
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-[#3A2B22] font-display group-hover:text-[#6B7C4F] transition-colors truncate">
                  Grammatica
                </h4>
                <p className="text-[11px] text-[#3A2B22]/70 font-medium truncate">
                  {passedGrammarCount > 0
                    ? `${passedGrammarCount} argomenti superati`
                    : `Syllabus A1–C2`}
                </p>
              </div>
            </div>
            <span className="text-[#6B7C4F] font-bold text-base group-hover:translate-x-1 transition-transform shrink-0">
              →
            </span>
          </div>

          {/* Quick Item 2: Letture */}
          <div
            onClick={() => onNavigate('reading')}
            className="bento-card p-4 hover:border-[#C99A3D] cursor-pointer flex items-center justify-between gap-3 group transition-all bg-white"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#C99A3D]/20 text-[#C99A3D] flex items-center justify-center text-xl shrink-0">
                📚
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-[#3A2B22] font-display group-hover:text-[#C99A3D] transition-colors truncate">
                  Letture
                </h4>
                <p className="text-[11px] text-[#3A2B22]/70 font-medium truncate">
                  Livello attivo {currentStudyLevel}
                </p>
              </div>
            </div>
            <span className="text-[#C99A3D] font-bold text-base group-hover:translate-x-1 transition-transform shrink-0">
              →
            </span>
          </div>

          {/* Quick Item 3: Pronuncia */}
          <div
            onClick={() => onNavigate('pronunciation')}
            className="bento-card p-4 hover:border-[#E8802F] cursor-pointer flex items-center justify-between gap-3 group transition-all bg-white"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#E8802F]/15 text-[#E8802F] flex items-center justify-center text-xl shrink-0">
                🎙️
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-[#3A2B22] font-display group-hover:text-[#E8802F] transition-colors truncate">
                  Pronuncia
                </h4>
                <p className="text-[11px] text-[#3A2B22]/70 font-medium truncate">
                  Allena la voce & ascolto
                </p>
              </div>
            </div>
            <span className="text-[#E8802F] font-bold text-base group-hover:translate-x-1 transition-transform shrink-0">
              →
            </span>
          </div>
        </div>
      </div>

      {/* Tip of the Day & Guardaroba Banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div
          onClick={() => onNavigate('wardrobe')}
          className="md:col-span-6 bento-card p-4 cursor-pointer hover:border-[#6B7C4F]/50 transition-all bg-gradient-to-br from-white to-[#F2E8D5]/60 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#6B7C4F]/20 text-[#6B7C4F] flex items-center justify-center text-2xl shrink-0">
              👗
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-[#3A2B22] font-display">Guardaroba di Rocky</h4>
                {user.streakFreezes ? (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                    🛡️ {user.streakFreezes}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[#3A2B22]/70 font-medium truncate mt-0.5">
                Outfit speciali e salvagente streak per non perdere i tuoi progressi.
              </p>
            </div>
          </div>
          <span className="text-[#6B7C4F] font-bold text-sm shrink-0">Apri →</span>
        </div>

        <div className="md:col-span-6 bento-card p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0">
              💡
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-[#3A2B22] font-display">Consiglio del giorno</h4>
              <p className="text-xs italic text-[#3A2B22]/80 font-medium truncate mt-0.5">
                "Poche parole ogni giorno fissano la memoria meglio di ore concentrate."
              </p>
            </div>
          </div>
          <span className="text-lg shrink-0">🦝</span>
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
              <span className="badge-leaf">Nuova Lingua</span>
              <h2 className="text-2xl font-bold font-display text-[#3A2B22]">
                Scegli la lingua da esplorare
              </h2>
              <p className="text-xs text-[#3A2B22]/70 font-medium">
                Ogni lingua ha i suoi vocaboli, la sua serie notturna e le sue impostazioni separate.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    if (onAddNewLanguage) {
                      onAddNewLanguage(lang.code);
                    }
                    setShowAddModal(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#6B7C4F]/20 hover:border-[#6B7C4F] hover:bg-[#6B7C4F]/5 transition-all text-left cursor-pointer"
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="flex-1">
                    <p className="font-bold font-display text-sm text-[#3A2B22]">{lang.name}</p>
                    <p className="text-[10px] text-gray-500 font-medium">Inizia da zero o importa liste</p>
                  </div>
                  <span className="text-[#6B7C4F] font-bold text-sm">Inizia →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Level Selector Modal */}
      {showLevelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#F2E8D5] rounded-3xl p-6 max-w-md w-full border-2 border-[#3A2B22] shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowLevelModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#3A2B22] font-bold text-xl cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="badge-leaf">Livello di Studio</span>
              </div>
              <h2 className="text-2xl font-bold font-display text-[#3A2B22]">
                Imposta il tuo livello attivo 🎯
              </h2>
              <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium">
                Scegli su cosa basare i contenuti di grammatica e comprensione. Puoi cambiarlo liberamente in qualsiasi momento.
              </p>
              {user.currentLevel && (
                <p className="text-xs font-bold text-[#E8802F] font-display pt-1">
                  Ultimo test misurato: {user.currentLevel}
                </p>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {CEFR_LEVEL_DETAILS.map((item) => {
                const isSelected = user.livelloStudioAttivo === item.level;
                const isMeasured = user.currentLevel === item.level;
                return (
                  <button
                    key={item.level}
                    onClick={() => {
                      playSound('correct');
                      if (onUpdateProfile) {
                        onUpdateProfile({ livelloStudioAttivo: item.level });
                      }
                      setShowLevelModal(false);
                    }}
                    className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#6B7C4F]/15 border-[#6B7C4F] shadow-xs'
                        : 'bg-white border-gray-200 hover:border-[#6B7C4F]/50 hover:bg-[#6B7C4F]/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm font-display shrink-0 ${
                          isSelected
                            ? 'bg-[#6B7C4F] text-white'
                            : 'bg-[#C99A3D]/20 text-[#3A2B22]'
                        }`}
                      >
                        {item.level}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#3A2B22] font-display">
                            {item.title}
                          </span>
                          {isMeasured && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#E8802F]/20 text-[#E8802F]">
                              Test
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#3A2B22]/70 font-medium line-clamp-1">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-xs font-bold text-[#6B7C4F] font-display px-2 py-0.5 rounded-full bg-[#6B7C4F]/20">
                        Attivo ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#3A2B22]/10 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowLevelModal(false);
                  onOpenLevelTest();
                }}
                className="btn-zucca-outline w-full py-2.5 text-xs font-bold"
              >
                Fai il test di livello adattivo 🎯
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
