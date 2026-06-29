/**
 * Hook for live, real-time notifications.
 *
 * Notifications are fired from genuine activity — for example
 * `receiveTeamMessage` pushes an in-app + OS notification when a teammate
 * sends a message. There is intentionally no fabricated/demo event generator:
 * a real workspace should only surface real events.
 *
 * When a realtime backend (e.g. Supabase Realtime) is wired up, subscribe to
 * the relevant channels here and route inbound events through the store's
 * `receiveTeamMessage` / `pushNotification` actions so the rest of the app
 * lights up automatically.
 */
export function useLiveNotifications() {
  // No-op today: live events flow through store actions triggered by real
  // activity. Realtime subscriptions can be attached here later.
}
