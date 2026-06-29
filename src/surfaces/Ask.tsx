import { Icon } from "../lib/Icon";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import platesImg from "../assets/plates.png";

const SUGGESTIONS = [
  "summarize what's blocked",
  "draft today\u2019s standup",
  "what shipped this week?",
  "estimate revenue this month",
];

export function Ask() {
  const isMobile = useIsMobile();
  const chat = useStore((s) => s.chat);
  const chatInput = useStore((s) => s.chatInput);
  const setChatInput = useStore((s) => s.setChatInput);
  const sendChat = useStore((s) => s.sendChat);
  const ask = useStore((s) => s.ask);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "62vh" }} className="anim-sc">
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <img src={platesImg} alt="" style={{ width: 120, height: "auto", marginBottom: 2 }} />
        <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600, marginBottom: 8 }}>08 · ask ai</div>
        <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 26, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.12 }}>
          what do you want to <i style={{ fontWeight: 600 }}>know?</i>
        </h1>
        <p style={{ margin: "7px 0 0", fontSize: 13.5, color: "rgba(11,15,25,.5)" }}>grounded in your projects, tasks and vault.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, marginBottom: 16 }}>
        {chat.map((m, i) => {
          const me = m.role === "me";
          return (
            <div key={i} style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "80%",
                  fontSize: 14,
                  lineHeight: 1.55,
                  padding: "13px 16px",
                  borderRadius: me ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  whiteSpace: "pre-wrap",
                  animation: "msgIn .25s ease",
                  background: me ? "#0B0F19" : "#fff",
                  color: me ? "#fff" : "#0B0F19",
                  border: me ? "none" : "1px solid rgba(11,15,25,.06)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} className="hov-soft" onClick={() => ask(s)} style={{ background: "#fff", border: "1px solid rgba(11,15,25,.09)", borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 500, color: "rgba(11,15,25,.7)" }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 9, background: "#fff", border: "1px solid rgba(11,15,25,.1)", borderRadius: 18, padding: "9px 9px 9px 16px", boxShadow: "0 4px 20px -10px rgba(11,15,25,.18)", position: "sticky", bottom: 8 }}>
        <textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendChat();
            }
          }}
          rows={1}
          placeholder="ask synthos anything…"
          style={{ flex: 1, border: "none", resize: "none", fontSize: 14.5, lineHeight: 1.5, color: "#0B0F19", background: "transparent", padding: "6px 0", maxHeight: 120 }}
        />
        <button onClick={sendChat} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, background: "#0B0F19", border: "none", borderRadius: 12, flex: "0 0 auto" }}>
          <Icon name="send" size={17} sw={1.8} color="#fff" />
        </button>
      </div>
    </div>
  );
}
