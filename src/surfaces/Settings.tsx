import { useRef } from "react";
import type { ReactNode } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { Avatar } from "../components/Avatar";
import { Icon } from "../lib/Icon";
import { fileToAvatarDataUrl } from "../lib/image";
import { requestNotificationPermission, showOSNotification } from "../lib/notifications";
import { sendServerPush, subscribeToPush, unsubscribeFromPush } from "../lib/push";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { Prefs } from "../types";

function Card({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(11,15,25,.06)", borderRadius: 18, padding: 20, boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600 }}>{title}</div>
      {desc && <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(11,15,25,.5)", lineHeight: 1.5 }}>{desc}</p>}
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(11,15,25,.55)", marginBottom: 6 }}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", border: "1px solid rgba(11,15,25,.12)", borderRadius: 11, padding: "11px 13px", fontSize: 16, color: "#0B0F19", background: "#fff" }}
      />
    </label>
  );
}

function Toggle({ on, onClick, label, sub }: { on: boolean; onClick: () => void; label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid rgba(11,15,25,.05)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "rgba(11,15,25,.45)", marginTop: 1 }}>{sub}</div>}
      </div>
      <button
        onClick={onClick}
        aria-label={label}
        style={{ width: 44, height: 26, borderRadius: 999, border: "none", padding: 3, flex: "0 0 auto", background: on ? "#2FC197" : "rgba(11,15,25,.18)", display: "flex", justifyContent: on ? "flex-end" : "flex-start", transition: "background .15s" }}
      >
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(11,15,25,.3)" }} />
      </button>
    </div>
  );
}

