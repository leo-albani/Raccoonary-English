import React, { useState, useEffect } from 'react';
import { Mascot } from '../mascot/Mascot';
import { UserProfile, VocabItem, ExerciseError, Gender } from '../types';
import { TanaManager } from '../components/TanaManager';
import { auth, isUserAdmin } from '../services/firebase';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';
import { INTEREST_OPTIONS, INTEREST_ICONS } from '../data/interests';
import { isSoundEnabled, setSoundEnabled } from '../services/sound';
import { getTranslation } from '../i18n/translations';
import {
  getNotificationStatus,
  requestNotificationPermission,
  sendRaccoonNotification,
  setupDailyReminderTimer,
  registerPushNotification,
} from '../services/notifications';

interface SettingsProps {
  user: UserProfile;
  userProfiles: string[];
  vocabItems: VocabItem[];
  exerciseErrors?: ExerciseError[];
  onUpdateUser: (updated: UserProfile) => void;
  onSwitchProfile: (targetLanguage: string) => void;
  onAddNewLanguage: (targetLanguage: string) => void;
  onDeleteLanguageProfile: (targetLanguage: string) => Promise<void>;
  onDeleteItem: (itemId: string) => void;
  onDeleteExerciseError?: (errorId: string) => void;
  onResetData: () => void;
  onAdminResetData?: () => void;
  onAdminSimulateNewUser?: () => void;
  onLogout: () => void;
  onRestartTutorial?: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Settings: React.FC<SettingsProps> = ({
  user,
  userProfiles = ['en'],
  vocabItems,
  exerciseErrors = [],
  onUpdateUser,
  onSwitchProfile,
  onAddNewLanguage,
  onDeleteLanguageProfile,
  onDeleteItem,
  onDeleteExerciseError,
  onResetData,
  onAdminResetData,
  onAdminSimulateNewUser,
  onLogout,
  onRestartTutorial,
  t,
}) => {
  const tr = (key: string, params?: Record<string, string | number>) =>
    t ? t(key, params) : getTranslation(key, null, params);

  // Group 1: Account state
  const currentUser = auth?.currentUser;
  const currentUserEmail = currentUser?.email;
  const isAdmin = isUserAdmin(currentUserEmail);

  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [username, setUsername] = useState(user.username || '');
  const [gender, setGender] = useState<Gender>(user.gender || 'undisclosed');
  const [interessi, setInteressi] = useState<string[]>(user.interessi || []);
  const [isAccountSaved, setIsAccountSaved] = useState(false);
  const [soundActive, setSoundActive] = useState<boolean>(isSoundEnabled());

  const handleToggleSound = (enabled: boolean) => {
    setSoundActive(enabled);
    setSoundEnabled(enabled);
  };

  const toggleInterest = (interest: string) => {
    setInteressi((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
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
  const [showIosPwaModal, setShowIosPwaModal] = useState(false);
  const [isRegisteringReminder, setIsRegisteringReminder] = useState(false);

  // Group 4: Admin modal state
  const [showAdminResetModal, setShowAdminResetModal] = useState(false);
  const [adminConfirmInput, setAdminConfirmInput] = useState('');
  const [showSimulateNewUserModal, setShowSimulateNewUserModal] = useState(false);
  const [simulateNewUserConfirmInput, setSimulateNewUserConfirmInput] = useState('');
  const [isSimulatingNewUser, setIsSimulatingNewUser] = useState(false);

  // Sync state if user prop changes
  useEffect(() => {
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setUsername(user.username || '');
    setGender(user.gender || 'undisclosed');
    setInteressi(user.interessi || []);
  }, [user.firstName, user.lastName, user.username, user.gender, user.interessi]);

  const handleSaveAccountInfo = () => {
    onUpdateUser({
      ...user,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
      gender: gender || 'undisclosed',
      interessi,
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
    if (enabled) {
      const status = getNotificationStatus();
      if (status.isIOSDevice && !status.isStandalonePWA) {
        setShowIosPwaModal(true);
        return;
      }

      setIsRegisteringReminder(true);
      const reg = await registerPushNotification(user.userId, user.activeProfileId);
      setIsRegisteringReminder(false);

      if (reg.success) {
        onUpdateUser({ ...user, reminderEnabled: true, fcmToken: reg.token || user.fcmToken });
      } else {
        if (reg.reason === 'ios_not_standalone') {
          setShowIosPwaModal(true);
        } else {
          // Still allow enabling reminder setting locally
          onUpdateUser({ ...user, reminderEnabled: true });
        }
      }
    } else {
      onUpdateUser({ ...user, reminderEnabled: false });
    }
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
            <span className="badge-leaf">{tr('settings.headerBadge')}</span>
            {isAdmin && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#3A2B22] text-[#F2E8D5] font-mono shadow-xs">
                👑 Admin
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#3A2B22]">
            {tr('nav.profile')}
          </h1>
          <p className="text-xs sm:text-sm text-[#3A2B22]/70 font-medium">
            {tr('settings.headerSub')}
          </p>
        </div>
      </div>

      {/* ==================== 1. ACCOUNT ==================== */}
      <section className="bento-card space-y-5">
        <div className="flex items-center justify-between border-b border-[#6B7C4F]/15 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-[#6B7C4F]">
              {tr('settings.section1Title')}
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
            <div className="text-xs font-bold text-[#3A2B22]/60 uppercase tracking-wider">{tr('settings.authHeader')}</div>
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
              <label className="block text-xs font-bold text-[#3A2B22] mb-1">{tr('settings.firstNameLabel')}</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={tr('settings.firstNamePlaceholder')}
                className="w-full p-3 rounded-xl bg-white border border-[#6B7C4F]/30 text-xs font-medium text-[#3A2B22] focus:border-[#6B7C4F] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3A2B22] mb-1">{tr('settings.lastNameLabel')}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={tr('settings.lastNamePlaceholder')}
                className="w-full p-3 rounded-xl bg-white border border-[#6B7C4F]/30 text-xs font-medium text-[#3A2B22] focus:border-[#6B7C4F] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3A2B22] mb-1">{tr('settings.usernameLabel')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full p-3 rounded-xl bg-white border border-[#6B7C4F]/30 text-xs font-medium text-[#3A2B22] focus:border-[#6B7C4F] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3A2B22] mb-1">{tr('settings.genderLabel')}</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGender('M')}
                className={`py-2.5 px-2 rounded-xl border font-display text-xs font-bold transition-all cursor-pointer text-center ${
                  gender === 'M'
                    ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                    : 'border-[#6B7C4F]/30 bg-white hover:border-[#6B7C4F] text-[#3A2B22]'
                }`}
              >
                {tr('settings.genderM')}
              </button>
              <button
                type="button"
                onClick={() => setGender('F')}
                className={`py-2.5 px-2 rounded-xl border font-display text-xs font-bold transition-all cursor-pointer text-center ${
                  gender === 'F'
                    ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                    : 'border-[#6B7C4F]/30 bg-white hover:border-[#6B7C4F] text-[#3A2B22]'
                }`}
              >
                {tr('settings.genderF')}
              </button>
              <button
                type="button"
                onClick={() => setGender('undisclosed')}
                className={`py-2.5 px-2 rounded-xl border font-display text-xs font-bold transition-all cursor-pointer text-center ${
                  gender === 'undisclosed'
                    ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                    : 'border-[#6B7C4F]/30 bg-white hover:border-[#6B7C4F] text-[#3A2B22]'
                }`}
              >
                {tr('settings.genderUndisclosed')}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#3A2B22]">
                I tuoi interessi
              </label>
              <span className="text-[11px] text-[#3A2B22]/60 font-medium">
                {interessi.length > 0 ? `${interessi.length} selezionati` : 'Nessuno selezionato'}
              </span>
            </div>
            <p className="text-[11px] text-[#3A2B22]/65 mb-2">
              Seleziona i tuoi temi preferiti per personalizzare le letture nel Sentiero.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = interessi.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold font-display transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-[#6B7C4F] bg-[#6B7C4F] text-white shadow-xs'
                        : 'border-[#6B7C4F]/30 bg-white hover:border-[#6B7C4F] text-[#3A2B22]'
                    }`}
                  >
                    <span>{INTEREST_ICONS[interest] || '✨'}</span>
                    <span>{interest}</span>
                    {isSelected && <span className="text-[10px] font-black ml-0.5">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSaveAccountInfo}
              className="py-2.5 px-5 rounded-xl bg-[#6B7C4F] hover:bg-[#586740] text-white text-xs font-bold font-display shadow-xs transition-all cursor-pointer"
            >
              {tr('settings.saveAccountBtn')}
            </button>
            {isAccountSaved && <span className="text-xs font-bold text-green-700 animate-fade-in">{tr('settings.savedCheck')}</span>}
          </div>

          {/* Tutorial Restart Button */}
          {onRestartTutorial && (
            <div className="pt-3 border-t border-[#6B7C4F]/10 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-xs text-[#3A2B22]">{tr('settings.tutorialTitle')}</div>
                <div className="text-[11px] text-[#3A2B22]/65 font-medium">{tr('settings.tutorialSub')}</div>
              </div>
              <button
                type="button"
                onClick={onRestartTutorial}
                id="btn-restart-tutorial"
                className="py-2 px-3.5 rounded-xl bg-[#6B7C4F]/10 hover:bg-[#6B7C4F] hover:text-white text-xs font-bold text-[#6B7C4F] transition-all cursor-pointer border border-[#6B7C4F]/20 flex items-center gap-1.5 shrink-0"
              >
                <span>🦝</span>
                <span>{tr('settings.reviewTutorial')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Interface Language Selector (Searchable) */}
        <div className="border-t border-[#6B7C4F]/15 pt-4 space-y-2">
          <label className="block text-xs font-bold text-[#3A2B22] uppercase tracking-wider">
            🌐 {tr('settings.interfaceLangTitle')}
          </label>
          <p className="text-xs text-[#3A2B22]/70 font-medium">
            {tr('settings.interfaceLangSub')}
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
                  placeholder={tr('settings.searchLangPlaceholder')}
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
              <span>{tr('settings.soundEffectsTitle')}</span>
            </div>
            <p className="text-[11px] text-[#3A2B22]/70 font-medium mt-0.5">
              {tr('settings.soundEffectsSub')}
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
            <span>{tr('settings.logoutBtn')}</span>
          </button>
        </div>
      </section>

      {/* ==================== 2. LE MIE LINGUE ==================== */}
      <section className="bento-card space-y-4">
        <div className="flex items-center justify-between border-b border-[#6B7C4F]/15 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌍</span>
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-[#6B7C4F]">
              {tr('settings.section2Title', { count: userProfiles.length })}
            </h2>
          </div>
          <button
            onClick={() => setShowAddLangModal(true)}
            className="py-1.5 px-3 rounded-xl bg-[#6B7C4F] hover:bg-[#586740] text-white text-xs font-extrabold font-display shadow-xs transition-all cursor-pointer flex items-center gap-1"
          >
            <span>+</span>
            <span>{tr('settings.addLanguageBtn')}</span>
          </button>
        </div>

        <p className="text-xs text-[#3A2B22]/70 font-medium leading-relaxed">
          {tr('settings.section2Sub')}
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
                          {tr('settings.activeBadge')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#3A2B22]/60 font-medium">
                      {isActive
                        ? tr('settings.activeLangSub', { level: user.currentLevel || tr('settings.noTestLevel'), streak: user.streakCount || 0 })
                        : tr('settings.tapToActivate')}
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
                      className="py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-[#6B7C4F] hover:text-white text-xs font-bold text-[#3A2B22] transition-colors cursor-pointer"
                    >
                      {tr('settings.selectBtn')}
                    </button>
                  )}

                  {/* Delete Icon - disabled if only 1 profile exists */}
                  {userProfiles.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLangToDelete(langCode);
                      }}
                      title={tr('settings.deleteProfileTitle')}
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
              {tr('settings.section3Title', { name: activeTargetLang.name })}
            </h2>
          </div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#6B7C4F] text-white">
            {activeTargetLang.code.toUpperCase()}
          </span>
        </div>

        <p className="text-xs text-[#3A2B22]/70 font-medium leading-relaxed">
          {tr('settings.section3Sub', { name: activeTargetLang.name })}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Daily Reminder Settings */}
          <div className="p-4 rounded-2xl bg-white border border-[#6B7C4F]/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-[#3A2B22] uppercase tracking-wider flex items-center gap-1.5">
                  <span>⏰</span> {tr('settings.reminderTitle')}
                </div>
                <div className="text-xs text-[#3A2B22]/60 font-medium">{tr('settings.reminderSub')}</div>
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
                  <span className="text-xs font-bold text-[#3A2B22]">{tr('settings.dailyTimeLabel')}</span>
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
                    {tr('settings.statusLabel', { status: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? tr('settings.statusActive') : tr('settings.statusNeedsPerm') })}
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
                    {tr('settings.sendTestNotification')} 🔔
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
              <div className="font-bold text-xs text-[#3A2B22] uppercase tracking-wider">📦 {tr('settings.manageTanaTitle')}</div>
              <div className="text-xs text-[#3A2B22]/60 font-medium">{tr('settings.savedCount', { count: vocabItems.length, name: activeTargetLang.name })}</div>
            </div>
            <button
              onClick={() => setShowTanaManagerModal(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-[#6B7C4F] hover:bg-[#586740] text-white text-xs font-bold font-display transition-all cursor-pointer shadow-xs"
            >
              {tr('settings.openTanaManager', { count: vocabItems.length })}
            </button>
          </div>
        </div>

        {/* Reset Progress for active profile */}
        <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-red-700 uppercase tracking-wider">⚠️ {tr('settings.resetProfileTitle', { name: activeTargetLang.name })}</div>
              <div className="text-xs text-[#3A2B22]/70 font-medium">
                {tr('settings.resetProfileSub')}
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
            Strumenti avanzati di collaudo per l'amministratore. Effettua il reset dei dati di test del profilo attivo oppure simula il primissimo accesso di un nuovo utente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                setAdminConfirmInput('');
                setShowAdminResetModal(true);
              }}
              className="py-3 px-4 rounded-2xl bg-[#C99A3D] hover:bg-[#C99A3D]/90 text-white font-extrabold font-display text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🔄</span> Reset dati test admin
            </button>
            <button
              onClick={() => {
                setSimulateNewUserConfirmInput('');
                setShowSimulateNewUserModal(true);
              }}
              className="py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold font-display text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🚀</span> Simula nuovo utente (reset totale)
            </button>
          </div>
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

            <TanaManager
              vocabItems={vocabItems}
              exerciseErrors={exerciseErrors}
              onDeleteItem={onDeleteItem}
              onDeleteExerciseError={onDeleteExerciseError}
            />
          </div>
        </div>
      )}

      {/* Modal: iOS PWA Installation Guidance */}
      {showIosPwaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-[#6B7C4F]/30 shadow-xl">
            <Mascot pose="reading" size={90} />
            <h3 className="text-lg font-bold font-display text-[#3A2B22]">
              Aggiungi alla Schermata Home 📲
            </h3>
            <p className="text-xs text-[#3A2B22]/80 leading-relaxed text-left bg-[#F2E8D5]/40 p-3 rounded-2xl border border-[#6B7C4F]/20 space-y-2">
              <span>Su iPhone e iPad, per ricevere le notifiche push quotidiane di Raccoonary:</span>
              <br />
              <strong>1.</strong> Tocca il tasto <strong>Condividi</strong> in basso in Safari (l'icona quadrata con la freccia in su ⬆️).
              <br />
              <strong>2.</strong> Scorri verso il basso e seleziona <strong>"Aggiungi a schermata Home"</strong> ➕.
              <br />
              <strong>3.</strong> Apri Raccoonary dall'icona sulla Home per attivare i promemoria!
            </p>

            <button
              onClick={() => setShowIosPwaModal(false)}
              className="w-full py-3 rounded-2xl bg-[#6B7C4F] hover:bg-[#586740] text-white font-bold text-xs cursor-pointer shadow-md transition-all"
            >
              Ho capito 🦝
            </button>
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

      {/* Modal: Simulate New User Total Reset */}
      {showSimulateNewUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-red-600 shadow-2xl">
            <Mascot pose="thinking" size={90} />
            <h3 className="text-lg font-bold font-display text-[#3A2B22]">
              Simula Nuovo Utente (Reset Totale)
            </h3>
            <p className="text-xs text-[#3A2B22]/80 leading-relaxed">
              🚨 <strong>Azione distruttiva:</strong> Verrà eliminato l'intero documento <code className="bg-red-100 text-red-700 px-1 rounded font-bold">users/{user.userId}</code> e tutte le sottocollezioni collegate. L'app verrà riavviata al primissimo accesso (nome, lingua, onboarding e tour Rocky).
            </p>
            <p className="text-xs font-bold text-[#3A2B22]">
              Digita <span className="text-red-600 font-mono underline">RESET</span> per confermare:
            </p>
            <input
              type="text"
              value={simulateNewUserConfirmInput}
              onChange={(e) => setSimulateNewUserConfirmInput(e.target.value)}
              placeholder="Scrivi RESET..."
              className="w-full p-3 rounded-xl bg-[#F2E8D5]/50 border-2 border-[#6B7C4F]/30 focus:border-red-600 focus:outline-none text-center font-bold text-sm text-[#3A2B22]"
            />

            <div className="flex gap-2 pt-2">
              <button
                disabled={isSimulatingNewUser}
                onClick={() => {
                  setShowSimulateNewUserModal(false);
                  setSimulateNewUserConfirmInput('');
                }}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-[#3A2B22] font-bold text-xs cursor-pointer"
              >
                Annulla
              </button>
              <button
                disabled={simulateNewUserConfirmInput.trim() !== 'RESET' || isSimulatingNewUser}
                onClick={async () => {
                  setIsSimulatingNewUser(true);
                  if (onAdminSimulateNewUser) {
                    await onAdminSimulateNewUser();
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSimulatingNewUser ? 'Eliminazione...' : 'Conferma Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
