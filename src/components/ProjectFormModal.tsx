import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import type { ProjectStatus } from "../types";
import { ResponsiveModal } from "./ResponsiveModal";

const STATUS: ProjectStatus[] = ["in progress", "in qa", "blocked", "shipped"];

const field: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(11,15,25,.1)",
  borderRadius: 12,
  padding: "11px 13px",
  fontSize: 16,
  fontFamily: "inherit",
  color: "#0B0F19",
  boxSizing: "border-box",
};
const labelStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "rgba(11,15,25,.45)",
  fontWeight: 700,
  display: "block",
  marginBottom: 7,
};

export function ProjectFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const addProject = useStore((s) => s.addProject);
  const [client, setClient] = useState("");
  const [tagline, setTagline] = useState("");
  const [tools, setTools] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("in progress");

  const reset = () => {
    setClient("");
    setTagline("");
    setTools("");
    setStatus("in progress");
  };

  const create = () => {
    if (!client.trim()) return;
    const stack = tools.split(",").map((t) => t.trim()).filter(Boolean);
    const id = addProject({ client, tagline, stack, status });
    reset();
    onClose();
    navigate("/project/" + id);
  };

  return (
    <ResponsiveModal open={open} onClose={onClose} title="new project" width={460}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>client / project name</label>
        <input autoFocus value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. client or product name" style={field} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>tagline</label>
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. commerce replatform" style={field} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>tools (comma separated)</label>
        <input value={tools} onChange={(e) => setTools(e.target.value)} placeholder="Next.js, Supabase, Stripe" style={field} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>status</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STATUS.map((s) => {
            const on = status === s;
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                style={{ border: on ? "1px solid rgba(96,200,255,.55)" : "1px solid rgba(11,15,25,.1)", background: on ? "rgba(96,200,255,.12)" : "#fff", color: "#0B0F19", fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 999, fontFamily: "inherit" }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>
          cancel
        </button>
        <button onClick={create} disabled={!client.trim()} style={{ background: "#0B0F19", color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", opacity: client.trim() ? 1 : 0.5 }}>
          create project ↗
        </button>
      </div>
    </ResponsiveModal>
  );
}
