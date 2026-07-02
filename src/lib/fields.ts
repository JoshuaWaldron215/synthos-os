import type { CSSProperties } from "react";

// Shared form-field styles for modal forms (project, key, conversation, …).

export const fieldStyle: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(11,15,25,.1)",
  borderRadius: 12,
  padding: "11px 13px",
  fontSize: 16,
  fontFamily: "inherit",
  color: "#0B0F19",
  boxSizing: "border-box",
};

export const fieldLabelStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "rgba(11,15,25,.45)",
  fontWeight: 700,
  display: "block",
  marginBottom: 7,
};
