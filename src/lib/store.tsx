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

/* Module-level store backed by localStorage; components read it with
   useSyncExternalStore so server render stays null and hydration is safe. */

let currentState: AppState | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    currentState = loadState();
    initialized = true;
  }
}

function getSnapshot(): AppState | null {
  ensureInit();
  return currentState;
}

function getServerSnapshot(): AppState | null {
  return null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* Mutate a deep clone of the state and persist it; returns false (without
   committing) when localStorage is full, mirroring the prototype's save(). */
function commit(fn: (draft: AppState) => void): boolean {
  ensureInit();
  if (!currentState) return true;
  const draft: AppState = JSON.parse(JSON.stringify(currentState));
  fn(draft);
  if (!saveState(draft)) return false;
  currentState = draft;
  listeners.forEach((l) => l());
  return true;
}

type LibraryContext = {
  state: AppState | null;
  update: (fn: (draft: AppState) => void) => boolean;
  books: Book[];
  cols: Collection[];
};

const LibraryContext = React.createContext<LibraryContext | null>(null);

export function LibraryProvider({ children }: React.PropsWithChildren) {
  const state = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const update = React.useCallback(
    (fn: (draft: AppState) => void) => commit(fn),
    [],
  );

  const value = React.useMemo<LibraryContext>(
    () => ({
      state,
      update,
      books: state?.books ?? [],
      cols: state?.cols ?? [],
    }),
    [state, update],
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

/* Keep the accent in sync with the profile, like the prototype's applyTheme(). */
export function useAccent() {
  const { state } = useLibrary();
  const accent = state ? ACCENTS[state.profile.accent] || ACCENTS.Amber : null;
  React.useEffect(() => {
    if (accent) {
      document.documentElement.style.setProperty("--primary", accent);
      document.documentElement.style.setProperty("--ring", accent);
    } else {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    }
  }, [accent]);
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
