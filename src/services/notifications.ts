/**
 * Service for managing Browser Notifications and Push Reminders
 */

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
  isIOSDevice: boolean;
  isStandalonePWA: boolean;
}

export function getNotificationStatus(): NotificationStatus {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const permission: NotificationPermission = supported ? Notification.permission : 'denied';
  
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  
  const isStandalonePWA =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  return {
    supported,
    permission,
    isIOSDevice,
    isStandalonePWA,
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

export function sendRaccoonNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    new Notification(title, {
      icon: '/icon.png',
      badge: '/icon.png',
      body: options?.body || '🦝 La tua tana ti aspetta! Entra per ripassare i vocaboli di oggi.',
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
      sendRaccoonNotification('🦝 Ora di studiare su Raccoonary!', {
        body: 'La tua tana ti aspetta! Mantieni viva la tua streak e raccogli ghiande 🌰.',
      });
    }
  }, 30000); // Check every 30s
}
