import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, VocabItem, ExerciseError, GrammarTopicProgress, SharedLanguagePairContent } from './types';
import {
  auth,
  fetchUserProfile,
  updateUserProfile,
  fetchVocabItems,
  saveVocabItem,
  bulkSaveVocabItems,
  deleteVocabItem,
  fetchExerciseErrors,
  saveExerciseError,
  deleteExerciseError,
  migrateLegacyMalformedVocabs,
  getLocalExerciseErrors,
  resetAllData,
  adminResetTestData,
  adminSimulateNewUser,
  getLocalUserProfile,
  getLocalVocabItems,
  logoutUser,
  getUserAccount,
  fetchGrammarProgress,
  saveGrammarProgressTopic,
  fetchReadingProgress,
  incrementReadingProgress,
  fetchUserProfiles,
  createNewLanguageProfile,
  switchActiveProfile,
  deleteLanguageProfile,
  fetchSharedContent,
  fetchUITranslations,
} from './services/firebase';
import { IT_TRANSLATIONS, getTranslation, isRTLLanguage } from './i18n/translations';
import { Mascot } from './mascot/Mascot';
import { onAuthStateChanged } from 'firebase/auth';

// Screens
import { Login } from './screens/Login';
import { ProfileSetup } from './screens/ProfileSetup';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Memorization } from './screens/Memorization';
import { Grammar } from './screens/Grammar';
import { Reading } from './screens/Reading';
import { Scenarios } from './screens/Scenarios';
import { Import } from './screens/Import';
import { Settings } from './screens/Settings';
import { LevelTest } from './screens/LevelTest';
import { Pronunciation } from './screens/Pronunciation';
import { TranslatorScreen } from './screens/TranslatorScreen';
import { Navigation, NavTab } from './components/Navigation';
import { GuidedTour } from './components/GuidedTour';
import { AmbientForestBackground } from './components/AmbientForestBackground';
import { setupDailyReminderTimer } from './services/notifications';

