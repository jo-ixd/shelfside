"use client";

import * as React from "react";
import {
  ACCENTS,
  loadState,
  saveState,
  type AppState,
  type Book,
  type Collection,
} from "@/lib/library";

type LibraryContext = {
  state: AppState | null;
  /* Mutate a deep clone of the state, then persist; returns false if storage failed. */
  update: (fn: (draft: AppState) => void) => boolean;
  books: Book[];
  cols: Collection[];
};

const LibraryContext = React.createContext<LibraryContext | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState | null>(null);
  const stateRef = React.useRef<AppState | null>(null);

  React.useEffect(() => {
    const loaded = loadState();
    stateRef.current = loaded;
    setState(loaded);
  }, []);

  /* Keep the accent in sync with the profile, like the prototype's applyTheme(). */
  React.useEffect(() => {
    const accent = state ? ACCENTS[state.profile.accent] || ACCENTS.Amber : null;
    if (accent) {
      document.documentElement.style.setProperty("--primary", accent);
      document.documentElement.style.setProperty("--ring", accent);
    } else {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    }
  }, [state?.profile.accent]);

  const update = React.useCallback((fn: (draft: AppState) => void) => {
    const current = stateRef.current;
    if (!current) return true;
    const draft: AppState = JSON.parse(JSON.stringify(current));
    fn(draft);
    const saved = saveState(draft);
    stateRef.current = draft;
    setState(draft);
    return saved;
  }, []);

  const value = React.useMemo<LibraryContext>(
    () => ({
      state,
      update,
      books: state?.books ?? [],
      cols: state?.cols ?? [],
    }),
    [state, update]
  );

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContext {
  const ctx = React.useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}

export function buzz(ms: number) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}
