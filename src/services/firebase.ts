import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  getDocFromServer,
} from 'firebase/firestore';
import { UserProfile, UserAccount, VocabItem, GrammarTopicProgress, SharedLanguagePairContent, UITranslationSet, Gender, CEFRLevel, ScenarioRecord } from '../types';
import { SEED_IT_EN_CONTENT } from '../data/sharedContentSeed';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES } from '../data/languages';
import { IT_TRANSLATIONS } from '../i18n/translations';
// Load config dynamically if present or fallback to embedded config
const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const configPath = Object.keys(configModules)[0];
const loadedConfig = configPath ? (configModules[configPath] as any)?.default : null;

const firebaseConfig = loadedConfig || {
  apiKey: "AIzaSyAFxfsquFnviXy77UJrqnghISyN_gxvUUc",
  authDomain: "gen-lang-client-0939401223.firebaseapp.com",
  projectId: "gen-lang-client-0939401223",
  storageBucket: "gen-lang-client-0939401223.firebasestorage.app",
  messagingSenderId: "664049459009",
  appId: "1:664049459009:web:a1f7610f41ad08788d8bc0",
  measurementId: "G-0KS05ZRPCY"
};

// Storage keys for local resilience
const LOCAL_USER_KEY = 'raccoonary_local_user';
const LOCAL_VOCAB_KEY = 'raccoonary_local_vocab';
const LOCAL_GRAMMAR_KEY = 'raccoonary_local_grammar';

// Helper for timing out hanging Firestore operations
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  errorMsg: string = 'Operazione su Firestore scaduta'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
}

// Error Handling Infrastructure
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// App & Service Initialization
const app = firebaseConfig && firebaseConfig.apiKey
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

export const db = app
  ? (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app))
  : null;
export const auth = app ? getAuth(app) : null;

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Validation
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline during initial connection check:', error.message);
    } else {
      console.warn('Firebase connection check info:', error);
    }
  }
}
testConnection();

export function initFirebase() {
  return { db, auth };
}

// Ensure anonymous auth
export async function ensureAuth(): Promise<string> {
  try {
    if (auth && !auth.currentUser) {
      const cred = await signInAnonymously(auth);
      return cred.user.uid;
    }
    if (auth?.currentUser) {
      return auth.currentUser.uid;
    }
  } catch (e) {
    console.warn('Firebase auth failed, using local user ID:', e);
  }

  let localId = localStorage.getItem('raccoonary_uid');
  if (!localId) {
    localId = 'local_user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('raccoonary_uid', localId);
  }
  return localId;
}

export async function loginWithGoogle(): Promise<{ user: User; isLinked: boolean; warningMessage?: string }> {
  if (!auth) {
    throw new Error('Integrazione Firebase non attiva. Collega un progetto Firebase per abilitare l\'accesso.');
  }
  const provider = new GoogleAuthProvider();
  const currentUser = auth.currentUser;

  if (currentUser && currentUser.isAnonymous) {
    try {
      const cred = await linkWithPopup(currentUser, provider);
      return { user: cred.user, isLinked: true };
    } catch (error: any) {
      if (error?.code === 'auth/credential-already-in-use') {
        const warningMessage =
          'Questo account Google è già collegato a un profilo Raccoonary esistente su un altro dispositivo. Ti sto portando lì — i dati di questa sessione locale non anonima non verranno uniti automaticamente.';
        const result = await signInWithPopup(auth, provider);
        return { user: result.user, isLinked: false, warningMessage };
      }
      throw translateAuthError(error);
    }
  } else {
    try {
      const result = await signInWithPopup(auth, provider);
      return { user: result.user, isLinked: false };
    } catch (error: any) {
      throw translateAuthError(error);
    }
  }
}

export class FirebaseAuthError extends Error {
  code: string;
  domain?: string;
  constructor(message: string, code: string, domain?: string) {
    super(message);
    this.name = 'FirebaseAuthError';
    this.code = code;
    this.domain = domain;
  }
}

