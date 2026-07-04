export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function currentPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : "denied";
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// Prefer showing through the service worker registration (works while backgrounded
// and is required for installed PWAs on some platforms); fall back to a page Notification.
export async function showOSNotification(title: string, body: string, tag?: string, url?: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    tag,
    icon: "/pwa-192x192.png",
    badge: "/badge-96x96.png", // white ✦ silhouette for the Android status bar
    data: { url: url || "/" },
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, options);
  } catch {
    /* noop */
  }
}