export function App() {
  const [userId, setUserId] = useState<string>('local_user');
  const [user, setUser] = useState<UserProfile>(getLocalUserProfile());
  const [vocabItems, setVocabItems] = useState<VocabItem[]>(getLocalVocabItems());
  const [exerciseErrors, setExerciseErrors] = useState<ExerciseError[]>(getLocalExerciseErrors());
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedGrammarTopicId, setSelectedGrammarTopicId] = useState<string | null>(null);
  const [showLevelTest, setShowLevelTest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [userProfiles, setUserProfiles] = useState<string[]>(['en']);
  const [sharedContent, setSharedContent] = useState<SharedLanguagePairContent | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState<boolean>(false);
  const [uiTranslationsMap, setUiTranslationsMap] = useState<Record<string, string>>(IT_TRANSLATIONS);
  const [isGeneratingUITranslations, setIsGeneratingUITranslations] = useState<boolean>(false);
  const [showGuidedTour, setShowGuidedTour] = useState<boolean>(false);
  const [showExitToast, setShowExitToast] = useState<boolean>(false);
  const lastBackPressRef = useRef<number>(0);
  const exitToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize history state on mount to prevent instant browser ejection
  useEffect(() => {
    try {
      window.history.replaceState({ screen: 'home' }, '');
      window.history.pushState({ screen: 'home' }, '');
    } catch (e) {}
  }, []);

  // Sync sub-screen changes into browser history
  useEffect(() => {
    try {
      if (currentTab !== 'home' || showLevelTest) {
        window.history.pushState({ screen: currentTab, showLevelTest }, '');
      }
    } catch (e) {}
  }, [currentTab, showLevelTest]);

  // Handle hardware / browser back button:
  // - On sub-screens: navigates back to Tana (Home)
  // - On Tana (Root): requires double-press within 2 seconds to exit, showing a toast
  useEffect(() => {
    const handlePopState = () => {
      // 1. If inside Level Test modal/screen, exit back to Home
      if (showLevelTest) {
        setShowLevelTest(false);
        try {
          window.history.pushState({ screen: 'home' }, '');
        } catch (e) {}
        return;
      }

      // 2. If in any secondary tab, return to Tana (Home)
      if (currentTab !== 'home') {
        setSelectedGrammarTopicId(null);
        setCurrentTab('home');
        try {
          window.history.pushState({ screen: 'home' }, '');
        } catch (e) {}
        return;
      }

      // 3. If ALREADY on Tana (Home/Root)
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        // Second press within 2s -> Allow exiting
        setShowExitToast(false);
        if (exitToastTimerRef.current) {
          clearTimeout(exitToastTimerRef.current);
        }
        window.history.back();
      } else {
        // First press on Tana -> Block exit, record time, and show toast
        lastBackPressRef.current = now;
        try {
          window.history.pushState({ screen: 'home' }, '');
        } catch (e) {}
        setShowExitToast(true);

        if (exitToastTimerRef.current) {
          clearTimeout(exitToastTimerRef.current);
        }
        exitToastTimerRef.current = setTimeout(() => {
          setShowExitToast(false);
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitToastTimerRef.current) {
        clearTimeout(exitToastTimerRef.current);
      }
    };
  }, [currentTab, showLevelTest]);

  const handleCompleteTour = async () => {
    setShowGuidedTour(false);
    const updated = { ...user, tutorialCompleted: true };
    setUser(updated);
    await updateUserProfile(updated);
  };

  const handleRestartTutorial = () => {
    setCurrentTab('home');
    setShowLevelTest(false);
    setShowGuidedTour(true);
  };

  // Auto-launch guided tour once on Home after onboarding if not completed
  useEffect(() => {
    if (
      isAuthenticated &&
      !needsProfileSetup &&
      user.onboardingCompleted &&
      !user.tutorialCompleted &&
      currentTab === 'home' &&
      !showLevelTest &&
      !isLoading &&
      !isGeneratingContent &&
      !isGeneratingUITranslations
    ) {
      setShowGuidedTour(true);
    } else if (currentTab !== 'home' || showLevelTest) {
      setShowGuidedTour(false);
    }
  }, [
    isAuthenticated,
    needsProfileSetup,
    user.onboardingCompleted,
    user.tutorialCompleted,
    currentTab,
    showLevelTest,
    isLoading,
    isGeneratingContent,
    isGeneratingUITranslations,
  ]);

  // Helper function for translations
  const t = (key: string, params?: Record<string, string | number>) =>
    getTranslation(key, uiTranslationsMap, params);

  // Load UI translations for user's native language & update RTL direction
  useEffect(() => {
    const loadUITranslations = async () => {
      const nativeLang = user.nativeLanguage || 'it';

      if (isRTLLanguage(nativeLang)) {
        document.documentElement.dir = 'rtl';
      } else {
        document.documentElement.dir = 'ltr';
      }

      setIsGeneratingUITranslations(true);
      try {
        const res = await fetchUITranslations(nativeLang);
        if (res && res.strings) {
          setUiTranslationsMap(res.strings);
        } else {
          setUiTranslationsMap(IT_TRANSLATIONS);
        }
      } catch (e) {
        console.error('Failed to load UI translations:', e);
        setUiTranslationsMap(IT_TRANSLATIONS);
      } finally {
        setIsGeneratingUITranslations(false);
      }
    };

    if (isAuthenticated && !needsProfileSetup && user.nativeLanguage) {
      loadUITranslations();
    }
  }, [user.nativeLanguage, isAuthenticated, needsProfileSetup]);

  // Load shared content for the active profile
  useEffect(() => {
    const loadContent = async () => {
      const nativeLang = user.nativeLanguage || 'it';
      const targetLang = user.activeProfileId || 'en';

      setIsGeneratingContent(true);
      try {
        const content = await fetchSharedContent(nativeLang, targetLang);
        setSharedContent(content);
      } catch (e) {
        console.error('Failed to load shared content:', e);
      } finally {
        setIsGeneratingContent(false);
      }
    };

    if (isAuthenticated && !needsProfileSetup && user.activeProfileId) {
      loadContent();
    }
  }, [user.activeProfileId, user.nativeLanguage, isAuthenticated, needsProfileSetup]);

  // Initialize Auth state listener
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser && !authUser.isAnonymous) {
        setIsLoading(true);
        setUserId(authUser.uid);
        try {
          const account = await getUserAccount(authUser.uid);
          if (!account) {
            setNeedsProfileSetup(true);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }

          setNeedsProfileSetup(false);
          const profiles = await fetchUserProfiles(authUser.uid);
          setUserProfiles(profiles);

          const profile = await fetchUserProfile(authUser.uid);
          const { cleanedVocab, migratedErrors } = await migrateLegacyMalformedVocabs(authUser.uid, profile.activeProfileId);
          const grammarMap = await fetchGrammarProgress(authUser.uid, profile.activeProfileId);
          const readingMap = await fetchReadingProgress(authUser.uid, profile.activeProfileId);

          // Update streak logic
          const todayStr = new Date().toISOString().split('T')[0];
          let updatedProfile = { ...profile, userId: authUser.uid };

          if (profile.lastActiveDate && profile.lastActiveDate !== todayStr) {
            const lastDate = new Date(profile.lastActiveDate);
            const currentDate = new Date(todayStr);
            const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

            if (diffDays === 1) {
              // Active yesterday -> increment streak by 1
              updatedProfile.streakCount = Math.max(1, profile.streakCount + 1);
              updatedProfile.lastActiveDate = todayStr;
            } else if (diffDays > 1) {
              // Skipped 1 or more days -> reset streak to 1
              updatedProfile.streakCount = 1;
              updatedProfile.lastActiveDate = todayStr;
            }

            setUser(updatedProfile);
            await updateUserProfile(updatedProfile);
          } else {
            setUser({ ...profile, userId: authUser.uid });
          }

          // Setup daily notification reminder if enabled
          if (profile.reminderEnabled) {
            setupDailyReminderTimer(profile.reminderTime || '20:00');
          }

          setVocabItems(cleanedVocab);
          setExerciseErrors(migratedErrors);
          setGrammarProgress(grammarMap);
          setReadingProgress(readingMap);
          setIsAuthenticated(true);
        } catch (e) {
          console.warn('Profile sync error:', e);
          setIsAuthenticated(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsAuthenticated(false);
        setNeedsProfileSetup(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const [grammarProgress, setGrammarProgress] = useState<Record<string, GrammarTopicProgress>>(() => {
    try {
      const saved = localStorage.getItem('raccoonary_grammar_progress');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [readingProgress, setReadingProgress] = useState<Record<string, { textsCompleted: number; lastReadAt?: number }>>(() => {
    try {
      const saved = localStorage.getItem('raccoonary_reading_progress');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const handleCompleteReading = async (level: any) => {
    const updated = await incrementReadingProgress(userId, level, user.activeProfileId);
    setReadingProgress(updated);
  };
  const [lastActiveTopicId, setLastActiveTopicId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('raccoonary_last_active_topic');
    } catch (e) {
      return null;
    }
  });

  const handleUpdateGrammarProgress = (progress: GrammarTopicProgress) => {
    setGrammarProgress((prev) => {
      const updated = { ...prev, [progress.topicId]: progress };
      try {
        localStorage.setItem('raccoonary_grammar_progress', JSON.stringify(updated));
      } catch (e) {}
      saveGrammarProgressTopic(userId, progress, user.activeProfileId);
      return updated;
    });
  };

  const handleSetLastActiveTopicId = (topicId: string) => {
    setLastActiveTopicId(topicId);
    try {
      localStorage.setItem('raccoonary_last_active_topic', topicId);
    } catch (e) {}
  };

  const handleCompleteOnboarding = async (choice: 'import' | 'home' | 'level_test') => {
    if (choice === 'import') {
      setCurrentTab('import');
      setShowLevelTest(false);
    } else if (choice === 'level_test') {
      setCurrentTab('home');
      setShowLevelTest(true);
    } else {
      setCurrentTab('home');
      setShowLevelTest(false);
    }

    const updatedUser = { ...user, onboardingCompleted: true };
    setUser(updatedUser);
    await updateUserProfile(updatedUser);
  };

  const handleSaveItem = async (item: VocabItem) => {
    await saveVocabItem(userId, item, user.activeProfileId);
    const updated = await fetchVocabItems(userId, user.activeProfileId);
    setVocabItems(updated);
  };

  const handleBulkImport = async (newItems: VocabItem[]) => {
    await bulkSaveVocabItems(userId, newItems, user.activeProfileId);
    const updated = await fetchVocabItems(userId, user.activeProfileId);
    setVocabItems(updated);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteVocabItem(userId, itemId, user.activeProfileId);
    const updated = await fetchVocabItems(userId, user.activeProfileId);
    setVocabItems(updated);
  };

  const handleSaveExerciseError = async (item: ExerciseError) => {
    await saveExerciseError(userId, item, user.activeProfileId);
    const updated = await fetchExerciseErrors(userId, user.activeProfileId);
    setExerciseErrors(updated);
  };

  const handleDeleteExerciseError = async (errorId: string) => {
    await deleteExerciseError(userId, errorId, user.activeProfileId);
    const updated = await fetchExerciseErrors(userId, user.activeProfileId);
    setExerciseErrors(updated);
  };

  const handleSessionComplete = async (acornsEarned: number) => {
    const updatedUser = {
      ...user,
      totalAcorns: user.totalAcorns + acornsEarned,
    };
    setUser(updatedUser);
    await updateUserProfile(updatedUser);
  };

  const handleResetData = async () => {
    await resetAllData(userId, user.activeProfileId);
    const refreshedUser = await fetchUserProfile(userId);
    setUser(refreshedUser);
    setVocabItems([]);
    setExerciseErrors([]);
    setGrammarProgress({});
    setCurrentTab('home');
  };

  const handleAdminResetData = async () => {
    setIsLoading(true);
    await adminResetTestData(userId, user.activeProfileId);
    const refreshedUser = await fetchUserProfile(userId);
    const refreshedVocab = await fetchVocabItems(userId, refreshedUser.activeProfileId);
    const refreshedErrors = await fetchExerciseErrors(userId, refreshedUser.activeProfileId);
    const refreshedGrammar = await fetchGrammarProgress(userId, refreshedUser.activeProfileId);
    setUser(refreshedUser);
    setVocabItems(refreshedVocab);
    setExerciseErrors(refreshedErrors);
    setGrammarProgress(refreshedGrammar);
    setShowLevelTest(false);
    setIsLoading(false);
    setCurrentTab('home');
  };

  const handleAdminSimulateNewUser = async () => {
    setIsLoading(true);
    await adminSimulateNewUser(userId);
    window.location.reload();
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await logoutUser();
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  const handleSwitchProfile = async (targetLanguage: string) => {
    setIsLoading(true);
    try {
      const updatedProfile = await switchActiveProfile(userId, targetLanguage);
      const { cleanedVocab, migratedErrors } = await migrateLegacyMalformedVocabs(userId, targetLanguage);
      const grammarMap = await fetchGrammarProgress(userId, targetLanguage);
      const readingMap = await fetchReadingProgress(userId, targetLanguage);
      setUser(updatedProfile);
      setVocabItems(cleanedVocab);
      setExerciseErrors(migratedErrors);
      setGrammarProgress(grammarMap);
      setReadingProgress(readingMap);
      setShowLevelTest(false);
      setCurrentTab('home');
    } catch (e) {
      console.error('Error switching profile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewLanguage = async (targetLanguage: string) => {
    setIsLoading(true);
    try {
      await createNewLanguageProfile(userId, targetLanguage);
      const updatedProfiles = await fetchUserProfiles(userId);
      const updatedProfile = await fetchUserProfile(userId);
      const items = await fetchVocabItems(userId, targetLanguage);
      const errs = await fetchExerciseErrors(userId, targetLanguage);
      const grammarMap = await fetchGrammarProgress(userId, targetLanguage);
      const readingMap = await fetchReadingProgress(userId, targetLanguage);

      setUserProfiles(updatedProfiles);
      setUser(updatedProfile);
      setVocabItems(items);
      setExerciseErrors(errs);
      setGrammarProgress(grammarMap);
      setReadingProgress(readingMap);
      setShowLevelTest(false);
      setCurrentTab('home');
    } catch (e) {
      console.error('Error adding new language profile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLanguageProfile = async (targetLanguage: string) => {
    if (userProfiles.length <= 1) return;
    setIsLoading(true);
    try {
      let nextActiveLang = user.activeProfileId;
      if (user.activeProfileId === targetLanguage) {
        nextActiveLang = userProfiles.find((p) => p !== targetLanguage) || 'en';
        await switchActiveProfile(userId, nextActiveLang);
      }
      await deleteLanguageProfile(userId, targetLanguage);
      const updatedProfiles = await fetchUserProfiles(userId);
      const updatedUser = await fetchUserProfile(userId);
      const items = await fetchVocabItems(userId, updatedUser.activeProfileId);
      const errs = await fetchExerciseErrors(userId, updatedUser.activeProfileId);
      const grammarMap = await fetchGrammarProgress(userId, updatedUser.activeProfileId);
      const readingMap = await fetchReadingProgress(userId, updatedUser.activeProfileId);

      setUserProfiles(updatedProfiles);
      setUser(updatedUser);
      setVocabItems(items);
      setExerciseErrors(errs);
      setGrammarProgress(grammarMap);
      setReadingProgress(readingMap);
    } catch (e) {
      console.error('Error deleting language profile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2E8D5] flex items-center justify-center p-6 text-center text-[#3A2B22]">
        <div className="space-y-3">
          <div className="w-12 h-12 border-4 border-[#6B7C4F] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-bold font-display text-sm">Entrando in tana...</p>
        </div>
      </div>
    );
  }

  // Show Login screen if user is not authenticated with Google
  if (!isAuthenticated) {
    return (
      <Login
        onGuestLogin={async () => {
          setIsLoading(true);
          let localId = localStorage.getItem('raccoonary_uid');
          if (!localId) {
            localId = 'local_user_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('raccoonary_uid', localId);
          }
          setUserId(localId);
          const profile = await fetchUserProfile(localId);
          const { cleanedVocab, migratedErrors } = await migrateLegacyMalformedVocabs(localId, profile.activeProfileId);
          const grammarMap = await fetchGrammarProgress(localId, profile.activeProfileId);
          setUser(profile);
          setVocabItems(cleanedVocab);
          setExerciseErrors(migratedErrors);
          setGrammarProgress(grammarMap);
          setIsAuthenticated(true);
          setIsLoading(false);
        }}
        t={t}
      />
    );
  }

  // Show Profile Setup screen if user hasn't completed their user profile fields
  if (needsProfileSetup) {
    return (
      <ProfileSetup
        userId={userId}
        onComplete={async () => {
          setIsLoading(true);
          setNeedsProfileSetup(false);
          const updatedProfile = await fetchUserProfile(userId);
          const { cleanedVocab, migratedErrors } = await migrateLegacyMalformedVocabs(userId, updatedProfile.activeProfileId);
          setUser(updatedProfile);
          setVocabItems(cleanedVocab);
          setExerciseErrors(migratedErrors);
          setIsLoading(false);
        }}
      />
    );
  }

  // Show Onboarding screen if user hasn't completed onboarding yet
  if (!user.onboardingCompleted) {
    return (
      <Onboarding
        onComplete={handleCompleteOnboarding}
        skipSlides={userProfiles.length > 1 || user.activeProfileId !== 'en'}
        t={t}
      />
    );
  }

  // Mascot loading screen when generating dynamic UI translations for spoken language
  if (isGeneratingUITranslations && user.nativeLanguage && user.nativeLanguage !== 'it') {
    return (
      <div className="min-h-screen bg-[#1A1512] flex flex-col items-center justify-center p-6 text-center text-[#F2E8D5] space-y-4 animate-fade-in relative">
        <AmbientForestBackground />
        <Mascot pose="thinking" size={140} speechBubble={t('common.preparingAppInLanguage')} />
        <p className="font-bold font-display text-sm text-[#6B7C4F]">Un attimo di pazienza per la tana...</p>
      </div>
    );
  }

  // Mascot loading screen when generating dynamic shared content for language pair
  if (isGeneratingContent && !sharedContent) {
    return (
      <div className="min-h-screen bg-[#1A1512] flex flex-col items-center justify-center p-6 text-center text-[#F2E8D5] space-y-4 animate-fade-in relative">
        <AmbientForestBackground />
        <Mascot pose="thinking" size={140} speechBubble="Sto preparando i contenuti per questa lingua, un attimo..." />
        <p className="font-bold font-display text-sm text-[#6B7C4F]">Un attimo di pazienza per la tana...</p>
      </div>
    );
  }

  const dueVocabCount = vocabItems.filter((i) => i.nextReviewAt <= Date.now()).length;
  const dueErrorCount = exerciseErrors.filter((i) => i.nextReviewAt <= Date.now()).length;
  const dueTotalCount = dueVocabCount + dueErrorCount;

  return (
    <div className="min-h-screen bg-[#1A1512] text-[#F2E8D5] font-sans antialiased relative selection:bg-[#E8802F]/30 selection:text-[#F2E8D5]">
      {/* Subtle Ambient Forest Silhouettes */}
      <AmbientForestBackground />

      {/* Global Slide-In Navigation & Top Hamburger Trigger */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedGrammarTopicId(null);
          setCurrentTab(tab);
        }}
        dueCount={dueTotalCount}
        user={user}
        t={t}
      />

      {/* Active Tab Screen */}
      <main className="min-h-screen relative z-10 pb-20 sm:pb-24">
        {showLevelTest ? (
          <LevelTest
            userProfile={user}
            onUpdateProfile={async (updated) => {
              const u = { ...user, ...updated };
              setUser(u);
              await updateUserProfile(u);
            }}
            onSaveErrorVocab={handleSaveItem}
            onSaveExerciseError={handleSaveExerciseError}
            onBack={() => setShowLevelTest(false)}
            t={t}
          />
        ) : (
          <>
            {currentTab === 'home' && (
              <Home
                user={user}
                vocabItems={vocabItems}
                exerciseErrors={exerciseErrors}
                userProfiles={userProfiles}
                sharedContent={sharedContent}
                grammarProgress={grammarProgress}
                readingProgress={readingProgress}
                onSwitchProfile={handleSwitchProfile}
                onAddNewLanguage={handleAddNewLanguage}
                onStartReview={() => setCurrentTab('memorize')}
                onNavigate={(tab) => setCurrentTab(tab)}
                onSelectGrammarTopic={(topicId) => {
                  setSelectedGrammarTopicId(topicId);
                  setCurrentTab('grammar');
                }}
                onAddVocabItem={handleSaveItem}
                onSaveExerciseError={handleSaveExerciseError}
                onDeleteItem={handleDeleteItem}
                onDeleteExerciseError={handleDeleteExerciseError}
                onOpenLevelTest={() => setShowLevelTest(true)}
                onUpdateProfile={async (updated) => {
                  const u = { ...user, ...updated };
                  setUser(u);
                  await updateUserProfile(u);
                }}
                onUpdateGrammarProgress={handleUpdateGrammarProgress}
                onCompleteReading={handleCompleteReading}
                t={t}
              />
            )}

            {currentTab === 'translator' && (
              <TranslatorScreen
                user={user}
                vocabItems={vocabItems}
                exerciseErrors={exerciseErrors}
                onAddVocabItem={handleSaveItem}
                onDeleteItem={handleDeleteItem}
                onDeleteExerciseError={handleDeleteExerciseError}
                t={t}
              />
            )}

            {currentTab === 'memorize' && (
              <Memorization
                vocabItems={vocabItems}
                exerciseErrors={exerciseErrors}
                onSaveItem={handleSaveItem}
                onSaveExerciseError={handleSaveExerciseError}
                onDeleteItem={handleDeleteItem}
                onDeleteExerciseError={handleDeleteExerciseError}
                onSessionComplete={handleSessionComplete}
                onBackToHome={() => setCurrentTab('home')}
                t={t}
              />
            )}

            {currentTab === 'grammar' && (
              <Grammar
                onSaveErrorVocab={handleSaveItem}
                onSaveExerciseError={handleSaveExerciseError}
                selectedTopicId={selectedGrammarTopicId}
                grammarProgress={grammarProgress}
                onUpdateGrammarProgress={handleUpdateGrammarProgress}
                lastActiveTopicId={lastActiveTopicId}
                onSetLastActiveTopicId={handleSetLastActiveTopicId}
                sharedContent={sharedContent}
                userProfile={user}
                t={t}
              />
            )}

            {currentTab === 'pronunciation' && (
              <Pronunciation
                userProfile={user}
                vocabItems={vocabItems}
                onSessionComplete={handleSessionComplete}
                onBack={() => setCurrentTab('home')}
                t={t}
              />
            )}

            {currentTab === 'reading' && (
              <Reading
                onSaveVocabItem={handleSaveItem}
                onSaveExerciseError={handleSaveExerciseError}
                onCompleteReading={handleCompleteReading}
                userProfile={user}
                t={t}
              />
            )}

            {currentTab === 'scenarios' && (
              <Scenarios
                userProfile={user}
                vocabItems={vocabItems}
                onSaveVocabItem={handleSaveItem}
                onBackToHome={() => setCurrentTab('home')}
                t={t}
              />
            )}

            {currentTab === 'import' && (
              <Import
                existingVocabItems={vocabItems}
                onBulkImport={handleBulkImport}
                onNavigateToHome={() => setCurrentTab('home')}
              />
            )}

            {currentTab === 'settings' && (
              <Settings
                user={user}
                userProfiles={userProfiles}
                vocabItems={vocabItems}
                exerciseErrors={exerciseErrors}
                onUpdateUser={async (u) => {
                  setUser(u);
                  await updateUserProfile(u);
                }}
                onSwitchProfile={handleSwitchProfile}
                onAddNewLanguage={handleAddNewLanguage}
                onDeleteLanguageProfile={handleDeleteLanguageProfile}
                onDeleteItem={handleDeleteItem}
                onDeleteExerciseError={handleDeleteExerciseError}
                onResetData={handleResetData}
                onAdminResetData={handleAdminResetData}
                onAdminSimulateNewUser={handleAdminSimulateNewUser}
                onLogout={handleLogout}
                onRestartTutorial={handleRestartTutorial}
                t={t}
              />
            )}
          </>
        )}
      </main>

      {/* Guided Tour with Rocky */}
      {currentTab === 'home' && !showLevelTest && (
        <GuidedTour
          isOpen={showGuidedTour}
          onComplete={handleCompleteTour}
          onSkip={handleCompleteTour}
        />
      )}

      {/* Double-Back Exit Toast */}
      {showExitToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2B2622]/95 border-2 border-[#E8802F] text-[#F2E8D5] px-4 sm:px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs sm:text-sm font-extrabold font-display animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <span className="text-base">🚪</span>
          <span>Premi di nuovo per uscire</span>
        </div>
      )}
    </div>
  );
}

export default App;