function translateAuthError(error: any): Error {
  const code = error?.code || '';
  const message = error?.message || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return new FirebaseAuthError('Accesso annullato. Nessun problema, puoi riprovare quando vuoi! 🦝', code);
  }
  if (code === 'auth/popup-blocked') {
    return new FirebaseAuthError('Il browser ha bloccato la finestra di accesso. Abilita i popup per proseguire. 🦝', code);
  }
  if (code === 'auth/network-request-failed') {
    return new FirebaseAuthError('Sembra che ci sia un problema di connessione. Controlla la rete e riprova! 🦝', code);
  }
  if (code === 'auth/unauthorized-domain' || message.includes('auth/unauthorized-domain') || message.includes('unauthorized-domain')) {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    return new FirebaseAuthError(
      `Il dominio attuale (${hostname || 'anteprima'}) non è presente nei domini autorizzati di Firebase Authentication.`,
      'auth/unauthorized-domain',
      hostname
    );
  }
  return new FirebaseAuthError(
    error?.message || 'Impossibile completare l\'accesso con Google in questo momento. Riprova più tardi.',
    code
  );
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

// ------------------- ADMIN UTILS -------------------
export const ADMIN_EMAILS = ['leonardo.albani98@gmail.com'];

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// ------------------- USER ACCOUNT & PROFILES -------------------
export async function getUserAccount(userId: string): Promise<UserAccount | null> {
  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const snap = await withTimeout(getDoc(docRef), 8000);
      if (snap.exists()) {
        const data = snap.data();
        if (
          data.firstName &&
          data.lastName &&
          data.username &&
          data.nativeLanguage &&
          data.activeProfileId
        ) {
          return {
            userId,
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username,
            nativeLanguage: data.nativeLanguage,
            activeProfileId: data.activeProfileId,
            createdAt: data.createdAt || Date.now(),
            gender: data.gender || 'undisclosed',
            interessi: data.interessi || [],
          };
        }
      }
    } catch (e) {
      console.warn('Error fetching user account doc:', e);
    }
  }
  return null;
}

