import React from 'react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile, VocabItem } from '../types';
import { GRAMMAR_SYLLABUS } from '../data/grammarSyllabus';

interface HomeProps {
  user: UserProfile;
  vocabItems: VocabItem[];
  onStartReview: () => void;
  onNavigate: (tab: 'memorize' | 'grammar' | 'reading' | 'import' | 'settings') => void;
  onSelectGrammarTopic: (topicId: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  user,
  vocabItems,
  onStartReview,
  onNavigate,
  onSelectGrammarTopic,
}) => {
  const now = Date.now();
  const dueItems = vocabItems.filter((i) => i.nextReviewAt <= now);
  const totalCount = vocabItems.length;

  // Contextual greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Buondì';
  if (hour >= 18 || hour < 5) timeGreeting = 'Buonasera';
  else if (hour >= 12) timeGreeting = 'Buon pomeriggio';

  const raccoonGreeting =
    dueItems.length > 0
      ? `Ciao! Ci sono ${dueItems.length} parole pronte in tana per te oggi.`
      : totalCount === 0
      ? 'Tutto tranquillo in tana! Vuoi aggiungere parole nuove o esercitarti con la grammatica?'
      : 'Tutto tranquillo in tana oggi! Vuoi fare una sessione extra di ripasso?';

  return (
    <div className="pb-28 pt-4 px-4 sm:px-6 max-w-5xl mx-auto space-y-6">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-[#6B7C4F]/20 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#6B7C4F]/10 rounded-full border-2 border-[#3A2B22] flex items-center justify-center overflow-hidden shadow-xs">
              <Mascot pose={dueItems.length > 0 ? 'greeting' : 'sleeping'} size={75} />
            </div>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B7C4F] font-display">
              {timeGreeting}, Esploratore! 👋
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22] leading-tight">
              Tana di Raccoonary
            </h1>
            <p className="text-xs sm:text-sm text-[#3A2B22]/75 font-medium mt-0.5">
              {raccoonGreeting}
            </p>
          </div>
        </div>

        {/* Header Stats Badges */}
        <div className="flex gap-3 justify-between md:justify-end">
          <div className="bg-white rounded-2xl px-4 py-2.5 flex items-center gap-3 border-b-4 border-gray-200 shadow-xs flex-1 md:flex-none">
            <span className="text-2xl">🌙</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Streak</p>
              <p className="text-base font-bold font-display text-[#3A2B22]">{user.streakCount} notti</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl px-4 py-2.5 flex items-center gap-3 border-b-4 border-gray-200 shadow-xs flex-1 md:flex-none">
            <span className="text-2xl">🌰</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Ghiande</p>
              <p className="text-base font-bold font-display text-[#E8802F]">{user.totalAcorns}</p>
            </div>
          </div>
        </div>
      </header>

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
                ? 'Tutti i vocaboli ripassati!'
                : 'La tua tana è pronta per accogliere parole.'}
            </h2>
            <p className="text-white/85 text-sm sm:text-base max-w-md font-medium">
              {dueItems.length > 0
                ? "L'algoritmo dice che è il momento perfetto per ripassarle prima di dimenticarle!"
                : 'Continua ad allenare la memoria con un ripasso extra o scopri nuovi concetti.'}
            </p>
          </div>

          <div className="z-10 mt-6 flex items-center gap-3">
            <button onClick={onStartReview} className="btn-zucca text-base sm:text-lg px-8 py-3.5">
              {dueItems.length > 0 ? 'Ripassa ora ⚡' : 'Inizia ripasso ⚡'}
            </button>
          </div>

          {/* Background Raccoon SVG element */}
          <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none select-none">
            <Mascot pose="studying" size={240} />
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
              Progresso basato sull'intervallo di ripetizione (Spaced Repetition)
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
                ? '0% completato — Importa il tuo primo elenco di parole'
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

        {/* Quick Access Grid (3 Columns across desktop) */}
        <div className="md:col-span-4 bento-card cursor-pointer hover:border-[#E8802F]/50 transition-all" onClick={() => onNavigate('import')}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E8802F]/15 text-[#E8802F] flex items-center justify-center text-2xl font-bold">
              📥
            </div>
            <div>
              <h3 className="font-bold font-display text-base text-[#3A2B22]">Importa Vocaboli</h3>
              <p className="text-xs text-gray-500">Aggiungi file CSV o liste</p>
            </div>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-gray-400 text-xs mt-2">
            Importa ora le tue liste →
          </div>
        </div>

        <div className="md:col-span-4 bento-card cursor-pointer hover:border-[#6B7C4F]/50 transition-all" onClick={() => onNavigate('grammar')}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#6B7C4F]/15 text-[#6B7C4F] flex items-center justify-center text-2xl font-bold">
              🌲
            </div>
            <div>
              <h3 className="font-bold font-display text-base text-[#3A2B22]">Grammatica</h3>
              <p className="text-xs text-gray-500">19 argomenti da A1 a C2</p>
            </div>
          </div>
          <p className="text-xs text-[#3A2B22]/70 italic mt-2">
            Esercizi guidati con feedback immediato e spiegazioni chiare.
          </p>
        </div>

        <div className="md:col-span-4 bento-card cursor-pointer hover:border-[#C99A3D]/50 transition-all" onClick={() => onNavigate('reading')}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C99A3D]/15 text-[#C99A3D] flex items-center justify-center text-2xl font-bold">
              📚
            </div>
            <div>
              <h3 className="font-bold font-display text-base text-[#3A2B22]">Comprensione</h3>
              <p className="text-xs text-gray-500">Letture interattive</p>
            </div>
          </div>
          <p className="text-xs text-[#3A2B22]/70 italic mt-2">
            Clicca sulle parole nel testo per salvarle istantaneamente.
          </p>
        </div>

        {/* Tip of the Day Bento Card */}
        <div className="md:col-span-5 bento-card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 flex flex-col justify-between">
          <div>
            <h3 className="font-bold font-display text-base text-[#3A2B22] flex items-center gap-2">
              <span className="text-xl">💡</span> Tip del Giorno
            </h3>
            <p className="text-sm italic text-[#3A2B22]/85 mt-2 leading-relaxed">
              "Ripassare piccole quantità di parole ogni giorno con la Spaced Repetition aumenta la ritenzione del 300% rispetto allo studio intensivo."
            </p>
          </div>
          <div className="flex justify-between items-end mt-4 pt-3 border-t border-amber-200/40">
            <span className="text-[11px] font-bold text-[#C99A3D] font-display">Consiglio del procione</span>
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
              <p className="text-xs text-gray-500">Avanza tappa dopo tappa nel bosco</p>
            </div>
            <button
              onClick={() => onNavigate('grammar')}
              className="text-xs font-bold text-[#6B7C4F] hover:underline font-display"
            >
              Vedi tutti →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GRAMMAR_SYLLABUS.slice(0, 4).map((topic, index) => (
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
                  <p className="text-[11px] text-[#3A2B22]/65 truncate mt-0.5">
                    {topic.summary}
                  </p>
                </div>
                <span className="text-[#6B7C4F] text-base shrink-0">›</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
