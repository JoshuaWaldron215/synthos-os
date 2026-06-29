// Client-side Web Push: subscribe the installed/served PWA to real push and
// register the subscription with the local push server (see server/index.mjs).

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await getRegistration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Subscribe to push and register with the server.
 * Throws on failure (e.g. server not running, permission denied).
 */
export async function subscribeToPush(): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error("push not supported in this browser");

  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    const res = await fetch("/api/vapid-public-key");
    if (!res.ok) throw new Error("push server unreachable");
    const { key } = await res.json();
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
  }

  const reg2 = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub }),
  });
  if (!reg2.ok) throw new Error("failed to register subscription");
  return sub;
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  try {
    await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {
    /* server may be down; still unsubscribe locally */
  }
  await sub.unsubscribe();
}

/** Ask the server to broadcast a push to all subscribers (demo/test). */
export async function sendServerPush(title: string, body: string, tag?: string): Promise<{ sent: number; total: number }> {
  const res = await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, tag }),
  });
  if (!res.ok) throw new Error("send failed");
  return res.json();
}