export async function checkUserHasLegacyData(userId: string): Promise<boolean> {
  // Check local storage first
  const localVocab = getLocalVocabItems();
  if (localVocab && localVocab.length > 0) {
    return true;
  }

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/vocabItems`;
    try {
      const colRef = collection(db, 'users', userId, 'vocabItems');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return true;
      }
    } catch (e) {
      console.warn('Error checking legacy vocab items:', e);
    }
  }
  return false;
}

export async function migrateLegacyDataIfNeeded(userId: string, activeProfileId: string): Promise<boolean> {
  if (!db || userId.startsWith('local_user_')) return false;

  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return false;

    const userData = userSnap.data();
    if (userData.legacyMigrated) {
      return false; // Already migrated
    }

    // Check if old vocabItems collection has documents
    const oldVocabRef = collection(db, 'users', userId, 'vocabItems');
    const oldVocabSnap = await getDocs(oldVocabRef);

    // Check if new profile vocabItems collection is empty
    const newVocabRef = collection(db, 'users', userId, 'profiles', activeProfileId, 'vocabItems');
    const newVocabSnap = await getDocs(newVocabRef);

    if (oldVocabSnap.empty) {
      // Mark as legacyMigrated so we don't check again
      await setDoc(userDocRef, { legacyMigrated: true }, { merge: true });
      return false;
    }

    if (!newVocabSnap.empty) {
      // Profile already populated
      await setDoc(userDocRef, { legacyMigrated: true }, { merge: true });
      return false;
    }

    // Migration step 1 & 2: Copy subcollections (vocabItems, grammarProgress, readingProgress, levelTests, scenarios)
    const subcollections = ['vocabItems', 'grammarProgress', 'readingProgress', 'levelTests', 'scenarios'];
    for (const sub of subcollections) {
      const oldColRef = collection(db, 'users', userId, sub);
      const oldSnap = await getDocs(oldColRef);
      for (const oldDocSnap of oldSnap.docs) {
        const newDocRef = doc(db, 'users', userId, 'profiles', activeProfileId, sub, oldDocSnap.id);
        await setDoc(newDocRef, oldDocSnap.data(), { merge: true });
      }
    }

    // Migration step 3: Copy old metrics from root doc to target profile doc
    const profileRef = doc(db, 'users', userId, 'profiles', activeProfileId);
    const profileUpdates: Record<string, any> = {};
    if (userData.streakCount !== undefined) profileUpdates.streakCount = userData.streakCount;
    if (userData.totalAcorns !== undefined) profileUpdates.totalAcorns = userData.totalAcorns;
    if (userData.currentLevel !== undefined) profileUpdates.currentLevel = userData.currentLevel;
    if (userData.reminderEnabled !== undefined) profileUpdates.reminderEnabled = userData.reminderEnabled;
    if (userData.reminderTime !== undefined) profileUpdates.reminderTime = userData.reminderTime;
    if (userData.lastActiveDate !== undefined) profileUpdates.lastActiveDate = userData.lastActiveDate;
    if (userData.lastTestDate !== undefined) profileUpdates.lastTestDate = userData.lastTestDate;
    if (userData.onboardingCompleted !== undefined) profileUpdates.onboardingCompleted = userData.onboardingCompleted;

    if (Object.keys(profileUpdates).length > 0) {
      await setDoc(profileRef, profileUpdates, { merge: true });
    }

    // Migration step 4: Mark root user doc as legacyMigrated
    await setDoc(userDocRef, { legacyMigrated: true }, { merge: true });

    return true;
  } catch (e) {
    console.error('Error migrating legacy data:', e);
    return false;
  }
}

export async function createUserAccountAndProfile(
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    username: string;
    nativeLanguage: string;
    targetLanguage: string;
    gender?: Gender;
    interessi?: string[];
  }
): Promise<void> {
  const accountDoc = {
    userId,
    firstName: data.firstName,
    lastName: data.lastName,
    username: data.username,
    nativeLanguage: data.nativeLanguage,
    activeProfileId: data.targetLanguage,
    createdAt: Date.now(),
    legacyMigrated: true,
    gender: data.gender || 'undisclosed',
    interessi: data.interessi || [],
  };

  const profileDoc = {
    targetLanguage: data.targetLanguage,
    createdAt: Date.now(),
    currentLevel: null,
    livelloStudioAttivo: null,
    streakCount: 0,
    totalAcorns: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    reminderEnabled: false,
    reminderTime: '20:00',
    interessi: data.interessi || [],
  };

  if (db && !userId.startsWith('local_user_')) {
    const userPath = `users/${userId}`;
    try {
      await withTimeout(
        Promise.all([
          setDoc(doc(db, 'users', userId), accountDoc, { merge: true }),
          setDoc(doc(db, 'users', userId, 'profiles', data.targetLanguage), profileDoc, { merge: true }),
        ]),
        8000,
        'Timeout durante il salvataggio del profilo'
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, userPath);
    }
  }

  // Also update local storage profile
  const existingLocal = getLocalUserProfile();
  saveLocalUserProfile({
    ...existingLocal,
    userId,
    firstName: data.firstName,
    lastName: data.lastName,
    username: data.username,
    nativeLanguage: data.nativeLanguage,
    activeProfileId: data.targetLanguage,
    gender: data.gender || 'undisclosed',
    interessi: data.interessi || [],
  });
}

// ------------------- PROFILE MANAGEMENT -------------------
export async function fetchUserProfiles(userId: string): Promise<string[]> {
  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles`;
    try {
      const colRef = collection(db, 'users', userId, 'profiles');
      const snap = await getDocs(colRef);
      const profileIds: string[] = [];
      snap.forEach((docSnap) => {
        profileIds.push(docSnap.id);
      });
      if (profileIds.length > 0) {
        return profileIds;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  }
  const localProfile = getLocalUserProfile();
  return [localProfile.activeProfileId || 'en'];
}

export async function createNewLanguageProfile(
  userId: string,
  targetLanguage: string
): Promise<void> {
  const profileDoc = {
    targetLanguage,
    createdAt: Date.now(),
    currentLevel: null,
    livelloStudioAttivo: null,
    streakCount: 0,
    totalAcorns: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    reminderEnabled: false,
    reminderTime: '20:00',
    onboardingCompleted: false,
  };

  if (db && !userId.startsWith('local_user_')) {
    const userPath = `users/${userId}`;
    try {
      await setDoc(doc(db, 'users', userId, 'profiles', targetLanguage), profileDoc, { merge: true });
      await setDoc(doc(db, 'users', userId), { activeProfileId: targetLanguage }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, userPath);
    }
  }

  const existingLocal = getLocalUserProfile();
  saveLocalUserProfile({
    ...existingLocal,
    activeProfileId: targetLanguage,
    onboardingCompleted: false,
  });
}

export async function switchActiveProfile(userId: string, targetLanguage: string): Promise<UserProfile> {
  if (db && !userId.startsWith('local_user_')) {
    const userPath = `users/${userId}`;
    try {
      await setDoc(doc(db, 'users', userId), { activeProfileId: targetLanguage }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, userPath);
    }
  }

  const existingLocal = getLocalUserProfile();
  saveLocalUserProfile({
    ...existingLocal,
    activeProfileId: targetLanguage,
  });

  return await fetchUserProfile(userId);
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
    livelloStudioAttivo: null,
    tutorialCompleted: false,
    gender: 'undisclosed',
    interessi: [],
  };
}

