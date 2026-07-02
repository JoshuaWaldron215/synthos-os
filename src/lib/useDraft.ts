import { useEffect, useRef, useState } from "react";

/**
 * Local draft for a controlled field that commits on blur/unmount instead of
 * every keystroke. Avoids re-serializing the persisted store (and, with
 * Supabase connected, a network upsert) per character typed.
 */
export function useDraft(value: string, commit: (v: string) => void) {
  const [draft, setDraft] = useState(value);
  const dirty = useRef(false);
  const latest = useRef({ draft, commit });
  latest.current = { draft, commit };

  // adopt external changes while not mid-edit
  useEffect(() => {
    if (!dirty.current) setDraft(value);
  }, [value]);

  const onChange = (v: string) => {
    dirty.current = true;
    setDraft(v);
  };

  const flush = () => {
    if (dirty.current) {
      dirty.current = false;
      latest.current.commit(latest.current.draft);
    }
  };

  // pending edits still save if the field unmounts while focused (modal closed)
  useEffect(
    () => () => {
      if (dirty.current) latest.current.commit(latest.current.draft);
    },
    []
  );

  return { draft, onChange, flush };
}