export function Settings() {
  const isMobile = useIsMobile();
  const fileRef = useRef<HTMLInputElement>(null);

  const currentUserId = useStore((s) => s.currentUserId);
  const profiles = useStore((s) => s.profiles);
  const prefs = useStore((s) => s.prefs);
  const updateProfile = useStore((s) => s.updateProfile);
  const setAvatar = useStore((s) => s.setAvatar);
  const updatePrefs = useStore((s) => s.updatePrefs);
  const showRevenue = useStore((s) => s.showRevenue);
  const setShowRevenue = useStore((s) => s.setShowRevenue);
  const notifPermission = useStore((s) => s.notifPermission);
  const setNotifPermission = useStore((s) => s.setNotifPermission);
  const showToast = useStore((s) => s.showToast);

  const p = profiles[currentUserId];
  const myPrefs = prefs[currentUserId];
  const { canInstall, installed, promptInstall } = useInstallPrompt();

  const onPickFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const url = await fileToAvatarDataUrl(file, 256);
      setAvatar(currentUserId, url);
      showToast("profile photo updated ✦");
    } catch {
      showToast("couldn't read that image");
    }
  };

  const togglePush = async () => {
    if (!myPrefs.pushEnabled) {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
      updatePrefs(currentUserId, { pushEnabled: true });
      if (perm === "granted") {
        showOSNotification("notifications on", "you'll get live updates here ✦", "welcome");
        try {
          await subscribeToPush();
          showToast("push enabled · subscribed to live push ✦");
        } catch {
          showToast("push on (local). start the push server for real delivery");
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

  const setPref = (k: keyof Prefs, v: boolean) => updatePrefs(currentUserId, { [k]: v });

  const permLabel =
    notifPermission === "granted" ? "allowed" : notifPermission === "denied" ? "blocked in browser" : "not yet requested";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }} className="anim-sc">
      <Eyebrow index="09" label="account" color="#8A84F0" />
      <h1 style={{ margin: "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
        profile & <i style={{ fontWeight: 600 }}>settings</i>
      </h1>
      <p style={{ margin: "0 0 22px", fontSize: 14, color: "rgba(11,15,25,.5)" }}>your photo, name, notifications and app preferences — saved to this device.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="profile">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
            <Avatar id={currentUserId} size={72} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 7, background: "#0B0F19", color: "#fff", border: "none", borderRadius: 11, padding: "10px 14px", fontSize: 13.5, fontWeight: 600 }}>
                <Icon name="camera" size={16} sw={1.7} color="#fff" /> {p.avatarUrl ? "change photo" : "upload photo"}
              </button>
              {p.avatarUrl && (
                <button onClick={() => { setAvatar(currentUserId, null); showToast("photo removed"); }} className="hov-soft" style={{ background: "#fff", border: "1px solid rgba(11,15,25,.1)", borderRadius: 11, padding: "10px 14px", fontSize: 13.5, fontWeight: 600, color: "#0B0F19" }}>
                  remove
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPickFile(e.target.files?.[0])} />
            </div>
          </div>
          <Field label="real name" value={p.name} onChange={(v) => updateProfile(currentUserId, { name: v })} placeholder="e.g. Josh Waldron" />
          <Field label="username" value={p.username} onChange={(v) => updateProfile(currentUserId, { username: v.toLowerCase().replace(/\s+/g, "") })} placeholder="e.g. josh" />
          <Field label="role" value={p.role} onChange={(v) => updateProfile(currentUserId, { role: v })} placeholder="e.g. engineering" />
          <Field label="email" type="email" value={p.email} onChange={(v) => updateProfile(currentUserId, { email: v })} placeholder="you@synthos.dev" />
          <Field label="github" value={p.github} onChange={(v) => updateProfile(currentUserId, { github: v })} placeholder="e.g. joshwaldron or github.com/joshwaldron" />
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(11,15,25,.55)", marginBottom: 6 }}>bio</span>
            <textarea
              value={p.bio}
              placeholder="a line about what you do — shown on your profile"
              onChange={(e) => updateProfile(currentUserId, { bio: e.target.value })}
              rows={2}
              style={{ width: "100%", border: "1px solid rgba(11,15,25,.12)", borderRadius: 11, padding: "11px 13px", fontSize: 16, color: "#0B0F19", background: "#fff", resize: "vertical", lineHeight: 1.5, fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </label>
          <div style={{ marginBottom: 0 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(11,15,25,.55)", marginBottom: 6 }}>status</span>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {["online", "focusing", "away"].map((st) => {
                const on = p.status === st;
                return (
                  <button key={st} onClick={() => updateProfile(currentUserId, { status: st })} style={{ border: on ? "1px solid rgba(96,200,255,.55)" : "1px solid rgba(11,15,25,.1)", background: on ? "rgba(96,200,255,.12)" : "#fff", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#0B0F19", fontFamily: "inherit" }}>
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card title="notifications" desc="live updates — task assignments, mentions, ships and content.">
          <Toggle
            on={myPrefs.pushEnabled}
            onClick={togglePush}
            label="push notifications"
            sub={"browser permission: " + permLabel}
          />
          <Toggle on={myPrefs.mentions} onClick={() => setPref("mentions", !myPrefs.mentions)} label="mentions & blockers" />
          <Toggle on={myPrefs.taskAssigned} onClick={() => setPref("taskAssigned", !myPrefs.taskAssigned)} label="task assignments & moves" />
          <Toggle on={myPrefs.shipped} onClick={() => setPref("shipped", !myPrefs.shipped)} label="ships & milestones" />
          <Toggle on={myPrefs.content} onClick={() => setPref("content", !myPrefs.content)} label="content pipeline" />
          <Toggle on={myPrefs.sound} onClick={() => setPref("sound", !myPrefs.sound)} label="play a sound" />
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                if (notifPermission === "granted") {
                  showOSNotification("test notification", "this is how live updates will look ✦", "test");
                  showToast("sent a local test notification");
                } else {
                  showToast("enable push first");
                }
              }}
              className="hov-soft"
              style={{ background: "#fff", border: "1px solid rgba(11,15,25,.1)", borderRadius: 11, padding: "9px 14px", fontSize: 13, fontWeight: 600, color: "#0B0F19" }}
            >
              test (local)
            </button>
            <button
              onClick={async () => {
                try {
                  const r = await sendServerPush("Synthos OS", "real push from the server ✦", "server-test");
                  showToast("server pushed to " + r.sent + " device" + (r.sent === 1 ? "" : "s"));
                } catch {
                  showToast("push server unreachable — run: npm run server");
                }
              }}
              style={{ background: "#0B0F19", color: "#fff", border: "none", borderRadius: 11, padding: "9px 14px", fontSize: 13, fontWeight: 600 }}
            >
              test (server push)
            </button>
          </div>
        </Card>

        <Card title="appearance">
          <Toggle on={showRevenue} onClick={() => setShowRevenue(!showRevenue)} label="show revenue" sub="display $/mo on projects and wins" />
        </Card>

        <Card title="install app" desc="add Synthos OS to your home screen for a full-screen, app-like experience with notifications.">
          {installed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#2FC197", fontWeight: 600 }}>
              <Icon name="check" size={18} color="#2FC197" /> installed — running as an app
            </div>
          ) : canInstall ? (
            <button
              onClick={async () => {
                const r = await promptInstall();
                if (r === "accepted") showToast("installing Synthos OS ✦");
              }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#0B0F19", color: "#fff", border: "none", borderRadius: 12, padding: "11px 16px", fontSize: 14, fontWeight: 600 }}
            >
              <Icon name="download" size={18} sw={1.7} color="#fff" /> install Synthos OS
            </button>
          ) : (
            <p style={{ margin: 0, fontSize: 13.5, color: "rgba(11,15,25,.55)", lineHeight: 1.55 }}>
              on iOS, tap the share icon then <b style={{ fontWeight: 600, color: "#0B0F19" }}>Add to Home Screen</b>. on desktop Chrome/Edge, use the install icon in the address bar.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
