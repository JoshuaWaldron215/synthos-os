/**
 * Hook for live, real-time notifications.
 *
 * Notifications are fired from genuine activity — for example
 * `receiveTeamMessage` pushes an in-app + OS notification when a teammate
 * sends a message. There is intentionally no fabricated/demo event generator:
 * a real workspace should only surface real events.
 *
 * Realtime delivery is wired in the store: `hydrate()` calls `startRealtime()`
 * (src/store/slices/data.ts), which subscribes to Supabase Realtime via the
 * repo and routes inbound rows through `receiveTeamMessage` and the other
 * store actions — so the rest of the app lights up automatically.
 */
export function useLiveNotifications() {
  // No-op today: live events flow through store actions triggered by real
  // activity (see startRealtime in the data slice).
}
