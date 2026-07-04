import { useStore } from "../store/useStore";
import { requestNotificationPermission, showOSNotification } from "./notifications";
import { subscribeToPush, unsubscribeFromPush } from "./push";

/**
 * Shared enable/disable flow for push notifications
 * (permission prompt, subscription, toasts). Used by Settings and AccountSheet.
 */
export function usePushToggle() {
  const currentUserId = useStore((s) => s.currentUserId);
  const prefs = useStore((s) => s.prefs);
  const updatePrefs = useStore((s) => s.updatePrefs);
  const setNotifPermission = useStore((s) => s.setNotifPermission);
  const showToast = useStore((s) => s.showToast);

  const enabled = !!prefs[currentUserId]?.pushEnabled;

  const toggle = async () => {
    if (!enabled) {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
      updatePrefs(currentUserId, { pushEnabled: true });
      if (perm === "granted") {
        showOSNotification("notifications on", "you'll get live updates here ✦", "welcome");
        try {
          await subscribeToPush(currentUserId);
          showToast("push notifications enabled ✦");
        } catch {
          showToast("push on (local). run the push server for real delivery");
        }
      } else {
        showToast("allow notifications in your browser to receive push");
      }
    } else {
      updatePrefs(currentUserId, { pushEnabled: false });
      try {
        await unsubscribeFromPush();
      } catch {
        /* noop */
      }
      showToast("push paused");
    }
  };

  return { enabled, toggle };
}
