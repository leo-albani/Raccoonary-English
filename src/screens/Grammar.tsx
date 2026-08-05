import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { GrammarTopic, Exercise, VocabItem, GrammarTopicProgress, SharedLanguagePairContent, SpecialSectionItem } from '../types';
import { GRAMMAR_SYLLABUS, IRREGULAR_VERBS } from '../data/grammarSyllabus';
import { generateGrammarExercises } from '../services/gemini';

interface GrammarProps {
  onSaveErrorVocab: (item: VocabItem) => void;
  selectedTopicId?: string | null;
  grammarProgress?: Record<string, GrammarTopicProgress>;
  onUpdateGrammarProgress?: (progress: GrammarTopicProgress) => void;
  lastActiveTopicId?: string | null;
  onSetLastActiveTopicId?: (topicId: string) => void;
  sharedContent?: SharedLanguagePairContent | null;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Grammar: React.FC<GrammarProps> = ({
  onSaveErrorVocab,
  selectedTopicId,
  grammarProgress = {},
  onUpdateGrammarProgress,
  lastActiveTopicId,
  onSetLastActiveTopicId,
  sharedContent,
  t,
}) => {
  // Get topics from sharedContent if available, or fallback
  const allTopics: GrammarTopic[] = sharedContent?.syllabus
    ? [
        ...(sharedContent.syllabus.base || []),
        ...(sharedContent.syllabus.intermedio || []),
        ...(sharedContent.syllabus.avanzato || []),
      ]
    : GRAMMAR_SYLLABUS;

  const specialSections = sharedContent?.specialSections || [];
  const isIrregularApplicable = sharedContent?.irregularVerbsEquivalent
    ? sharedContent.irregularVerbsEquivalent.applicabile
    : true;
  const irregularVerbs = sharedContent?.irregularVerbsEquivalent?.verbi || IRREGULAR_VERBS;

  const [activeTab, setActiveTab] = useState<'syllabus' | 'special' | 'irregular'>('syllabus');
  const [selectedSpecialIdx, setSelectedSpecialIdx] = useState(0);
  const [specialFilter, setSpecialFilter] = useState('');

  const [selectedTopic, setSelectedTopic] = useState<GrammarTopic | null>(
    selectedTopicId ? allTopics.find((t) => t.id === selectedTopicId) || null : null
  );

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [verbFilter, setVerbFilter] = useState('');

  // Categories
  const categories = ['Base', 'Intermedio', 'Avanzato'] as const;

  const startTopicExercises = async (topic: GrammarTopic) => {
    setSelectedTopic(topic);
    setIsLoading(true);
    setExercises([]);
    setCurrentExIndex(0);
    setUserAnswers({});
    setCheckedAnswers({});

    if (onSetLastActiveTopicId) {
      onSetLastActiveTopicId(topic.id);
    }

    try {
      const generated = await generateGrammarExercises(topic.name, topic.level);
      setExercises(generated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishSet = () => {
    if (!selectedTopic || exercises.length === 0) {
      setSelectedTopic(null);
      return;
    }

    // Calculate score percentage
    let correctCount = 0;
    exercises.forEach((ex, idx) => {
      const userAns = (userAnswers[idx] || '').trim().toLowerCase();
      const correctAns = (ex.rispostaCorretta || '').trim().toLowerCase();
      if (userAns === correctAns) {
        correctCount += 1;
      }
    });

    const scorePercent = Math.round((correctCount / exercises.length) * 100);
    const prevProg = grammarProgress[selectedTopic.id];

    const isPassed = (prevProg && prevProg.passed) || scorePercent >= 70;
    const bestScore = Math.max(prevProg?.bestScorePercent || 0, scorePercent);

    const updatedProg: GrammarTopicProgress = {
      topicId: selectedTopic.id,
      topicName: selectedTopic.name,
      exercisesCompleted: (prevProg?.exercisesCompleted || 0) + exercises.length,
      lastGeneratedAt: Date.now(),
      currentExerciseSet: exercises,
      passed: isPassed,
      bestScorePercent: bestScore,
      lastScorePercent: scorePercent,
      attemptsCount: (prevProg?.attemptsCount || 0) + 1,
    };

    if (onUpdateGrammarProgress) {
      onUpdateGrammarProgress(updatedProg);
    }

    setSelectedTopic(null);
  };

  const handleRegenerateRequest = () => {
    const unfinishedCount = exercises.length - Object.keys(checkedAnswers).length;
    if (unfinishedCount > 0 && exercises.length > 0) {
      setShowConfirmModal(true);
    } else if (selectedTopic) {
      startTopicExercises(selectedTopic);
    }
  };

  const confirmRegenerate = () => {
    setShowConfirmModal(false);
    if (selectedTopic) {
      startTopicExercises(selectedTopic);
    }
  };

  const handleCheckAnswer = (index: number) => {
    const ex = exercises[index];
    const userAns = (userAnswers[index] || '').trim().toLowerCase();
    const correctAns = ex.rispostaCorretta.trim().toLowerCase();
    const isCorrect = userAns === correctAns;

    setCheckedAnswers((prev) => ({ ...prev, [index]: true }));

    if (!isCorrect && selectedTopic) {
      // Create vocabulary error item to review later in tana
      const errorVocab: VocabItem = {
        id: `grammar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        term: ex.domanda,
        translation: ex.rispostaCorretta,
        sourceLang: 'en',
        targetLang: 'it',
        synonyms: [],
        exampleSource: ex.domanda,
        exampleTranslation: ex.spiegazione,
        origin: 'grammar_error',
        originDetail: selectedTopic.name,
        createdAt: Date.now(),
        lastReviewedAt: null,
        box: 1,
        nextReviewAt: Date.now(),
        correctStreak: 0,
        wrongCount: 1,
      };
      onSaveErrorVocab(errorVocab);
    }
  };

  const filteredVerbs = irregularVerbs.filter(
    (v) =>
      v.base.toLowerCase().includes(verbFilter.toLowerCase()) ||
      v.translation.toLowerCase().includes(verbFilter.toLowerCase()) ||
      v.pastSimple.toLowerCase().includes(verbFilter.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28">
      {/* Top Tab Switcher */}
      <div className="bg-white p-1.5 rounded-2xl border border-[#6B7C4F]/20 flex shadow-xs max-w-lg mx-auto">
        <button
          onClick={() => {
            setActiveTab('syllabus');
            setSelectedTopic(null);
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold font-display text-xs transition-all cursor-pointer ${
            activeTab === 'syllabus' ? 'bg-[#6B7C4F] text-white shadow-xs' : 'text-[#3A2B22]/70 hover:text-[#3A2B22]'
          }`}
        >
          {t ? t('grammar.tabSyllabus') : '🌲 Syllabus Grammatica'}
        </button>

        {specialSections.length > 0 && (
          <button
            onClick={() => {
              setActiveTab('special');
              setSelectedTopic(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold font-display text-xs transition-all cursor-pointer ${
              activeTab === 'special' ? 'bg-[#6B7C4F] text-white shadow-xs' : 'text-[#3A2B22]/70 hover:text-[#3A2B22]'
            }`}
          >
            {t ? t('grammar.tabSpecial') : '⭐ Sezioni Speciali'}
          </button>
        )}

        {isIrregularApplicable && (
          <button
            onClick={() => {
              setActiveTab('irregular');
              setSelectedTopic(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold font-display text-xs transition-all cursor-pointer ${
              activeTab === 'irregular' ? 'bg-[#6B7C4F] text-white shadow-xs' : 'text-[#3A2B22]/70 hover:text-[#3A2B22]'
            }`}
          >
            {t ? t('grammar.tabIrregular') : '📖 Verbi Irregolari'}
          </button>
        )}
      </div>

      {activeTab === 'special' && specialSections.length > 0 ? (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {specialSections.map((sec, idx) => (
              <button
                key={sec.id || idx}
                onClick={() => {
                  setSelectedSpecialIdx(idx);
                  setSpecialFilter('');
                }}
                className={`px-4 py-2 rounded-xl font-bold text-xs font-display whitespace-nowrap cursor-pointer ${
                  selectedSpecialIdx === idx
                    ? 'bg-[#E8802F] text-white shadow-xs'
                    : 'bg-white text-[#3A2B22]/70 hover:bg-[#F2E8D5]/50 border border-[#6B7C4F]/20'
                }`}
              >
                {sec.nome}
              </button>
            ))}
          </div>

          {(() => {
            const currentSec = specialSections[selectedSpecialIdx] || specialSections[0];
            const items = (currentSec?.voci || []).filter(
              (v) =>
                v.voce.toLowerCase().includes(specialFilter.toLowerCase()) ||
                v.significato.toLowerCase().includes(specialFilter.toLowerCase())
            );

            return (
              <div className="space-y-4">
                <div className="bento-card space-y-3">
                  <span className="badge-leaf">Sezione Speciale</span>
                  <h2 className="font-bold font-display text-2xl text-[#3A2B22]">{currentSec.nome}</h2>
                  <input
                    type="text"
                    value={specialFilter}
                    onChange={(e) => setSpecialFilter(e.target.value)}
                    placeholder="Cerca voce o significato..."
                    className="w-full p-3.5 rounded-xl bg-[#F2E8D5]/50 border border-[#6B7C4F]/30 focus:outline-none focus:border-[#6B7C4F] text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="bento-card p-4 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-[#3A2B22] font-display">
                          {item.voce}
                        </div>
                        <div className="text-xs text-[#6B7C4F] font-bold">
                          {item.significato}
                        </div>
                        {item.esempio && (
                          <div className="text-[11px] text-[#3A2B22]/70 italic mt-1 font-medium">
                            "{item.esempio}"
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const vocabItem: VocabItem = {
                            id: `special_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                            term: item.voce,
                            translation: item.significato,
                            sourceLang: 'en',
                            targetLang: 'it',
                            synonyms: [],
                            exampleSource: item.esempio || '',
                            exampleTranslation: '',
                            origin: 'special_section',
                            originDetail: currentSec.nome,
                            createdAt: Date.now(),
                            lastReviewedAt: null,
                            box: 1,
                            nextReviewAt: Date.now(),
                            correctStreak: 0,
                            wrongCount: 0,
                          };
                          onSaveErrorVocab(vocabItem);
                        }}
                        className="text-xs font-bold text-[#E8802F] hover:underline shrink-0 font-display cursor-pointer bg-[#E8802F]/10 px-2.5 py-1 rounded-lg"
                        title="Salva in tana"
                      >
                        + Tana 📥
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : activeTab === 'irregular' ? (
        /* Irregular Verbs Reference List */
        <div className="space-y-4">
          <div className="bento-card space-y-3">
            <span className="badge-leaf">Consultazione</span>
            <h2 className="font-bold font-display text-2xl text-[#3A2B22]">Tabella Verbi Irregolari</h2>
            <input
              type="text"
              value={verbFilter}
              onChange={(e) => setVerbFilter(e.target.value)}
              placeholder="Cerca verbo (es. write, pensare)..."
              className="w-full p-3.5 rounded-xl bg-[#F2E8D5]/50 border border-[#6B7C4F]/30 focus:outline-none focus:border-[#6B7C4F] text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredVerbs.map((v, idx) => (
              <div key={idx} className="bento-card p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-sm text-[#3A2B22] font-display">
                    {v.base} <span className="font-normal text-xs text-[#3A2B22]/60">({v.translation})</span>
                  </div>
                  <div className="text-xs text-[#6B7C4F] mt-1 font-medium">
                    Past: <strong>{v.pastSimple}</strong> | Part: <strong>{v.pastParticiple}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedTopic ? (
        /* Topic Detail & Exercise Practice Mode */
        <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
          <button
            onClick={() => setSelectedTopic(null)}
            className="text-xs font-bold text-[#6B7C4F] font-display hover:underline cursor-pointer"
          >
            ← Torna al syllabus
          </button>

          {/* Theory Bento Card */}
          <div className="bento-card space-y-4">
            <div className="flex items-center justify-between">
              <span className="badge-leaf bg-[#C99A3D]">
                Livello {selectedTopic.level}
              </span>
              <button
                onClick={handleRegenerateRequest}
                className="text-xs font-bold text-[#E8802F] font-display hover:underline flex items-center gap-1 cursor-pointer"
              >
                🔄 Aggiorna esercizi
              </button>
            </div>

            <h2 className="text-2xl font-bold font-display text-[#3A2B22]">
              {selectedTopic.name}
            </h2>

            <p className="text-sm text-[#3A2B22]/85 leading-relaxed font-medium">
              {selectedTopic.summary}
            </p>

            <div className="bg-[#F2E8D5]/60 p-4 rounded-2xl space-y-1.5 border border-[#6B7C4F]/15">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7C4F] font-display">Esempi pratici:</span>
              {selectedTopic.examples.map((ex, idx) => (
                <p key={idx} className="text-xs italic text-[#3A2B22] font-medium">
                  • "{ex}"
                </p>
              ))}
            </div>
          </div>

          {/* Exercises Section */}
          {isLoading ? (
            <div className="bento-card text-center py-10 space-y-3">
              <Mascot pose="thinking" size={120} speechBubble="Sto preparando gli esercizi per questo argomento..." />
              <p className="text-xs text-[#3A2B22]/70 font-medium">Un attimo di pazienza per la tana...</p>
            </div>
          ) : exercises.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-[#3A2B22]/70 font-display">
                <span>Esercizio {currentExIndex + 1} di {exercises.length}</span>
                <div className="flex gap-1">
                  {exercises.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full ${
                        checkedAnswers[idx] ? 'bg-[#6B7C4F]' : 'bg-[#6B7C4F]/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Single Exercise Card */}
              {(() => {
                const ex = exercises[currentExIndex];
                const isChecked = checkedAnswers[currentExIndex];
                const userAns = userAnswers[currentExIndex] || '';
                const isCorrect = userAns.trim().toLowerCase() === ex.rispostaCorretta.trim().toLowerCase();

                return (
                  <div className="bento-card space-y-4">
                    <p className="font-bold text-lg text-[#3A2B22] font-display">
                      {ex.domanda}
                    </p>

                    {ex.tipo === 'multiple_choice' && ex.opzioni ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ex.opzioni.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => setUserAnswers((prev) => ({ ...prev, [currentExIndex]: opt }))}
                            disabled={isChecked}
                            className={`p-4 rounded-2xl text-left text-sm font-bold font-display border-2 transition-all cursor-pointer ${
                              userAns === opt
                                ? 'bg-[#6B7C4F]/10 border-[#6B7C4F] text-[#3A2B22]'
                                : 'bg-white border-[#6B7C4F]/20 hover:border-[#6B7C4F] text-[#3A2B22]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={userAns}
                        onChange={(e) => setUserAnswers((prev) => ({ ...prev, [currentExIndex]: e.target.value }))}
                        disabled={isChecked}
                        placeholder="Scrivi qui la tua risposta..."
                        className="w-full p-4 rounded-2xl bg-[#F2E8D5]/40 border-2 border-[#6B7C4F]/30 focus:border-[#6B7C4F] focus:outline-none text-base text-[#3A2B22] font-medium"
                      />
                    )}

                    {!isChecked ? (
                      <button
                        onClick={() => handleCheckAnswer(currentExIndex)}
                        disabled={!userAns.trim()}
                        className="btn-zucca w-full py-4 text-base disabled:opacity-50"
                      >
                        Verifica Risposta ⚡
                      </button>
                    ) : (
                      <div
                        className={`p-4 rounded-2xl border-2 space-y-2 text-xs ${
                          isCorrect
                            ? 'bg-[#6B7C4F]/10 border-[#6B7C4F]'
                            : 'bg-[#C99A3D]/15 border-[#C99A3D]'
                        }`}
                      >
                        <div className="font-bold font-display text-base">
                          {isCorrect ? '✨ Esatto!' : `💡 Risposta: "${ex.rispostaCorretta}"`}
                        </div>
                        <p className="text-[#3A2B22]/85 text-xs sm:text-sm leading-relaxed">{ex.spiegazione}</p>

                        {currentExIndex < exercises.length - 1 ? (
                          <button
                            onClick={() => setCurrentExIndex((prev) => prev + 1)}
                            className="btn-zucca w-full py-3 text-sm mt-2"
                          >
                            Esercizio successivo →
                          </button>
                        ) : (
                          <button
                            onClick={handleFinishSet}
                            className="btn-zucca w-full py-3 text-sm mt-2"
                          >
                            Set completato! Torna al Syllabus 🎉
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : null}
        </div>
      ) : (
        /* Syllabus Topic List categorized into Bento Grid */
        <div className="space-y-6">
          {categories.map((cat) => {
            const topics = allTopics.filter((t) => t.category === cat);
            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="badge-leaf">Livello {cat}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topics.map((t) => {
                    const prog = grammarProgress[t.id];
                    const isPassed = prog?.passed;
                    const isLastActive = lastActiveTopicId === t.id;

                    return (
                      <div
                        key={t.id}
                        onClick={() => startTopicExercises(t)}
                        className={`bento-card hover:border-[#6B7C4F] cursor-pointer flex items-center justify-between gap-3 group relative overflow-hidden transition-all ${
                          isPassed ? 'border-2 border-[#6B7C4F]/60 bg-[#6B7C4F]/5' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#C99A3D]/20 text-[#C99A3D] font-display">
                              {t.level}
                            </span>
                            {isPassed && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#6B7C4F] text-white font-display">
                                ✓ Superato
                              </span>
                            )}
                            {prog && prog.bestScorePercent !== undefined && (
                              <span className="text-[10px] font-bold text-[#3A2B22]/60 font-display">
                                Best: {prog.bestScorePercent}%
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base text-[#3A2B22] font-display truncate">
                            {t.name}
                          </h3>
                          <p className="text-xs text-[#3A2B22]/70 line-clamp-2 mt-1 font-medium">
                            {t.summary}
                          </p>
                        </div>

                        {/* Mascot indicator for last active topic */}
                        {isLastActive && (
                          <div className="shrink-0 flex items-center gap-1 bg-[#F2E8D5] px-2 py-1 rounded-xl border border-[#6B7C4F]/30 shadow-xs">
                            <span className="text-sm">🦝</span>
                            <span className="text-[10px] font-bold text-[#6B7C4F]">Qui</span>
                          </div>
                        )}

                        <span className="text-[#E8802F] font-bold text-xl group-hover:translate-x-1 transition-transform shrink-0">
                          →
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Regenerate */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-[#6B7C4F]">
            <Mascot pose="thinking" size={90} />
            <h3 className="text-lg font-bold font-display text-[#3A2B22]">Aggiornare il set?</h3>
            <p className="text-xs text-[#3A2B22]/80 leading-relaxed">
              Hai ancora alcuni esercizi da completare in questo set. Vuoi sostituirli con un nuovo set generato?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-[#3A2B22] font-bold text-xs"
              >
                Annulla
              </button>
              <button
                onClick={confirmRegenerate}
                className="flex-1 py-3 rounded-2xl bg-[#E8802F] text-white font-bold text-xs"
              >
                Sì, aggiorna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
