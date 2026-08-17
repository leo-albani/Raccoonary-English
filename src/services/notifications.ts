/**
 * Service for managing Browser Notifications and Push Reminders
 */

import { savePushTokenToFirestore } from './firebase';

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
  isIOSDevice: boolean;
  isStandalonePWA: boolean;
  canEnableImmediately: boolean;
}

export function getNotificationStatus(): NotificationStatus {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const permission: NotificationPermission = supported ? Notification.permission : 'denied';
  
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
  const isIOSDevice =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  const isStandalonePWA =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  // On iOS, notifications work ONLY in standalone PWA mode (added to Home screen)
  const canEnableImmediately = !isIOSDevice || isStandalonePWA;

  return {
    supported,
    permission,
    isIOSDevice,
    isStandalonePWA,
    canEnableImmediately,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.warn('Notification permission request error:', e);
    return 'denied';
  }
}

/**
 * Registers push notifications and saves the FCM / Push token to Firestore
 */
export async function registerPushNotification(
  userId?: string,
  profileId?: string
): Promise<{ success: boolean; permission: NotificationPermission; token?: string; reason?: string }> {
  const status = getNotificationStatus();

  if (!status.supported) {
    return { success: false, permission: 'denied', reason: 'not_supported' };
  }

  if (status.isIOSDevice && !status.isStandalonePWA) {
    return { success: false, permission: status.permission, reason: 'ios_not_standalone' };
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { success: false, permission, reason: 'permission_denied' };
  }

  let token: string | undefined = undefined;

  try {
    // 1. Try Firebase Cloud Messaging if available
    try {
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      const supported = await isSupported().catch(() => false);
      if (supported) {
        // Register or get service worker
        let swRegistration: ServiceWorkerRegistration | undefined = undefined;
        if ('serviceWorker' in navigator) {
          swRegistration = await navigator.serviceWorker.ready.catch(() => undefined);
          if (!swRegistration) {
            swRegistration = await navigator.serviceWorker.register('/sw.js').catch(() => undefined);
          }
        }

        const messaging = getMessaging();
        token = await getToken(messaging, {
          vapidKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuYtrbvNpBuqxTHdtHMGPr68q8',
          serviceWorkerRegistration: swRegistration,
        }).catch((err) => {
          console.warn('FCM getToken fallback:', err);
          return undefined;
        });
      }
    } catch (fcmErr) {
      console.warn('FCM messaging initialization skipped:', fcmErr);
    }

    // 2. Fallback to Web Push standard subscription endpoint or client identifier
    if (!token && 'serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          token = JSON.stringify(sub.toJSON());
        }
      } catch (pushErr) {
        console.warn('PushManager fallback error:', pushErr);
      }
    }

    // Fallback token identifier if browser does not supply a raw key
    if (!token && userId) {
      token = `web_push_${userId}_${navigator.userAgent.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '')}`;
    }

    // Save token to Firestore if user is authenticated
    if (token && userId) {
      await savePushTokenToFirestore(userId, token, profileId);
    }

    return { success: true, permission: 'granted', token };
  } catch (err) {
    console.warn('Error during push registration:', err);
    return { success: true, permission: 'granted' };
  }
}

export function sendRaccoonNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    new Notification(title, {
      icon: '/icon.png',
      badge: '/icon.png',
      body: options?.body || '🦝 Le tue parole ti aspettano in tana!',
      ...options,
    });
    return true;
  } catch (e) {
    console.warn('Failed to dispatch notification:', e);
    return false;
  }
}

let reminderInterval: number | null = null;

export function setupDailyReminderTimer(reminderTime: string = '20:00'): void {
  if (typeof window === 'undefined') return;
  if (reminderInterval) clearInterval(reminderInterval);

  // Check every minute if current time matches reminderTime
  reminderInterval = window.setInterval(() => {
    if (Notification.permission !== 'granted') return;
    
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (currentHHMM === reminderTime && now.getSeconds() < 10) {
      sendRaccoonNotification('🦝 Raccoonary', {
        body: 'Le tue parole ti aspettano in tana 🦝',
      });
    }
  }, 30000); // Check every 30s
}

