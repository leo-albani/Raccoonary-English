import React, { useState, useEffect } from 'react';
import { UserProfile, VocabItem } from './types';
import {
  ensureAuth,
  fetchUserProfile,
  updateUserProfile,
  fetchVocabItems,
  saveVocabItem,
  bulkSaveVocabItems,
  deleteVocabItem,
  resetAllData,
  getLocalUserProfile,
  getLocalVocabItems,
} from './services/firebase';

// Screens
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Memorization } from './screens/Memorization';
import { Grammar } from './screens/Grammar';
import { Reading } from './screens/Reading';
import { Import } from './screens/Import';
import { Settings } from './screens/Settings';
import { Navigation, NavTab } from './components/Navigation';

export function App() {
  const [userId, setUserId] = useState<string>('local_user');
  const [user, setUser] = useState<UserProfile>(getLocalUserProfile());
  const [vocabItems, setVocabItems] = useState<VocabItem[]>(getLocalVocabItems());
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedGrammarTopicId, setSelectedGrammarTopicId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize data and streak checking on startup
  useEffect(() => {
    async function init() {
      try {
        const uid = await ensureAuth();
        setUserId(uid);

        const profile = await fetchUserProfile(uid);
        const items = await fetchVocabItems(uid);

        // Update streak logic
        const todayStr = new Date().toISOString().split('T')[0];
        let newStreak = profile.streakCount;

        if (profile.lastActiveDate !== todayStr) {
          const lastDate = new Date(profile.lastActiveDate);
          const currentDate = new Date(todayStr);
          const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }

          const updatedProfile = {
            ...profile,
            streakCount: Math.max(1, newStreak),
            lastActiveDate: todayStr,
          };

          setUser(updatedProfile);
          await updateUserProfile(updatedProfile);
        } else {
          setUser(profile);
        }

        setVocabItems(items);
      } catch (e) {
        console.warn('Initialization offline fallback active:', e);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const handleCompleteOnboarding = async (choice: 'import' | 'home') => {
    const updatedUser = { ...user, onboardingCompleted: true };
    setUser(updatedUser);
    await updateUserProfile(updatedUser);

    if (choice === 'import') {
      setCurrentTab('import');
    } else {
      setCurrentTab('home');
    }
  };

  const handleSaveItem = async (item: VocabItem) => {
    await saveVocabItem(userId, item);
    const updated = await fetchVocabItems(userId);
    setVocabItems(updated);
  };

  const handleBulkImport = async (newItems: VocabItem[]) => {
    await bulkSaveVocabItems(userId, newItems);
    const updated = await fetchVocabItems(userId);
    setVocabItems(updated);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteVocabItem(userId, itemId);
    const updated = await fetchVocabItems(userId);
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
    await resetAllData(userId);
    setUser(getLocalUserProfile());
    setVocabItems([]);
    setCurrentTab('home');
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

  // Show Onboarding screen if user hasn't completed onboarding yet
  if (!user.onboardingCompleted) {
    return <Onboarding onComplete={handleCompleteOnboarding} />;
  }

  const dueItems = vocabItems.filter((i) => i.nextReviewAt <= Date.now());

  return (
    <div className="min-h-screen bg-[#F2E8D5] text-[#3A2B22] font-sans antialiased">
      {/* Active Tab Screen */}
      <main className="min-h-screen">
        {currentTab === 'home' && (
          <Home
            user={user}
            vocabItems={vocabItems}
            onStartReview={() => setCurrentTab('memorize')}
            onNavigate={(tab) => setCurrentTab(tab)}
            onSelectGrammarTopic={(topicId) => {
              setSelectedGrammarTopicId(topicId);
              setCurrentTab('grammar');
            }}
          />
        )}

        {currentTab === 'memorize' && (
          <Memorization
            vocabItems={vocabItems}
            onSaveItem={handleSaveItem}
            onSessionComplete={handleSessionComplete}
            onBackToHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'grammar' && (
          <Grammar
            onSaveErrorVocab={handleSaveItem}
            selectedTopicId={selectedGrammarTopicId}
          />
        )}

        {currentTab === 'reading' && (
          <Reading onSaveVocabItem={handleSaveItem} />
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
            vocabItems={vocabItems}
            onUpdateUser={async (u) => {
              setUser(u);
              await updateUserProfile(u);
            }}
            onDeleteItem={handleDeleteItem}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Global Bottom Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedGrammarTopicId(null);
          setCurrentTab(tab);
        }}
        dueCount={dueItems.length}
      />
    </div>
  );
}

export default App;
