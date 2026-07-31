import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { UserProfile, VocabItem, GrammarTopicProgress, ReadingProgress } from '../types';

// Storage keys for local resilience
const LOCAL_USER_KEY = 'raccoonary_local_user';
const LOCAL_VOCAB_KEY = 'raccoonary_local_vocab';
const LOCAL_GRAMMAR_KEY = 'raccoonary_local_grammar';
const LOCAL_READING_KEY = 'raccoonary_local_reading';

let dbInstance: any = null;
let authInstance: any = null;
let isFirebaseInitialized = false;

// Safe lazy Firebase setup
export function initFirebase() {
  if (isFirebaseInitialized) return { db: dbInstance, auth: authInstance };

  try {
    // Check if firebase-applet-config.json exists dynamically or standard config
    const configStr = (import.meta as any).env?.VITE_FIREBASE_CONFIG;
    if (configStr) {
      const config = JSON.parse(configStr);
      const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
      dbInstance = getFirestore(app, config.firestoreDatabaseId);
      authInstance = getAuth(app);
      isFirebaseInitialized = true;
    }
  } catch (e) {
    console.log('Firebase config not loaded, operating in local offline mode.');
  }

  return { db: dbInstance, auth: authInstance };
}

// Ensure anonymous sign-in if Firebase is present
export async function ensureAuth(): Promise<string> {
  const { auth } = initFirebase();
  if (auth) {
    try {
      if (!auth.currentUser) {
        const cred = await signInAnonymously(auth);
        return cred.user.uid;
      }
      return auth.currentUser.uid;
    } catch (e) {
      console.warn('Firebase auth failed, using local user ID:', e);
    }
  }

  // Fallback to local storage user ID
  let localId = localStorage.getItem('raccoonary_uid');
  if (!localId) {
    localId = 'local_user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('raccoonary_uid', localId);
  }
  return localId;
}

// ------------------- USER PROFILE -------------------
export function getLocalUserProfile(): UserProfile {
  const saved = localStorage.getItem(LOCAL_USER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return {
    userId: localStorage.getItem('raccoonary_uid') || 'local_user',
    createdAt: Date.now(),
    streakCount: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalAcorns: 0,
    reminderEnabled: false,
    reminderTime: '20:00',
    onboardingCompleted: false,
  };
}

export function saveLocalUserProfile(profile: UserProfile): void {
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { db } = initFirebase();
  if (db) {
    try {
      const docRef = doc(db, 'users', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        saveLocalUserProfile(data);
        return data;
      }
    } catch (e) {
      console.warn('Firestore fetch user profile error:', e);
    }
  }
  return getLocalUserProfile();
}

export async function updateUserProfile(profile: UserProfile): Promise<void> {
  saveLocalUserProfile(profile);
  const { db } = initFirebase();
  if (db && profile.userId && !profile.userId.startsWith('local_user_')) {
    try {
      const docRef = doc(db, 'users', profile.userId);
      await setDoc(docRef, profile, { merge: true });
    } catch (e) {
      console.warn('Firestore update user profile error:', e);
    }
  }
}

// ------------------- VOCABULARY ITEMS -------------------
export function getLocalVocabItems(): VocabItem[] {
  const saved = localStorage.getItem(LOCAL_VOCAB_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return [];
}

export function saveLocalVocabItems(items: VocabItem[]): void {
  localStorage.setItem(LOCAL_VOCAB_KEY, JSON.stringify(items));
}

export async function fetchVocabItems(userId: string): Promise<VocabItem[]> {
  const { db } = initFirebase();
  if (db && !userId.startsWith('local_user_')) {
    try {
      const colRef = collection(db, 'users', userId, 'vocabItems');
      const snap = await getDocs(colRef);
      const items: VocabItem[] = [];
      snap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<VocabItem, 'id'>) });
      });
      saveLocalVocabItems(items);
      return items;
    } catch (e) {
      console.warn('Firestore fetch vocab error:', e);
    }
  }
  return getLocalVocabItems();
}

export async function saveVocabItem(userId: string, item: VocabItem): Promise<void> {
  const items = getLocalVocabItems();
  const existingIdx = items.findIndex((i) => i.id === item.id);
  if (existingIdx >= 0) {
    items[existingIdx] = item;
  } else {
    items.push(item);
  }
  saveLocalVocabItems(items);

  const { db } = initFirebase();
  if (db && !userId.startsWith('local_user_')) {
    try {
      const docRef = doc(db, 'users', userId, 'vocabItems', item.id);
      await setDoc(docRef, item, { merge: true });
    } catch (e) {
      console.warn('Firestore save vocab item error:', e);
    }
  }
}

export async function bulkSaveVocabItems(userId: string, newItems: VocabItem[]): Promise<void> {
  const items = getLocalVocabItems();
  const itemMap = new Map<string, VocabItem>();
  items.forEach((i) => itemMap.set(i.id, i));
  newItems.forEach((i) => itemMap.set(i.id, i));

  const updatedList = Array.from(itemMap.values());
  saveLocalVocabItems(updatedList);

  const { db } = initFirebase();
  if (db && !userId.startsWith('local_user_')) {
    for (const item of newItems) {
      try {
        const docRef = doc(db, 'users', userId, 'vocabItems', item.id);
        await setDoc(docRef, item, { merge: true });
      } catch (e) {
        console.warn('Firestore bulk save item error:', e);
      }
    }
  }
}

export async function deleteVocabItem(userId: string, itemId: string): Promise<void> {
  const items = getLocalVocabItems().filter((i) => i.id !== itemId);
  saveLocalVocabItems(items);

  const { db } = initFirebase();
  if (db && !userId.startsWith('local_user_')) {
    try {
      const docRef = doc(db, 'users', userId, 'vocabItems', itemId);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Firestore delete vocab error:', e);
    }
  }
}

export async function resetAllData(userId: string): Promise<void> {
  localStorage.removeItem(LOCAL_USER_KEY);
  localStorage.removeItem(LOCAL_VOCAB_KEY);
  localStorage.removeItem(LOCAL_GRAMMAR_KEY);
  localStorage.removeItem(LOCAL_READING_KEY);

  const freshUser: UserProfile = {
    userId,
    createdAt: Date.now(),
    streakCount: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalAcorns: 0,
    reminderEnabled: false,
    reminderTime: '20:00',
    onboardingCompleted: true,
  };

  await updateUserProfile(freshUser);
}
