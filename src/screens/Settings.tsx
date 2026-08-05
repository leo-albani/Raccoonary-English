import React, { useState, useEffect } from 'react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile, VocabItem } from '../types';
import { TanaManager } from '../components/TanaManager';
import { auth, isUserAdmin } from '../services/firebase';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';
import { isSoundEnabled, setSoundEnabled } from '../services/sound';
import {
  getNotificationStatus,
  requestNotificationPermission,
  sendRaccoonNotification,
  setupDailyReminderTimer,
} from '../services/notifications';

interface SettingsProps {
  user: UserProfile;
  userProfiles: string[];
  vocabItems: VocabItem[];
  onUpdateUser: (updated: UserProfile) => void;
  onSwitchProfile: (targetLanguage: string) => void;
  onAddNewLanguage: (targetLanguage: string) => void;
  onDeleteLanguageProfile: (targetLanguage: string) => Promise<void>;
  onDeleteItem: (itemId: string) => void;
  onResetData: () => void;
  onAdminResetData?: () => void;
  onLogout: () => void;
  onRestartTutorial?: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Settings: React.FC<SettingsProps> = ({
  user,
  userProfiles = ['en'],
  vocabItems,
  onUpdateUser,
  onSwitchProfile,
  onAddNewLanguage,
  onDeleteLanguageProfile,
  onDeleteItem,
  onResetData,
  onAdminResetData,
  onLogout,
  onRestartTutorial,
  t,
}) => {
  // Group 1: Account state
  const currentUser = auth.currentUser;
  const currentUserEmail = currentUser?.email;
  const isAdmin = isUserAdmin(currentUserEmail);

  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [username, setUsername] = useState(user.username || '');
  const [isAccountSaved, setIsAccountSaved] = useState(false);
  const [soundActive, setSoundActive] = useState<boolean>(isSoundEnabled());

  const handleToggleSound = (enabled: boolean) => {
    setSoundActive(enabled);
    setSoundEnabled(enabled);
  };

  // Interface language dropdown state
  const [showNativeDropdown, setShowNativeDropdown] = useState(false);
  const [nativeSearch, setNativeSearch] = useState('');

  // Group 2: My Languages modal state
  const [showAddLangModal, setShowAddLangModal] = useState(false);
  const [langToDelete, setLangToDelete] = useState<string | null>(null);
  const [isDeletingLang, setIsDeletingLang] = useState(false);

  // Group 3: Active Profile modal state
  const [showTanaManagerModal, setShowTanaManagerModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Group 4: Admin modal state
  const [showAdminResetModal, setShowAdminResetModal] = useState(false);
  const [adminConfirmInput, setAdminConfirmInput] = useState('');

  // Sync state if user prop changes
  useEffect(() => {
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setUsername(user.username || '');
  }, [user.firstName, user.lastName, user.username]);

  const handleSaveAccountInfo = () => {
    onUpdateUser({
      ...user,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
    });
    setIsAccountSaved(true);
    setTimeout(() => setIsAccountSaved(false), 2500);
  };

  const handleNativeLanguageChange = (langCode: string) => {
    onUpdateUser({ ...user, nativeLanguage: langCode });
    setShowNativeDropdown(false);
    setNativeSearch('');
  };

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }
    onUpdateUser({ ...user, reminderEnabled: enabled });
  };

  const handleTimeChange = (time: string) => {
    onUpdateUser({ ...user, reminderTime: time });
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ user, vocabItems }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `raccoonary_backup_${user.activeProfileId}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    let csv = 'Term,Translation,SourceLang,TargetLang,Box,Origin\n';
    vocabItems.forEach((i) => {
      csv += `"${i.term}","${i.translation}","${i.sourceLang}","${i.targetLang}",${i.box},"${i.origin}"\n`;
    });
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `raccoonary_vocab_${user.activeProfileId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const confirmDeleteLanguageProfile = async () => {
    if (!langToDelete) return;
    setIsDeletingLang(true);
    try {
      await onDeleteLanguageProfile(langToDelete);
      setLangToDelete(null);
    } catch (e) {
      console.error('Failed to delete profile:', e);
    } finally {
      setIsDeletingLang(false);
    }
  };

  const activeTargetLang = TARGET_LANGUAGES.find((l) => l.code === user.activeProfileId) || {
    code: user.activeProfileId || 'en',
    name: TARGET_LANGUAGES.find((l) => l.code === user.activeProfileId)?.name || user.activeProfileId?.toUpperCase() || 'Lingua',
    flag: '🌐',
  };

  const currentNativeLang = NATIVE_LANGUAGES.find((l) => l.code === (user.nativeLanguage || 'it')) || {
    code: 'it',
    name: 'Italiano',
    flag: '🇮🇹',
  };

  const filteredNativeLangs = NATIVE_LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(nativeSearch.toLowerCase()) || l.code.toLowerCase().includes(nativeSearch.toLowerCase())
  );

