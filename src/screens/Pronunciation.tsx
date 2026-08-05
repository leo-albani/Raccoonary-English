import React, { useState, useEffect, useRef } from 'react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile, VocabItem } from '../types';
import { TARGET_LANGUAGES, NATIVE_LANGUAGES } from '../data/languages';
import { playSound } from '../services/sound';

interface PronunciationProps {
  userProfile: UserProfile;
  vocabItems: VocabItem[];
  onSessionComplete: (acornsEarned: number) => void;
  onBack: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

// Default fallback items per target language if user's tana is sparse
const FALLBACK_VOCAB: Record<string, { term: string; translation: string; example: string }[]> = {
  en: [
    { term: 'Acknowledge', translation: 'Riconoscere / Confermare', example: 'She acknowledged her mistake gracefully.' },
    { term: 'Atmosphere', translation: 'Atmosfera', example: 'The cozy cafe had a warm atmosphere.' },
    { term: 'Pronunciation', translation: 'Pronuncia', example: 'Clear pronunciation helps in conversation.' },
    { term: 'Perseverance', translation: 'Perseveranza', example: 'Perseverance is key to learning a new language.' },
    { term: 'Curiosity', translation: 'Curiosità', example: 'His curiosity led him to explore the forest.' },
    { term: 'Opportunity', translation: 'Opportunità', example: 'Every challenge is an opportunity to grow.' },
    { term: 'Fluency', translation: 'Fluidità', example: 'Daily practice builds natural fluency.' },
    { term: 'Vocabulary', translation: 'Vocabolario', example: 'Building vocabulary enriches your expression.' },
    { term: 'Adventure', translation: 'Avventura', example: 'Learning a language is an exciting adventure.' },
    { term: 'Raccoon', translation: 'Procione', example: 'The clever raccoon opened the satchel.' },
  ],
  es: [
    { term: 'Agradecimiento', translation: 'Ringraziamento / Riconoscenza', example: 'Expresó su agradecimiento a todos.' },
    { term: 'Pronunciación', translation: 'Pronuncia', example: 'La buena pronunciación requiere práctica.' },
    { term: 'Perseverancia', translation: 'Perseveranza', example: 'La perseverancia trae buenos resultados.' },
    { term: 'Curiosidad', translation: 'Curiosità', example: 'La curiosidad es el motor del aprendizaje.' },
    { term: 'Oportunidad', translation: 'Opportunità', example: 'Aprovecha cada oportunidad para hablar.' },
    { term: 'Fluidez', translation: 'Fluidità', example: 'Poco a poco ganarás fluidez.' },
    { term: 'Vocabulario', translation: 'Vocabolario', example: 'Su vocabulario se amplía cada día.' },
    { term: 'Aventura', translation: 'Avventura', example: 'Un nuevo idioma es una gran aventura.' },
    { term: 'Naturaleza', translation: 'Natura', example: 'Caminar por la naturaleza relaja la mente.' },
    { term: 'Mariposa', translation: 'Farfalla', example: 'La mariposa vuela entre las flores.' },
  ],
  fr: [
    { term: 'Reconnaissance', translation: 'Riconoscimento', example: 'Il a exprimé sa reconnaissance.' },
    { term: 'Prononciation', translation: 'Pronuncia', example: 'Une bonne prononciation s’acquiert avec le temps.' },
    { term: 'Persevérance', translation: 'Perseveranza', example: 'La persévérance porte ses fruits.' },
    { term: 'Curiosité', translation: 'Curiosità', example: 'La curiosité pousse à découvrir de nouveaux mots.' },
    { term: 'Opportunité', translation: 'Opportunità', example: 'Chaque conversation est une opportunité.' },
    { term: 'Fluidité', translation: 'Fluidità', example: 'Vous gagnerez en fluidité progressivement.' },
    { term: 'Vocabulaire', translation: 'Vocabolario', example: 'Enrichissez votre vocabulaire au quotidien.' },
    { term: 'Aventure', translation: 'Avventura', example: 'Apprendre une langue est une belle aventure.' },
    { term: 'Mélodie', translation: 'Melodia', example: 'La mélodie de la langue française est douce.' },
    { term: 'Papillon', translation: 'Farfalla', example: 'Le papillon se pose doucement sur la feuille.' },
  ],
  de: [
    { term: 'Aussprache', translation: 'Pronuncia', example: 'Eine deutliche Aussprache hilft beim Verstehen.' },
    { term: 'Neugierde', translation: 'Curiosità', example: 'Neugierde treibt das Sprachenlernen an.' },
    { term: 'Gelegenheit', translation: 'Opportunità', example: 'Nutze jede Gelegenheit zum Sprechen.' },
    { term: 'Wortschatz', translation: 'Vocabolario', example: 'Ein großer Wortschatz ist sehr nützlich.' },
    { term: 'Abenteuer', translation: 'Avventura', example: 'Ein neues Sprachabenteuer beginnt heute.' },
    { term: 'Durchhaltevermögen', translation: 'Perseveranza', example: 'Durchhaltevermögen führt zum Ziel.' },
    { term: 'Natur', translation: 'Natura', example: 'Der Wald ist voller Leben im Frühling.' },
    { term: 'Erfahrung', translation: 'Esperienza', example: 'Jede Übung bringt wertvolle Erfahrung.' },
    { term: 'Zusammenarbeit', translation: 'Collaborazione', example: 'Gute Zusammenarbeit bringt Erfolg.' },
    { term: 'Schmetterling', translation: 'Farfalla', example: 'Der Schmetterling fliegt über die Wiese.' },
  ],
};

function speakText(text: string, targetLangCode: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      ja: 'ja-JP',
      zh: 'zh-CN',
      ru: 'ru-RU',
    };
    utterance.lang = langMap[targetLangCode] || `${targetLangCode}-${targetLangCode.toUpperCase()}`;
    utterance.rate = 0.88; // clear speed
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Speech synthesis error:', e);
  }
}