export function saveLocalUserProfile(profile: UserProfile): void {
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const accountData = snap.data();
        const activeProfileId = accountData.activeProfileId || 'en';

        // Check & perform migration if needed
        await migrateLegacyDataIfNeeded(userId, activeProfileId);

        // Fetch target profile doc
        const profileRef = doc(db, 'users', userId, 'profiles', activeProfileId);
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.exists() ? profileSnap.data() : {};

        const unifiedProfile: UserProfile = {
          userId,
          createdAt: profileData.createdAt || accountData.createdAt || Date.now(),
          streakCount: profileData.streakCount ?? accountData.streakCount ?? 0,
          lastActiveDate: profileData.lastActiveDate || accountData.lastActiveDate || new Date().toISOString().split('T')[0],
          totalAcorns: profileData.totalAcorns ?? accountData.totalAcorns ?? 0,
          reminderEnabled: profileData.reminderEnabled ?? accountData.reminderEnabled ?? false,
          reminderTime: profileData.reminderTime || accountData.reminderTime || '20:00',
          onboardingCompleted: profileData.onboardingCompleted ?? accountData.onboardingCompleted ?? false,
          currentLevel: profileSnap.exists() ? (profileData.currentLevel || null) : (accountData.currentLevel || null),
          livelloStudioAttivo: profileSnap.exists() ? (profileData.livelloStudioAttivo || null) : (accountData.livelloStudioAttivo || null),
          lastTestDate: profileSnap.exists() ? (profileData.lastTestDate || null) : (accountData.lastTestDate || null),
          tutorialCompleted: profileData.tutorialCompleted ?? accountData.tutorialCompleted ?? false,
          activeProfileId,
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          username: accountData.username,
          nativeLanguage: accountData.nativeLanguage,
          gender: accountData.gender || 'undisclosed',
          interessi: accountData.interessi || profileData.interessi || [],
        };

        saveLocalUserProfile(unifiedProfile);
        return unifiedProfile;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  }
  return getLocalUserProfile();
}