  const availableLanguagesToAdd = TARGET_LANGUAGES.filter((l) => !userProfiles.includes(l.code));

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-8 pb-32">
      {/* Header Banner */}
      <div className="bento-card flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
        <Mascot pose="greeting" size={85} />
        <div>
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start mb-2">
            <span className="badge-leaf">Pannello Impostazioni</span>
            {isAdmin && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#3A2B22] text-[#F2E8D5] font-mono shadow-xs">
                👑 Admin
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22]">
            {t ? t('nav.profile') : 'Opzioni & Profilo'}
          </h1>
          <p className="text-xs sm:text-sm text-[#3A2B22]/70 font-medium">
            Gestisci il tuo account, i profili di studio e la lingua dell'interfaccia.
          </p>
        </div>
      </div>

      {/* ==================== 1. ACCOUNT ==================== */}
      <section className="bento-card space-y-5">
        <div className="flex items-center justify-between border-b border-[#6B7C4F]/15 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-[#6B7C4F]">
              1. Account Utente
            </h2>
          </div>
          {isAdmin && (
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#3A2B22] text-[#F2E8D5]">
              Admin
            </span>
          )}
        </div>

        {/* Read-Only Google Info Header */}
        <div className="p-3.5 rounded-2xl bg-[#F2E8D5]/60 border border-[#6B7C4F]/20 flex items-center gap-3">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt="Google Avatar"
              className="w-12 h-12 rounded-full border-2 border-[#6B7C4F] object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#6B7C4F] text-white flex items-center justify-center font-bold text-lg font-display">
              {(currentUserEmail || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#3A2B22]/60 uppercase tracking-wider">Account Autenticato</div>
            <div className="text-sm font-bold text-[#3A2B22] truncate">
              {currentUser?.displayName || currentUserEmail || 'Utente Google'}
            </div>
            {currentUserEmail && <div className="text-xs text-[#3A2B22]/70 font-mono truncate">{currentUserEmail}</div>}
          </div>
        </div>

        {/* Editable User Fields */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#3A2B22] mb-1">Nome</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Il tuo nome"
                className="w-full p-3 rounded-xl bg-white border border-[#6B7C4F]/30 text-xs font-medium text-[#3A2B22] focus:border-[#6B7C4F] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3A2B22] mb-1">Cognome</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Il tuo cognome"
                className="w-full p-3 rounded-xl bg-white border border-[#6B7C4F]/30 text-xs font-medium text-[#3A2B22] focus:border-[#6B7C4F] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3A2B22] mb-1">Nome Utente</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full p-3 rounded-xl bg-white border border-[#6B7C4F]/30 text-xs font-medium text-[#3A2B22] focus:border-[#6B7C4F] focus:outline-none font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSaveAccountInfo}
              className="py-2.5 px-5 rounded-xl bg-[#6B7C4F] hover:bg-[#586740] text-white text-xs font-bold font-display shadow-xs transition-all cursor-pointer"
            >
              Salva dati account
            </button>
            {isAccountSaved && <span className="text-xs font-bold text-green-700 animate-fade-in">✓ Salvato!</span>}
          </div>

          {/* Tutorial Restart Button */}
          {onRestartTutorial && (
            <div className="pt-3 border-t border-[#6B7C4F]/10 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-xs text-[#3A2B22]">Tutorial guidato con Rocky</div>
                <div className="text-[11px] text-[#3A2B22]/65 font-medium">Rivivi la panoramica delle sezioni della tana</div>
              </div>
              <button
                type="button"
                onClick={onRestartTutorial}
                id="btn-restart-tutorial"
                className="py-2 px-3.5 rounded-xl bg-[#6B7C4F]/10 hover:bg-[#6B7C4F] hover:text-white text-xs font-bold text-[#6B7C4F] transition-all cursor-pointer border border-[#6B7C4F]/20 flex items-center gap-1.5 shrink-0"
              >
                <span>🦝</span>
                <span>Rivedi il tutorial</span>
              </button>
            </div>
          )}
        </div>

        {/* Interface Language Selector (Searchable) */}
        <div className="border-t border-[#6B7C4F]/15 pt-4 space-y-2">
          <label className="block text-xs font-bold text-[#3A2B22] uppercase tracking-wider">
            🌐 Lingua dell'interfaccia (Spoken Language)
          </label>
          <p className="text-xs text-[#3A2B22]/70 font-medium">
            Scegli la lingua con cui l'app ti parla, traduce e spiega le regole di grammatica.
          </p>

          <div className="relative">
            <button
              onClick={() => setShowNativeDropdown(!showNativeDropdown)}
              className="w-full p-3.5 rounded-2xl bg-white border-2 border-[#6B7C4F]/30 text-xs font-bold text-[#3A2B22] flex items-center justify-between hover:border-[#6B7C4F] transition-all cursor-pointer shadow-xs"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{currentNativeLang.flag}</span>
                <span>{currentNativeLang.name}</span>
              </span>
              <span>▼</span>
            </button>

            {showNativeDropdown && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white border-2 border-[#6B7C4F] rounded-2xl p-3 shadow-xl z-30 space-y-2 max-h-60 overflow-y-auto">
                <input
                  type="text"
                  value={nativeSearch}
                  onChange={(e) => setNativeSearch(e.target.value)}
                  placeholder="Cerca lingua..."
                  className="w-full p-2.5 rounded-xl bg-[#F2E8D5]/50 border border-[#6B7C4F]/30 text-xs font-bold text-[#3A2B22] focus:outline-none"
                  autoFocus
                />
                <div className="space-y-1">
                  {filteredNativeLangs.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleNativeLanguageChange(l.code)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        l.code === user.nativeLanguage ? 'bg-[#6B7C4F] text-white' : 'hover:bg-[#F2E8D5]/60 text-[#3A2B22]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.name}</span>
                      </span>
                      {l.code === user.nativeLanguage && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sound Effects Toggle */}
        <div className="border-t border-[#6B7C4F]/15 pt-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#3A2B22] flex items-center gap-1.5">
              <span>🔊</span>
              <span>Effetti sonori</span>
            </div>
            <p className="text-[11px] text-[#3A2B22]/70 font-medium mt-0.5">
              Attiva o disattiva il feedback audio durante gli esercizi e le risposte.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleSound(!soundActive)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              soundActive ? 'bg-[#6B7C4F]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                soundActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Logout Action */}
        <div className="border-t border-[#6B7C4F]/15 pt-4">
          <button
            onClick={onLogout}
            className="w-full py-3.5 rounded-2xl bg-white text-[#3A2B22] border-2 border-[#3A2B22]/15 font-bold font-display text-xs hover:border-[#6B7C4F] hover:bg-gray-50 transition-all text-center cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <span>🚪</span>
            <span>Esci dall'account</span>
          </button>
        </div>
      </section>

      {/* ==================== 2. LE MIE LINGUE ==================== */}
      <section className="bento-card space-y-4">
        <div className="flex items-center justify-between border-b border-[#6B7C4F]/15 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌍</span>
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-[#6B7C4F]">
              2. Le mie lingue ({userProfiles.length})
            </h2>
          </div>
          <button
            onClick={() => setShowAddLangModal(true)}
            className="py-1.5 px-3 rounded-xl bg-[#6B7C4F] hover:bg-[#586740] text-white text-xs font-extrabold font-display shadow-xs transition-all cursor-pointer flex items-center gap-1"
          >
            <span>+</span>
            <span>Aggiungi lingua</span>
          </button>
        </div>

        <p className="text-xs text-[#3A2B22]/70 font-medium leading-relaxed">
          Puoi studiare più lingue contemporaneamente. Seleziona una lingua per attivarla oppure aggiungine una nuova.
        </p>

        <div className="space-y-2.5">
          {userProfiles.map((langCode) => {
            const targetInfo = TARGET_LANGUAGES.find((l) => l.code === langCode) || {
              code: langCode,
              name: langCode.toUpperCase(),
              flag: '🌐',
            };
            const isActive = langCode === user.activeProfileId;

            return (
              <div
                key={langCode}
                className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-[#6B7C4F]/10 border-[#6B7C4F] shadow-xs'
                    : 'bg-white border-[#3A2B22]/10 hover:border-[#6B7C4F]/50 cursor-pointer'
                }`}
                onClick={() => {
                  if (!isActive) onSwitchProfile(langCode);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{targetInfo.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#3A2B22] font-display">{targetInfo.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-[#6B7C4F] text-white text-[10px] font-extrabold tracking-wider uppercase">
                          Attivo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#3A2B22]/60 font-medium">
                      {isActive
                        ? `Livello: ${user.currentLevel || 'Nessun test fatto'} • ${user.streakCount || 0} 🔥 streak`
                        : 'Tocca per attivare questo profilo'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSwitchProfile(langCode);
                      }}
                      className="py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-[#6B7C4F] hover:text-white text-xs font-bold text-[#3A2B22] transition-colors"
                    >
                      Seleziona
                    </button>
                  )}

                  {/* Delete Icon - disabled if only 1 profile exists */}
                  {userProfiles.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLangToDelete(langCode);
                      }}
                      title="Elimina questo profilo lingua"
                      className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== 3. PROFILO ATTIVO ==================== */}
      <section className="bento-card space-y-5 border-2 border-[#6B7C4F]/40 bg-[#6B7C4F]/5">
        <div className="flex items-center justify-between border-b border-[#6B7C4F]/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeTargetLang.flag}</span>
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-[#6B7C4F]">
              3. Profilo attivo — {activeTargetLang.name}
            </h2>
          </div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#6B7C4F] text-white">
            {activeTargetLang.code.toUpperCase()}
          </span>
        </div>

        <p className="text-xs text-[#3A2B22]/70 font-medium leading-relaxed">
          Tutte le impostazioni e le azioni di questa sezione si applicano <strong>esclusivamente</strong> al profilo di studio attualmente attivo (<strong>{activeTargetLang.name}</strong>).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Daily Reminder Settings */}
          <div className="p-4 rounded-2xl bg-white border border-[#6B7C4F]/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-[#3A2B22] uppercase tracking-wider flex items-center gap-1.5">
                  <span>⏰</span> Promemoria Notifiche Push
                </div>
                <div className="text-xs text-[#3A2B22]/60 font-medium">Notifica di ripasso quotidiano</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={user.reminderEnabled}
                  onChange={(e) => handleToggleReminder(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6B7C4F]"></div>
              </label>
            </div>

            {user.reminderEnabled && (
              <div className="space-y-3 border-t border-[#6B7C4F]/10 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3A2B22]">Orario quotidiano:</span>
                  <input
                    type="time"
                    value={user.reminderTime || '20:00'}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="p-2 rounded-xl bg-[#F2E8D5]/50 border border-[#6B7C4F]/30 text-xs font-bold text-[#3A2B22]"
                  />
                </div>

                {/* Status & Test Button */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] font-medium text-[#3A2B22]/70">
                    Stato: {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? '🟢 Attive' : '🟡 Richiede permesso'}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const perm = await requestNotificationPermission();
                      if (perm === 'granted') {
                        sendRaccoonNotification('🦝 Raccoonary — Notifiche Attive!', {
                          body: `Promemoria impostato per le ${user.reminderTime || '20:00'}. Ti ricorderemo di raccogliere le tue ghiande!`,
                        });
                      } else {
                        alert('Si prega di abilitare i permessi di notifica nelle impostazioni del browser.');
                      }
                    }}
                    className="py-1.5 px-3 rounded-xl bg-[#6B7C4F]/10 hover:bg-[#6B7C4F] hover:text-white text-[11px] font-bold text-[#6B7C4F] transition-all cursor-pointer"
                  >
                    Invia prova 🔔
                  </button>
                </div>

                {/* iOS PWA Guidance */}
                {typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
                  <p className="text-[10px] text-[#3A2B22]/60 bg-amber-50 p-2 rounded-xl border border-amber-200/60 leading-tight">
                    📲 <strong>Su iOS Safari:</strong> per ricevere notifiche push, aggiungi Raccoonary alla Schermata Home (tasto Condividi ➔ Aggiungi a schermata Home).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Manage Tana (Vocabulary) */}
          <div className="p-4 rounded-2xl bg-white border border-[#6B7C4F]/20 space-y-3 flex flex-col justify-between">
            <div>
              <div className="font-bold text-xs text-[#3A2B22] uppercase tracking-wider">📦 Gestisci la Tana</div>
              <div className="text-xs text-[#3A2B22]/60 font-medium">{vocabItems.length} parole salvate per {activeTargetLang.name}</div>
            </div>
            <button
              onClick={() => setShowTanaManagerModal(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-[#6B7C4F] hover:bg-[#586740] text-white text-xs font-bold font-display transition-all cursor-pointer shadow-xs"
            >
              Apri gestione tana ({vocabItems.length})
            </button>
          </div>
        </div>

        {/* Reset Progress for active profile */}
        <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-red-700 uppercase tracking-wider">⚠️ Reset Progressi {activeTargetLang.name}</div>
              <div className="text-xs text-[#3A2B22]/70 font-medium">
                Azzera parole, grammatica e test solo per questo profilo
              </div>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-display shadow-xs transition-all cursor-pointer"
            >
              Reset {activeTargetLang.name}
            </button>
          </div>
        </div>
      </section>

      {/* ==================== 4. STRUMENTI ADMIN ==================== */}
      {isAdmin && (
        <section className="bento-card space-y-3 border-2 border-[#C99A3D]/50 bg-[#C99A3D]/5">
          <div className="flex items-center justify-between border-b border-[#C99A3D]/20 pb-2">
            <h2 className="text-xs font-bold font-display uppercase tracking-wider text-[#C99A3D] flex items-center gap-1.5">
              <span>🛠️</span> 4. Strumenti Admin
            </h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#C99A3D] text-white">
              Riservato Admin
            </span>
          </div>
          <p className="text-xs text-[#3A2B22]/75 font-medium leading-relaxed">
            Strumenti avanzati di collaudo per l'amministratore. Effettua il reset completo di test su Firestore e in locale.
          </p>
          <button
            onClick={() => {
              setAdminConfirmInput('');
              setShowAdminResetModal(true);
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#C99A3D] hover:bg-[#C99A3D]/90 text-white font-extrabold font-display text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🔄</span> Reset completo dati di test admin
          </button>
        </section>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Modal: Add New Language Profile */}
      {showAddLangModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-[#6B7C4F] shadow-2xl">
            <Mascot pose="happy" size={90} />
            <h3 className="text-lg font-bold font-display text-[#3A2B22]">Aggiungi una nuova lingua</h3>
            <p className="text-xs text-[#3A2B22]/80 leading-relaxed">
              Scegli la lingua che desideri iniziare a studiare:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto text-left pr-1">
              {availableLanguagesToAdd.length > 0 ? (
                availableLanguagesToAdd.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setShowAddLangModal(false);
                      onAddNewLanguage(lang.code);
                    }}
                    className="w-full p-3 rounded-2xl bg-[#F2E8D5]/50 hover:bg-[#6B7C4F] hover:text-white border border-[#6B7C4F]/30 text-xs font-bold text-[#3A2B22] flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    <span>+</span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-xs font-bold text-[#3A2B22]/60 text-center">
                  Hai già aggiunto tutte le lingue disponibili! 🌟
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAddLangModal(false)}
              className="w-full py-3 rounded-2xl bg-gray-100 text-[#3A2B22] font-bold text-xs"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Modal: Delete Language Profile Confirmation */}
      {langToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-red-500 shadow-2xl">
            <Mascot pose="thinking" size={90} />
            <h3 className="text-lg font-bold font-display text-[#3A2B22]">
              Eliminare la lingua {TARGET_LANGUAGES.find((l) => l.code === langToDelete)?.name || langToDelete}?
            </h3>
            <p className="text-xs text-[#3A2B22]/80 leading-relaxed">
              ⚠️ <strong>Azione irreversibile:</strong> verranno cancellate definitivamente tutte le parole salvate in tana, la grammatica, le letture e i test di livello per il profilo <strong>{TARGET_LANGUAGES.find((l) => l.code === langToDelete)?.name || langToDelete}</strong>.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                disabled={isDeletingLang}
                onClick={() => setLangToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-[#3A2B22] font-bold text-xs"
              >
                Annulla
              </button>
              <button
                disabled={isDeletingLang}
                onClick={confirmDeleteLanguageProfile}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-xs disabled:opacity-50"
              >
                {isDeletingLang ? 'Eliminazione...' : 'Sì, elimina profilo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tana Manager Drawer / Dialog */}
      {showTanaManagerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#F2E8D5] rounded-3xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4 border-2 border-[#6B7C4F]">
            <div className="flex items-center justify-between border-b border-[#6B7C4F]/20 pb-3">
              <h3 className="text-base font-bold font-display text-[#3A2B22]">
                Gestione Tana — {activeTargetLang.name} {activeTargetLang.flag}
              </h3>
              <button
                onClick={() => setShowTanaManagerModal(false)}
                className="w-8 h-8 rounded-full bg-white text-[#3A2B22] font-bold text-xs shadow-xs"
              >
                ✕
              </button>
            </div>

            {/* Export buttons inside Tana Manager */}
            <div className="grid grid-cols-2 gap-2 pb-2">
              <button
                onClick={handleExportCsv}
                className="py-2.5 px-3 rounded-xl bg-white border border-[#6B7C4F]/30 text-xs font-bold text-[#3A2B22] hover:bg-[#6B7C4F] hover:text-white transition-all cursor-pointer"
              >
                Esporta CSV 📊
              </button>
              <button
                onClick={handleExportJson}
                className="py-2.5 px-3 rounded-xl bg-white border border-[#6B7C4F]/30 text-xs font-bold text-[#3A2B22] hover:bg-[#6B7C4F] hover:text-white transition-all cursor-pointer"
              >
                Esporta JSON 📁
              </button>
            </div>

            <TanaManager vocabItems={vocabItems} onDeleteItem={onDeleteItem} />
          </div>
        </div>
      )}

      {/* Modal: Active Profile Reset Confirmation */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-red-400">
            <Mascot pose="thinking" size={90} />
            <h3 className="text-lg font-bold font-display text-[#3A2B22]">
              Reset profilo {activeTargetLang.name}?
            </h3>
            <p className="text-xs text-[#3A2B22]/80 leading-relaxed">
              Questa azione cancellerà tutte le parole in tana, la grammatica e i test solo per la lingua <strong>{activeTargetLang.name}</strong>. Gli altri profili lingua rimarranno intatti.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-[#3A2B22] font-bold text-xs"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  onResetData();
                }}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-xs"
              >
                Sì, cancella {activeTargetLang.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Reset Confirmation */}
      {showAdminResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-[#C99A3D]">
            <Mascot pose="thinking" size={90} />
            <h3 className="text-lg font-bold font-display text-[#3A2B22]">
              Reset Completo Dati Admin
            </h3>
            <p className="text-xs text-[#3A2B22]/80 leading-relaxed">
              Azzeramento distruttivo per test admin. Verranno eliminati tutti i documenti di vocaboli, grammatica, letture e test di livello su Firestore e in locale.
            </p>
            <p className="text-xs font-bold text-[#3A2B22]">
              Digita <span className="text-red-600 font-mono underline">RESET</span> per confermare:
            </p>
            <input
              type="text"
              value={adminConfirmInput}
              onChange={(e) => setAdminConfirmInput(e.target.value)}
              placeholder="Scrivi RESET..."
              className="w-full p-3 rounded-xl bg-[#F2E8D5]/50 border-2 border-[#6B7C4F]/30 focus:border-[#C99A3D] focus:outline-none text-center font-bold text-sm text-[#3A2B22]"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowAdminResetModal(false);
                  setAdminConfirmInput('');
                }}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-[#3A2B22] font-bold text-xs"
              >
                Annulla
              </button>
              <button
                disabled={adminConfirmInput.trim() !== 'RESET'}
                onClick={() => {
                  setShowAdminResetModal(false);
                  setAdminConfirmInput('');
                  if (onAdminResetData) {
                    onAdminResetData();
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Conferma Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