export const Pronunciation: React.FC<PronunciationProps> = ({
  userProfile,
  vocabItems,
  onSessionComplete,
  onBack,
  t,
}) => {
  const targetLang = userProfile.activeProfileId || 'en';
  const nativeLang = userProfile.nativeLanguage || 'it';
  const targetInfo = TARGET_LANGUAGES.find((l) => l.code === targetLang);
  const nativeInfo = NATIVE_LANGUAGES.find((l) => l.code === nativeLang);
  const targetName = targetInfo ? targetInfo.name : targetLang.toUpperCase();

  // Session items pool setup
  const [sessionPool, setSessionPool] = useState<{ id: string; term: string; translation: string; example: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [micSupported, setMicSupported] = useState(true);

  // Speech recognition optional helper badge
  const [recognitionFeedback, setRecognitionFeedback] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Build 10-item session pool on mount or targetLang change
  useEffect(() => {
    let pool: { id: string; term: string; translation: string; example: string }[] = [];
    const tanaMatching = vocabItems.filter(
      (item) => item.targetLang === targetLang || item.sourceLang === targetLang || !item.targetLang
    );

    if (tanaMatching.length > 0) {
      // Shuffle & pick up to 10
      const shuffled = [...tanaMatching].sort(() => Math.random() - 0.5);
      pool = shuffled.slice(0, 10).map((item) => ({
        id: item.id,
        term: item.term,
        translation: item.translation,
        example: item.exampleSource || item.exampleTranslation || '',
      }));
    }

    // Fill remaining if less than 10 using fallback
    if (pool.length < 10) {
      const fallbackList = FALLBACK_VOCAB[targetLang] || FALLBACK_VOCAB.en;
      const needed = 10 - pool.length;
      const shuffledFallback = [...fallbackList].sort(() => Math.random() - 0.5);
      const added = shuffledFallback.slice(0, needed).map((fb, idx) => ({
        id: `fb_${idx}_${Date.now()}`,
        term: fb.term,
        translation: fb.translation,
        example: fb.example,
      }));
      pool = [...pool, ...added];
    }

    setSessionPool(pool);
    setCurrentIndex(0);
    setSuccessCount(0);
    setIsFinished(false);
    setUserAudioUrl(null);
  }, [targetLang, vocabItems]);

  // Check MediaRecorder browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
        setMicSupported(false);
      }
    }
  }, []);

  // Cleanup object URLs on unmount or URL change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (userAudioUrl) {
        URL.revokeObjectURL(userAudioUrl);
      }
    };
  }, [userAudioUrl]);

  const currentItem = sessionPool[currentIndex];

  const handleSpeakModel = () => {
    if (!currentItem) return;
    speakText(currentItem.term, targetLang);
  };

  const handleStartRecording = async () => {
    if (!micSupported) return;

    // Reset previous recording
    if (userAudioUrl) {
      URL.revokeObjectURL(userAudioUrl);
      setUserAudioUrl(null);
    }
    setRecognitionFeedback(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setUserAudioUrl(audioUrl);

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());

        // Autoplay sequence: first model speech, then user audio
        handleSpeakModel();
        setTimeout(() => {
          if (userAudioRef.current) {
            userAudioRef.current.play().catch(() => {});
          }
        }, 1800);
      };

      // Optional Speech Recognition helper if browser supports it (e.g. Chrome)
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.lang = targetLang === 'en' ? 'en-US' : targetLang === 'es' ? 'es-ES' : targetLang === 'fr' ? 'fr-FR' : targetLang === 'de' ? 'de-DE' : targetLang;
          rec.continuous = false;
          rec.interimResults = false;
          rec.onresult = (e: any) => {
            const transcript = e.results[0][0]?.transcript || '';
            const cleanTrans = transcript.trim().toLowerCase();
            const cleanTerm = currentItem.term.trim().toLowerCase();
            if (cleanTrans.includes(cleanTerm) || cleanTerm.includes(cleanTrans)) {
              setRecognitionFeedback('✨ Sembra molto preciso!');
            } else {
              setRecognitionFeedback(`💡 Riconosciuto: "${transcript}" — verifica dizione`);
            }
          };
          rec.start();
          recognitionRef.current = rec;
        } catch (e) {
          // Ignore speech recognition errors silently
        }
      }

      recorder.start();
      setIsRecording(true);
      setMicPermissionDenied(false);
    } catch (e) {
      console.warn('Microphone permission denied or error:', e);
      setMicPermissionDenied(true);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  const handleSelfEval = (success: boolean) => {
    if (userAudioUrl) {
      URL.revokeObjectURL(userAudioUrl);
      setUserAudioUrl(null);
    }
    setRecognitionFeedback(null);

    if (success) {
      setSuccessCount((prev) => prev + 1);
      playSound('correct');
    } else {
      playSound('review');
    }

    if (currentIndex + 1 < sessionPool.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      playSound('sessionComplete');
      const earned = (successCount + (success ? 1 : 0)) * 4;
      onSessionComplete(earned);
    }
  };

  const handleRestartSession = () => {
    setCurrentIndex(0);
    setSuccessCount(0);
    setIsFinished(false);
    setUserAudioUrl(null);
    setRecognitionFeedback(null);
  };

  // Render Finished Summary Screen
  if (isFinished) {
    const totalEarned = successCount * 4;
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto text-center space-y-6 pt-8 animate-fade-in pb-28">
        <Mascot pose="happy" size={120} speechBubble="Ottimo lavoro con la pronuncia!" />

        <div className="bento-card space-y-5 border-2 border-[#6B7C4F]/30">
          <h2 className="text-2xl font-bold font-display text-[#3A2B22]">
            Sessione Completata! 🎉
          </h2>

          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="bg-[#6B7C4F]/10 p-4 rounded-2xl">
              <div className="text-3xl font-bold font-display text-[#6B7C4F]">
                {successCount} / {sessionPool.length}
              </div>
              <div className="text-xs text-[#3A2B22]/70 font-medium mt-1">Pronunce riuscite</div>
            </div>

            <div className="bg-[#C99A3D]/10 p-4 rounded-2xl">
              <div className="text-3xl font-bold font-display text-[#C99A3D]">
                +{totalEarned} 🌰
              </div>
              <div className="text-xs text-[#3A2B22]/70 font-medium mt-1">Ghiande guadagnate</div>
            </div>
          </div>

          <p className="text-xs text-[#3A2B22]/80 leading-relaxed font-medium">
            L'ascolto attivo e l'autovalutazione sono il modo migliore per sciogliere la lingua e parlare con naturalezza.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleRestartSession}
              className="btn-zucca flex-1 py-3 text-sm font-bold font-display"
            >
              🔄 Altra Sessione
            </button>
            <button
              onClick={onBack}
              className="py-3 px-5 rounded-2xl bg-white border-2 border-[#6B7C4F]/30 text-[#3A2B22] text-sm font-bold font-display hover:bg-[#F2E8D5]/50 transition-all cursor-pointer"
            >
              🏠 Torna alla Tana
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="p-6 text-center max-w-md mx-auto pt-12 space-y-4">
        <Mascot pose="thinking" size={90} />
        <p className="text-sm font-medium text-[#3A2B22]">Caricamento esercizi di pronuncia...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#6B7C4F]/15 pb-3">
        <button
          onClick={onBack}
          className="text-xs font-bold text-[#6B7C4F] hover:underline font-display flex items-center gap-1 cursor-pointer"
        >
          ← Torna alla Tana
        </button>
        <span className="text-xs font-bold font-display text-[#6B7C4F] bg-[#6B7C4F]/10 px-3 py-1 rounded-full">
          Esercizio {currentIndex + 1} di {sessionPool.length}
        </span>
      </div>

      {/* Raccoon Explanation Banner */}
      <div className="bento-card flex items-start sm:items-center gap-4 bg-[#F2E8D5]/70 border border-[#6B7C4F]/25 p-4">
        <div className="shrink-0">
          <Mascot pose="greeting" size={65} />
        </div>
        <div>
          <h1 className="text-lg font-bold font-display text-[#3A2B22]">Esercizi di Pronuncia</h1>
          <p className="text-xs text-[#3A2B22]/80 leading-relaxed font-medium mt-0.5">
            "Mi serve il microfono per farti sentire la tua pronuncia — puoi sempre disattivarlo dopo dalle impostazioni del telefono."
          </p>
        </div>
      </div>

      {/* Active Pronunciation Card */}
      <div className="bento-card space-y-6 border-2 border-[#6B7C4F]/30 shadow-sm relative">
        {/* Progress bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#6B7C4F] h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / sessionPool.length) * 100}%` }}
          />
        </div>

        {/* Display Term */}
        <div className="text-center space-y-2 py-2">
          <span className="badge-leaf">Lingua: {targetName}</span>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-[#3A2B22]">
            {currentItem.term}
          </h2>
          <p className="text-sm sm:text-base text-[#6B7C4F] font-bold">
            {currentItem.translation}
          </p>
          {currentItem.example && (
            <p className="text-xs sm:text-sm text-[#3A2B22]/70 italic max-w-md mx-auto pt-1 font-medium">
              "{currentItem.example}"
            </p>
          )}
        </div>

        {/* Audio Action Buttons */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Model Audio Button */}
            <button
              onClick={handleSpeakModel}
              className="py-3.5 px-4 rounded-2xl bg-[#6B7C4F]/15 border-2 border-[#6B7C4F]/40 hover:bg-[#6B7C4F]/25 text-[#3A2B22] font-bold font-display text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <span>🔊</span>
              <span>Ascolta Modello</span>
            </button>

            {/* 2. Recording Button */}
            {!micSupported || micPermissionDenied ? (
              <button
                disabled
                className="py-3.5 px-4 rounded-2xl bg-gray-100 border-2 border-gray-200 text-gray-400 font-bold font-display text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                title="Microfono non disponibile: puoi comunque esercitarti con l'ascolto"
              >
                <span>🎙️</span>
                <span>Solo Ascolto (Mic non disponibile)</span>
              </button>
            ) : isRecording ? (
              <button
                onClick={handleStopRecording}
                className="py-3.5 px-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold font-display text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md animate-pulse"
              >
                <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                <span>⏹️ Ferma Registrazione</span>
              </button>
            ) : (
              <button
                onClick={handleStartRecording}
                className="py-3.5 px-4 rounded-2xl bg-[#E8802F] hover:bg-[#d47023] text-white font-bold font-display text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>🎙️</span>
                <span>Registra la tua voce</span>
              </button>
            )}
          </div>

          {/* User Recording Playback & Replay Controls */}
          {userAudioUrl && (
            <div className="p-4 rounded-2xl bg-[#F2E8D5]/60 border border-[#6B7C4F]/30 space-y-3 animate-fade-in text-center">
              <audio ref={userAudioRef} src={userAudioUrl} className="hidden" />
              <div className="text-xs font-bold text-[#3A2B22] flex items-center justify-center gap-2">
                <span>🎧 Registrazione pronta per il confronto</span>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={handleSpeakModel}
                  className="py-2 px-3.5 rounded-xl bg-white border border-[#6B7C4F]/30 text-xs font-bold text-[#3A2B22] hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>🔊 Riascolta Modello</span>
                </button>
                <button
                  onClick={() => userAudioRef.current?.play()}
                  className="py-2 px-3.5 rounded-xl bg-[#6B7C4F] text-white text-xs font-bold font-display hover:bg-[#586740] flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>🎧 Riascolta la Tua Voce</span>
                </button>
              </div>

              {/* Optional Speech Recognition feedback badge if present */}
              {recognitionFeedback && (
                <div className="text-[11px] font-medium text-[#3A2B22]/80 bg-white/80 p-2 rounded-xl border border-[#6B7C4F]/20">
                  {recognitionFeedback}
                </div>
              )}
            </div>
          )}

          {/* Self-Evaluation Section */}
          <div className="border-t border-[#6B7C4F]/15 pt-4 space-y-2">
            <label className="block text-center text-xs font-bold text-[#3A2B22] uppercase tracking-wider font-display">
              Come è andata la tua pronuncia?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => handleSelfEval(true)}
                className="py-3 px-4 rounded-2xl bg-[#6B7C4F] hover:bg-[#586740] text-white font-bold font-display text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>Ci sono riuscito</span>
              </button>

              <button
                onClick={() => handleSelfEval(false)}
                className="py-3 px-4 rounded-2xl bg-white border-2 border-[#6B7C4F]/30 text-[#3A2B22] hover:bg-[#F2E8D5]/50 font-bold font-display text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🌱</span>
                <span>Ci riprovo più avanti</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
