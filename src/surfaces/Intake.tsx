import { useNavigate } from "react-router-dom";
import { Eyebrow } from "../components/Eyebrow";
import { Avatar } from "../components/Avatar";
import { USERS } from "../data/seed";
import { effectiveUser } from "../lib/profile";
import { priDot } from "../lib/style";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";

export function Intake() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const intakeText = useStore((s) => s.intakeText);
  const setIntakeText = useStore((s) => s.setIntakeText);
  const fillSample = useStore((s) => s.fillSample);
  const analyzeIntake = useStore((s) => s.analyzeIntake);
  const intakeBusy = useStore((s) => s.intakeBusy);
  const draftTasks = useStore((s) => s.draftTasks);
  const cycleAssignee = useStore((s) => s.cycleAssignee);
  const clearDraft = useStore((s) => s.clearDraft);
  const addDrafts = useStore((s) => s.addDrafts);
  const profiles = useStore((s) => s.profiles);

  const count = [0, 0, 0];
  (draftTasks || []).forEach((t) => count[t.who]++);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }} className="anim-sc">
      <Eyebrow index="06" label="intake" />
      <h1 style={{ margin: "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
        scope in, <i style={{ fontWeight: 600 }}>tasks out</i>
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "rgba(11,15,25,.5)", maxWidth: 540, lineHeight: 1.5 }}>
        paste a project scope or a call transcript — synthos drafts the tasks and splits them evenly across the studio, by load and skill.
      </p>

      <div style={{ background: "#fff", border: "1px solid rgba(11,15,25,.06)", borderRadius: 18, padding: 16, boxShadow: "0 1px 2px rgba(11,15,25,.04),0 14px 34px -24px rgba(11,15,25,.3)" }}>
        <textarea
          value={intakeText}
          onChange={(e) => setIntakeText(e.target.value)}
          rows={6}
          placeholder="paste the project scope or a call transcript here…"
          style={{ width: "100%", border: "1px solid rgba(11,15,25,.1)", borderRadius: 13, padding: 14, fontSize: 14.5, lineHeight: 1.6, resize: "vertical", minHeight: 150, color: "#0B0F19" }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={fillSample} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", padding: "6px 2px", fontSize: 13, fontWeight: 600, color: "rgba(11,15,25,.6)" }}>
            use a sample transcript ↗
          </button>
          <button onClick={analyzeIntake} style={{ display: "flex", alignItems: "center", gap: 7, background: "#0B0F19", color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", fontSize: 13.5, fontWeight: 600 }}>
            {intakeBusy ? "analyzing…" : "analyze & assign ↗"}
          </button>
        </div>
      </div>

      {draftTasks && (
        <div style={{ marginTop: 22 }} className="anim-sc">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(11,15,25,.42)", fontWeight: 600 }}>
              drafted · {draftTasks.length} tasks · balanced
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {USERS.map((seed) => {
                const u = effectiveUser(seed.id, profiles);
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid rgba(11,15,25,.07)", borderRadius: 999, padding: "4px 11px 4px 4px" }}>
                    <Avatar id={u.id} size={24} />
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{u.first} · {count[u.id]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid rgba(11,15,25,.06)", borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            {draftTasks.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid rgba(11,15,25,.05)" }}>
                <span style={priDot(t.pri)} />
                <span style={{ fontSize: 14, flex: 1, lineHeight: 1.35 }}>{t.title}</span>
                <button onClick={() => cycleAssignee(i)} title="tap to reassign" className="hov-row" style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(11,15,25,.04)", border: "none", borderRadius: 999, padding: "4px 11px 4px 4px", fontFamily: "inherit" }}>
                  <Avatar id={t.who} size={26} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0B0F19" }}>{effectiveUser(t.who, profiles).first}</span>
                  <span style={{ fontSize: 12, color: "rgba(11,15,25,.4)" }}>⤾</span>
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 14 }}>
            <button className="hov-soft" onClick={clearDraft} style={{ background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, padding: "10px 15px", fontSize: 13.5, fontWeight: 600, color: "#0B0F19" }}>
              clear
            </button>
            <button onClick={() => { addDrafts(); navigate("/tasks"); }} style={{ background: "#0B0F19", color: "#fff", border: "none", borderRadius: 12, padding: "10px 17px", fontSize: 13.5, fontWeight: 600 }}>
              add {draftTasks.length} tasks to board ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