export async function updateUserProfile(profile: UserProfile): Promise<void> {
  saveLocalUserProfile(profile);
  if (db && profile.userId && !profile.userId.startsWith('local_user_')) {
    const activeProfileId = profile.activeProfileId || getLocalUserProfile().activeProfileId || 'en';
    const path = `users/${profile.userId}/profiles/${activeProfileId}`;
    try {
      // Update nested profile document
      const profileRef = doc(db, 'users', profile.userId, 'profiles', activeProfileId);
      await setDoc(
        profileRef,
        {
          targetLanguage: activeProfileId,
          streakCount: profile.streakCount ?? 0,
          totalAcorns: profile.totalAcorns ?? 0,
          currentLevel: profile.currentLevel || null,
          livelloStudioAttivo: profile.livelloStudioAttivo || null,
          lastActiveDate: profile.lastActiveDate || new Date().toISOString().split('T')[0],
          reminderEnabled: profile.reminderEnabled ?? false,
          reminderTime: profile.reminderTime || '20:00',
          onboardingCompleted: profile.onboardingCompleted ?? false,
          lastTestDate: profile.lastTestDate || null,
          tutorialCompleted: profile.tutorialCompleted ?? false,
          interessi: profile.interessi || [],
        },
        { merge: true }
      );

      // Also ensure root account doc has updated activeProfileId and account fields if set
      const userRef = doc(db, 'users', profile.userId);
      const rootUpdates: Record<string, any> = { activeProfileId };
      if (profile.firstName) rootUpdates.firstName = profile.firstName;
      if (profile.lastName) rootUpdates.lastName = profile.lastName;
      if (profile.username) rootUpdates.username = profile.username;
      if (profile.nativeLanguage) rootUpdates.nativeLanguage = profile.nativeLanguage;
      if (profile.tutorialCompleted !== undefined) rootUpdates.tutorialCompleted = profile.tutorialCompleted;
      if (profile.gender) rootUpdates.gender = profile.gender;
      if (profile.interessi !== undefined) rootUpdates.interessi = profile.interessi;
      await setDoc(userRef, rootUpdates, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}

export async function savePushTokenToFirestore(userId: string, token: string, profileId?: string): Promise<void> {
  if (!token || !userId || userId.startsWith('local_user_') || !db) return;
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';

  try {
    // Save to user root document
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const existingTokens: string[] = userSnap.exists() && Array.isArray(userSnap.data().fcmTokens)
      ? userSnap.data().fcmTokens
      : [];

    const updatedTokens = Array.from(new Set([...existingTokens, token]));
    await setDoc(userRef, { fcmToken: token, fcmTokens: updatedTokens }, { merge: true });

    // Also update current active profile
    const profileRef = doc(db, 'users', userId, 'profiles', targetProfileId);
    await setDoc(profileRef, { fcmToken: token, fcmTokens: updatedTokens }, { merge: true });
  } catch (e) {
    console.warn('Error saving push token to Firestore:', e);
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

export async function fetchVocabItems(userId: string, profileId?: string): Promise<VocabItem[]> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/vocabItems`;
    try {
      const colRef = collection(db, 'users', userId, 'profiles', targetProfileId, 'vocabItems');
      const snap = await getDocs(colRef);
      const items: VocabItem[] = [];
      snap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<VocabItem, 'id'>) });
      });
      saveLocalVocabItems(items);
      return items;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  }
  return getLocalVocabItems();
}

export async function saveVocabItem(userId: string, item: VocabItem, profileId?: string): Promise<void> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  const items = getLocalVocabItems();
  const existingIdx = items.findIndex((i) => i.id === item.id);
  if (existingIdx >= 0) {
    items[existingIdx] = item;
  } else {
    items.push(item);
  }
  saveLocalVocabItems(items);

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/vocabItems/${item.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'profiles', targetProfileId, 'vocabItems', item.id);
      await setDoc(docRef, item, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}

export async function bulkSaveVocabItems(userId: string, newItems: VocabItem[], profileId?: string): Promise<void> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  const items = getLocalVocabItems();
  const itemMap = new Map<string, VocabItem>();
  items.forEach((i) => itemMap.set(i.id, i));
  newItems.forEach((i) => itemMap.set(i.id, i));

  const updatedList = Array.from(itemMap.values());
  saveLocalVocabItems(updatedList);

  if (db && !userId.startsWith('local_user_')) {
    for (const item of newItems) {
      const path = `users/${userId}/profiles/${targetProfileId}/vocabItems/${item.id}`;
      try {
        const docRef = doc(db, 'users', userId, 'profiles', targetProfileId, 'vocabItems', item.id);
        await setDoc(docRef, item, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }
  }
}

export async function deleteVocabItem(userId: string, itemId: string, profileId?: string): Promise<void> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  const items = getLocalVocabItems().filter((i) => i.id !== itemId);
  saveLocalVocabItems(items);

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/vocabItems/${itemId}`;
    try {
      const docRef = doc(db, 'users', userId, 'profiles', targetProfileId, 'vocabItems', itemId);
      await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }
}

// ------------------- GRAMMAR PROGRESS -------------------
export async function fetchGrammarProgress(userId: string, profileId?: string): Promise<Record<string, GrammarTopicProgress>> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  let progressMap: Record<string, GrammarTopicProgress> = {};
  const localKey = `${LOCAL_GRAMMAR_KEY}_${targetProfileId}`;
  
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) progressMap = JSON.parse(saved);
  } catch (e) {}

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/grammarProgress`;
    try {
      const colRef = collection(db, 'users', userId, 'profiles', targetProfileId, 'grammarProgress');
      const snap = await getDocs(colRef);
      progressMap = {};
      snap.forEach((docSnap) => {
        progressMap[docSnap.id] = docSnap.data() as GrammarTopicProgress;
      });
      localStorage.setItem(localKey, JSON.stringify(progressMap));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  }

  return progressMap;
}

export async function saveGrammarProgressTopic(
  userId: string,
  progress: GrammarTopicProgress,
  profileId?: string
): Promise<void> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  const localKey = `${LOCAL_GRAMMAR_KEY}_${targetProfileId}`;
  
  try {
    const saved = localStorage.getItem(localKey);
    const existing = saved ? JSON.parse(saved) : {};
    existing[progress.topicId] = progress;
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch (e) {}

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/grammarProgress/${progress.topicId}`;
    try {
      const docRef = doc(db, 'users', userId, 'profiles', targetProfileId, 'grammarProgress', progress.topicId);
      await setDoc(docRef, progress, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}

// ------------------- READING PROGRESS -------------------
export async function fetchReadingProgress(userId: string, profileId?: string): Promise<Record<string, { textsCompleted: number; lastReadAt?: number }>> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  let progressMap: Record<string, { textsCompleted: number; lastReadAt?: number }> = {};
  const localKey = `raccoonary_reading_progress_${targetProfileId}`;
  
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) progressMap = JSON.parse(saved);
  } catch (e) {}

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/readingProgress`;
    try {
      const colRef = collection(db, 'users', userId, 'profiles', targetProfileId, 'readingProgress');
      const snap = await getDocs(colRef);
      progressMap = {};
      snap.forEach((docSnap) => {
        progressMap[docSnap.id] = docSnap.data() as { textsCompleted: number; lastReadAt?: number };
      });
      localStorage.setItem(localKey, JSON.stringify(progressMap));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  }

  return progressMap;
}

export async function incrementReadingProgress(
  userId: string,
  level: CEFRLevel,
  profileId?: string
): Promise<Record<string, { textsCompleted: number; lastReadAt?: number }>> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  const localKey = `raccoonary_reading_progress_${targetProfileId}`;
  
  let current: Record<string, { textsCompleted: number; lastReadAt?: number }> = {};
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) current = JSON.parse(saved);
  } catch (e) {}

  const prevCount = current[level]?.textsCompleted || 0;
  const updatedEntry = {
    textsCompleted: prevCount + 1,
    lastReadAt: Date.now(),
  };
  current[level] = updatedEntry;

  try {
    localStorage.setItem(localKey, JSON.stringify(current));
  } catch (e) {}

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/readingProgress/${level}`;
    try {
      const docRef = doc(db, 'users', userId, 'profiles', targetProfileId, 'readingProgress', level);
      await setDoc(docRef, updatedEntry, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  return current;
}

// ------------------- LEVEL TESTS -------------------
export async function fetchLevelTests(userId: string, profileId?: string): Promise<any[]> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  let history: any[] = [];
  try {
    const saved = localStorage.getItem('raccoonary_level_test_history');
    if (saved) history = JSON.parse(saved);
  } catch (e) {}

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/levelTests`;
    try {
      const colRef = collection(db, 'users', userId, 'profiles', targetProfileId, 'levelTests');
      const snap = await getDocs(colRef);
      const remoteList: any[] = [];
      snap.forEach((docSnap) => {
        remoteList.push(docSnap.data());
      });
      if (remoteList.length > 0) {
        history = remoteList.sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0));
        localStorage.setItem('raccoonary_level_test_history', JSON.stringify(history));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  }

  return history;
}

export async function saveLevelTestResult(
  userId: string,
  result: any,
  profileId?: string
): Promise<void> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  try {
    const saved = localStorage.getItem('raccoonary_level_test_history');
    const existing = saved ? JSON.parse(saved) : [];
    const updated = [result, ...existing];
    localStorage.setItem('raccoonary_level_test_history', JSON.stringify(updated));
  } catch (e) {}

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/levelTests/${result.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'profiles', targetProfileId, 'levelTests', result.id);
      await setDoc(docRef, result, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}

// ------------------- SCENARIOS -------------------
export async function fetchScenarios(userId: string, profileId?: string): Promise<Record<string, ScenarioRecord>> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  let scenarioMap: Record<string, ScenarioRecord> = {};
  const localKey = `raccoonary_scenarios_${targetProfileId}`;

  try {
    const saved = localStorage.getItem(localKey);
    if (saved) scenarioMap = JSON.parse(saved);
  } catch (e) {}

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/scenarios`;
    try {
      const colRef = collection(db, 'users', userId, 'profiles', targetProfileId, 'scenarios');
      const snap = await getDocs(colRef);
      scenarioMap = {};
      snap.forEach((docSnap) => {
        scenarioMap[docSnap.id] = {
          scenarioId: docSnap.id,
          ...(docSnap.data() as Omit<ScenarioRecord, 'scenarioId'>),
        };
      });
      localStorage.setItem(localKey, JSON.stringify(scenarioMap));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  }

  return scenarioMap;
}

export async function saveScenarioRecord(
  userId: string,
  scenarioId: string,
  record: Partial<ScenarioRecord> & { nome: string; status: 'in_corso' | 'completato' },
  profileId?: string
): Promise<Record<string, ScenarioRecord>> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  const localKey = `raccoonary_scenarios_${targetProfileId}`;

  let current: Record<string, ScenarioRecord> = {};
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) current = JSON.parse(saved);
  } catch (e) {}

  const existing = current[scenarioId];
  const updatedEntry: ScenarioRecord = {
    scenarioId,
    nome: record.nome || existing?.nome || scenarioId,
    status: record.status,
    volteCompletato: record.volteCompletato ?? (existing ? existing.volteCompletato + (record.status === 'completato' ? 1 : 0) : (record.status === 'completato' ? 1 : 0)),
    ultimaPraticaIl: record.ultimaPraticaIl ?? Date.now(),
  };

  current[scenarioId] = updatedEntry;

  try {
    localStorage.setItem(localKey, JSON.stringify(current));
  } catch (e) {}

  if (db && !userId.startsWith('local_user_')) {
    const path = `users/${userId}/profiles/${targetProfileId}/scenarios/${scenarioId}`;
    try {
      const docRef = doc(db, 'users', userId, 'profiles', targetProfileId, 'scenarios', scenarioId);
      await setDoc(docRef, updatedEntry, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  return current;
}

// ------------------- RESET UTILS -------------------
export async function resetAllData(userId: string, profileId?: string): Promise<void> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  localStorage.removeItem(LOCAL_USER_KEY);
  localStorage.removeItem(LOCAL_VOCAB_KEY);
  localStorage.removeItem(LOCAL_GRAMMAR_KEY);
  localStorage.removeItem('raccoonary_level_test_history');

  if (db && !userId.startsWith('local_user_')) {
    const subcollections = ['vocabItems', 'grammarProgress', 'readingProgress', 'levelTests'];
    for (const sub of subcollections) {
      const path = `users/${userId}/profiles/${targetProfileId}/${sub}`;
      try {
        const colRef = collection(db, 'users', userId, 'profiles', targetProfileId, sub);
        const snap = await getDocs(colRef);
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }

    // Reset profile doc metrics
    const profileRef = doc(db, 'users', userId, 'profiles', targetProfileId);
    await setDoc(
      profileRef,
      {
        targetLanguage: targetProfileId,
        streakCount: 0,
        totalAcorns: 0,
        currentLevel: null,
        lastActiveDate: new Date().toISOString().split('T')[0],
        reminderEnabled: false,
        reminderTime: '20:00',
        onboardingCompleted: true,
        lastTestDate: null,
      },
      { merge: true }
    );
  }

  const freshUser: UserProfile = {
    userId,
    createdAt: Date.now(),
    streakCount: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalAcorns: 0,
    reminderEnabled: false,
    reminderTime: '20:00',
    onboardingCompleted: true,
    activeProfileId: targetProfileId,
  };

  await updateUserProfile(freshUser);
}

export async function adminResetTestData(userId: string, profileId?: string): Promise<void> {
  const targetProfileId = profileId || getLocalUserProfile().activeProfileId || 'en';
  localStorage.removeItem(LOCAL_USER_KEY);
  localStorage.removeItem(LOCAL_VOCAB_KEY);
  localStorage.removeItem(LOCAL_GRAMMAR_KEY);
  localStorage.removeItem('raccoonary_level_test_history');
  localStorage.removeItem('raccoonary_grammar_progress');
  localStorage.removeItem('raccoonary_last_active_topic');

  if (db && !userId.startsWith('local_user_')) {
    const subcollections = ['vocabItems', 'grammarProgress', 'readingProgress', 'levelTests'];
    for (const sub of subcollections) {
      const path = `users/${userId}/profiles/${targetProfileId}/${sub}`;
      try {
        const colRef = collection(db, 'users', userId, 'profiles', targetProfileId, sub);
        const snap = await getDocs(colRef);
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }

    // Reset target profile document only
    const profileRef = doc(db, 'users', userId, 'profiles', targetProfileId);
    await setDoc(
      profileRef,
      {
        targetLanguage: targetProfileId,
        streakCount: 0,
        totalAcorns: 0,
        currentLevel: null,
        lastActiveDate: new Date().toISOString().split('T')[0],
        reminderEnabled: false,
        reminderTime: '20:00',
        onboardingCompleted: true,
        lastTestDate: null,
      },
      { merge: true }
    );
  }

  const refreshedUser = await fetchUserProfile(userId);
  saveLocalUserProfile(refreshedUser);
}

export async function adminSimulateNewUser(userId: string): Promise<void> {
  // 1. Clear all localStorage
  localStorage.clear();

  // 2. Clear Firestore user document and all subcollections
  if (db && userId && !userId.startsWith('local_user_')) {
    try {
      const profilesCol = collection(db, 'users', userId, 'profiles');
      let profilesSnap;
      try {
        profilesSnap = await getDocs(profilesCol);
      } catch (e) {}

      const profileIds = new Set<string>();
      if (profilesSnap) {
        profilesSnap.forEach((docSnap) => profileIds.add(docSnap.id));
      }
      ['en', 'es', 'fr', 'de', 'pt'].forEach((id) => profileIds.add(id));

      const subcollections = ['vocabItems', 'grammarProgress', 'readingProgress', 'levelTests'];

      for (const pId of profileIds) {
        for (const sub of subcollections) {
          try {
            const subColRef = collection(db, 'users', userId, 'profiles', pId, sub);
            const subSnap = await getDocs(subColRef);
            for (const docSnap of subSnap.docs) {
              await deleteDoc(docSnap.ref);
            }
          } catch (e) {}
        }
        try {
          const profileDocRef = doc(db, 'users', userId, 'profiles', pId);
          await deleteDoc(profileDocRef);
        } catch (e) {}
      }

      try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
      } catch (e) {}
    } catch (e) {
      console.error('Error during adminSimulateNewUser:', e);
    }
  }
}

export async function deleteLanguageProfile(userId: string, targetLanguage: string): Promise<void> {
  if (db && !userId.startsWith('local_user_')) {
    const subcollections = ['vocabItems', 'grammarProgress', 'readingProgress', 'levelTests'];
    for (const sub of subcollections) {
      const path = `users/${userId}/profiles/${targetLanguage}/${sub}`;
      try {
        const colRef = collection(db, 'users', userId, 'profiles', targetLanguage, sub);
        const snap = await getDocs(colRef);
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }
    const profileRef = doc(db, 'users', userId, 'profiles', targetLanguage);
    try {
      await deleteDoc(profileRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${userId}/profiles/${targetLanguage}`);
    }
  }
}

export async function fetchSharedContent(
  nativeLang: string = 'it',
  targetLang: string = 'en'
): Promise<SharedLanguagePairContent> {
  const pairId = `${nativeLang}_${targetLang}`;

  if (db) {
    try {
      const docRef = doc(db, 'sharedContent', pairId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        return snap.data() as SharedLanguagePairContent;
      }

      if (nativeLang === 'it' && targetLang === 'en') {
        try {
          await setDoc(docRef, SEED_IT_EN_CONTENT);
        } catch (e) {
          console.warn('Could not save seed to Firestore:', e);
        }
        return SEED_IT_EN_CONTENT;
      }

      const nativeName = NATIVE_LANGUAGES.find((l) => l.code === nativeLang)?.name || nativeLang;
      const targetName = TARGET_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang;

      const res = await fetch('/api/generate-shared-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nativeLang, targetLang, nativeName, targetName }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate shared content for ${pairId}`);
      }

      const generatedContent: SharedLanguagePairContent = await res.json();

      try {
        await setDoc(docRef, generatedContent);
      } catch (e) {
        console.warn('Could not save shared content to Firestore:', e);
      }

      return generatedContent;
    } catch (e) {
      console.error(`Error fetching/generating shared content for ${pairId}:`, e);
    }
  }

  return SEED_IT_EN_CONTENT;
}

export async function fetchUITranslations(nativeLang: string = 'it'): Promise<UITranslationSet> {
  const code = nativeLang.toLowerCase();

  if (db) {
    try {
      const docRef = doc(db, 'translations', code);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data && data.strings) {
          return {
            langCode: code,
            strings: data.strings,
            generatedAt: data.generatedAt,
          };
        }
      }

      if (code === 'it') {
        const itSet: UITranslationSet = {
          langCode: 'it',
          strings: IT_TRANSLATIONS,
          generatedAt: Date.now(),
        };
        try {
          await setDoc(docRef, itSet);
        } catch (e) {
          console.warn('Could not save IT translations to Firestore:', e);
        }
        return itSet;
      }

      const nativeName = NATIVE_LANGUAGES.find((l) => l.code === code)?.name || code;

      const res = await fetch('/api/generate-ui-translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nativeLang: code,
          nativeName,
          masterTranslations: IT_TRANSLATIONS,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate UI translations for ${code}`);
      }

      const generated: UITranslationSet = await res.json();

      try {
        await setDoc(docRef, generated);
      } catch (e) {
        console.warn(`Could not save ${code} translations to Firestore:`, e);
      }

      return generated;
    } catch (e) {
      console.error(`Error fetching/generating UI translations for ${code}:`, e);
    }
  }

  return {
    langCode: code,
    strings: IT_TRANSLATIONS,
    generatedAt: Date.now(),
  };
}

