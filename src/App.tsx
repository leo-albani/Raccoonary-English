import React, { useState, useEffect } from 'react';
import { UserProfile, VocabItem, GrammarTopicProgress, SharedLanguagePairContent } from './types';
import {
  auth,
  fetchUserProfile,
  updateUserProfile,
  fetchVocabItems,
  saveVocabItem,
  bulkSaveVocabItems,
  deleteVocabItem,
  resetAllData,
  adminResetTestData,
  adminSimulateNewUser,
  getLocalUserProfile,
  getLocalVocabItems,
  logoutUser,
  getUserAccount,
  fetchGrammarProgress,
  saveGrammarProgressTopic,
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
import { Import } from './screens/Import';
import { Settings } from './screens/Settings';
import { LevelTest } from './screens/LevelTest';
import { Pronunciation } from './screens/Pronunciation';
import { Wardrobe } from './screens/Wardrobe';
import { Navigation, NavTab } from './components/Navigation';
import { GuidedTour } from './components/GuidedTour';
import { setupDailyReminderTimer } from './services/notifications';

export function App() {
  const [userId, setUserId] = useState<string>('local_user');
  const [user, setUser] = useState<UserProfile>(getLocalUserProfile());
  const [vocabItems, setVocabItems] = useState<VocabItem[]>(getLocalVocabItems());
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [streakFreezeActivated, setStreakFreezeActivated] = useState<boolean>(false);
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
          const items = await fetchVocabItems(authUser.uid, profile.activeProfileId);
          const grammarMap = await fetchGrammarProgress(authUser.uid, profile.activeProfileId);

          // Update streak logic and streak freeze protection
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
            } else if (diffDays === 2) {
              // Skipped exactly 1 day! (e.g. active Monday, skipped Tuesday, opened Wednesday)
              if (profile.streakFreezes && profile.streakFreezes > 0) {
                // CONSUME 1 STREAK FREEZE! Preserve current streak!
                updatedProfile.streakFreezes = profile.streakFreezes - 1;
                // Keep streakCount as is, update lastActiveDate
                updatedProfile.lastActiveDate = todayStr;
                setStreakFreezeActivated(true);
              } else {
                // No freeze -> reset streak to 1
                updatedProfile.streakCount = 1;
                updatedProfile.lastActiveDate = todayStr;
              }
            } else if (diffDays > 2) {
              // Skipped 2 or more days -> reset streak to 1
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

          setVocabItems(items);
          setGrammarProgress(grammarMap);
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
    setGrammarProgress({});
    setCurrentTab('home');
  };

  const handleAdminResetData = async () => {
    setIsLoading(true);
    await adminResetTestData(userId, user.activeProfileId);
    const refreshedUser = await fetchUserProfile(userId);
    const refreshedVocab = await fetchVocabItems(userId, refreshedUser.activeProfileId);
    const refreshedGrammar = await fetchGrammarProgress(userId, refreshedUser.activeProfileId);
    setUser(refreshedUser);
    setVocabItems(refreshedVocab);
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
      const items = await fetchVocabItems(userId, targetLanguage);
      const grammarMap = await fetchGrammarProgress(userId, targetLanguage);
      setUser(updatedProfile);
      setVocabItems(items);
      setGrammarProgress(grammarMap);
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
      const grammarMap = await fetchGrammarProgress(userId, targetLanguage);

      setUserProfiles(updatedProfiles);
      setUser(updatedProfile);
      setVocabItems(items);
      setGrammarProgress(grammarMap);
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
      const grammarMap = await fetchGrammarProgress(userId, updatedUser.activeProfileId);

      setUserProfiles(updatedProfiles);
      setUser(updatedUser);
      setVocabItems(items);
      setGrammarProgress(grammarMap);
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
    return <Login />;
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
          const items = await fetchVocabItems(userId);
          setUser(updatedProfile);
          setVocabItems(items);
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
      <div className="min-h-screen bg-[#F2E8D5] flex flex-col items-center justify-center p-6 text-center text-[#3A2B22] space-y-4 animate-fade-in">
        <Mascot pose="thinking" size={140} speechBubble={t('common.preparingAppInLanguage')} />
        <p className="font-bold font-display text-sm text-[#6B7C4F]">Un attimo di pazienza per la tana...</p>
      </div>
    );
  }

  // Mascot loading screen when generating dynamic shared content for language pair
  if (isGeneratingContent && !sharedContent) {
    return (
      <div className="min-h-screen bg-[#F2E8D5] flex flex-col items-center justify-center p-6 text-center text-[#3A2B22] space-y-4 animate-fade-in">
        <Mascot pose="thinking" size={140} speechBubble="Sto preparando i contenuti per questa lingua, un attimo..." />
        <p className="font-bold font-display text-sm text-[#6B7C4F]">Un attimo di pazienza per la tana...</p>
      </div>
    );
  }

  const dueItems = vocabItems.filter((i) => i.nextReviewAt <= Date.now());

  return (
    <div className="min-h-screen bg-[#F2E8D5] text-[#3A2B22] font-sans antialiased">
      {/* Active Tab Screen */}
      <main className="min-h-screen">
        {showLevelTest ? (
          <LevelTest
            userProfile={user}
            onUpdateProfile={async (updated) => {
              const u = { ...user, ...updated };
              setUser(u);
              await updateUserProfile(u);
            }}
            onSaveErrorVocab={handleSaveItem}
            onBack={() => setShowLevelTest(false)}
            t={t}
          />
        ) : (
          <>
            {currentTab === 'home' && (
              <Home
                user={user}
                vocabItems={vocabItems}
                userProfiles={userProfiles}
                sharedContent={sharedContent}
                streakFreezeActivated={streakFreezeActivated}
                onCloseFreezeBanner={() => setStreakFreezeActivated(false)}
                onSwitchProfile={handleSwitchProfile}
                onAddNewLanguage={handleAddNewLanguage}
                onStartReview={() => setCurrentTab('memorize')}
                onNavigate={(tab) => setCurrentTab(tab)}
                onSelectGrammarTopic={(topicId) => {
                  setSelectedGrammarTopicId(topicId);
                  setCurrentTab('grammar');
                }}
                onAddVocabItem={handleSaveItem}
                onDeleteItem={handleDeleteItem}
                onOpenLevelTest={() => setShowLevelTest(true)}
                t={t}
              />
            )}

            {currentTab === 'wardrobe' && (
              <Wardrobe
                user={user}
                onUpdateUser={async (updated) => {
                  setUser(updated);
                  await updateUserProfile(updated);
                }}
                onBackToHome={() => setCurrentTab('home')}
              />
            )}

            {currentTab === 'memorize' && (
              <Memorization
                vocabItems={vocabItems}
                onSaveItem={handleSaveItem}
                onDeleteItem={handleDeleteItem}
                onSessionComplete={handleSessionComplete}
                onBackToHome={() => setCurrentTab('home')}
                t={t}
              />
            )}

            {currentTab === 'grammar' && (
              <Grammar
                onSaveErrorVocab={handleSaveItem}
                selectedTopicId={selectedGrammarTopicId}
                grammarProgress={grammarProgress}
                onUpdateGrammarProgress={handleUpdateGrammarProgress}
                lastActiveTopicId={lastActiveTopicId}
                onSetLastActiveTopicId={handleSetLastActiveTopicId}
                sharedContent={sharedContent}
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
              <Reading onSaveVocabItem={handleSaveItem} userProfile={user} t={t} />
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
                onUpdateUser={async (u) => {
                  setUser(u);
                  await updateUserProfile(u);
                }}
                onSwitchProfile={handleSwitchProfile}
                onAddNewLanguage={handleAddNewLanguage}
                onDeleteLanguageProfile={handleDeleteLanguageProfile}
                onDeleteItem={handleDeleteItem}
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
          activeOutfit={user.activeOutfit}
          onComplete={handleCompleteTour}
          onSkip={handleCompleteTour}
        />
      )}

      {/* Global Bottom Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedGrammarTopicId(null);
          setCurrentTab(tab);
        }}
        dueCount={dueItems.length}
        t={t}
      />
    </div>
  );
}

export default App;
