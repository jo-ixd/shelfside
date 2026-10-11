import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCENTS,
  GENRE_COLORS,
  bookWidth,
  colourOf,
  freshState,
  loadState,
  saveState,
  statusLabel,
  statusList,
  STORAGE_KEY,
  type Book,
  type AppState,
} from "./library";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "b1",
    t: "Test Book",
    a: "Test Author",
    g: "Fantasy",
    col: "Living Room",
    shelf: "Shelf A",
    st: "To Read",
    wish: false,
    ...overrides,
  };
}

/* loadState/saveState touch localStorage, which node's environment lacks. */
const backing = new Map<string, string>();
beforeEach(() => {
  backing.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => void backing.set(k, v),
    removeItem: (k: string) => void backing.delete(k),
  });
});

describe("colourOf", () => {
  it("prefers the book's own colour", () => {
    expect(colourOf(makeBook({ c: "#abcdef" }))).toBe("#abcdef");
  });

  it("falls back to the genre colour", () => {
    expect(colourOf(makeBook({ g: "Sci-Fi" }))).toBe(GENRE_COLORS["Sci-Fi"]);
  });

  it("falls back to Other for an unknown genre", () => {
    expect(colourOf(makeBook({ g: "Cookbooks" }))).toBe(GENRE_COLORS.Other);
  });
});

describe("bookWidth", () => {
  it("scales with title length", () => {
    expect(bookWidth("Dune")).toBe(24); // 22 + round(4 * 0.5)
    expect(bookWidth("A Really Extremely Long Book Title Indeed")).toBe(40); // capped at 22 + 18
  });
});

describe("statusLabel", () => {
  it("normalises any Lent* status to Lent out", () => {
    expect(statusLabel(makeBook({ st: "Lent" }))).toBe("Lent out");
    expect(statusLabel(makeBook({ st: "Lent out" }))).toBe("Lent out");
  });

  it("passes other statuses through", () => {
    expect(statusLabel(makeBook({ st: "Reading" }))).toBe("Reading");
  });
});

describe("statusList", () => {
  it("returns wishlist statuses for wishlist books", () => {
    expect(statusList(makeBook({ wish: true }))).toEqual(["Wish", "Ordered"]);
  });

  it("returns shelf statuses for library books", () => {
    expect(statusList(makeBook({ wish: false }))).toEqual([
      "Read",
      "Reading",
      "To Read",
      "Reference",
      "Lent out",
    ]);
  });
});

describe("freshState", () => {
  it("returns the seeded library, wishlist and profile", () => {
    const state = freshState();
    expect(state.books.length).toBeGreaterThan(0);
    expect(state.books.some((b) => b.wish)).toBe(true);
    expect(state.cols.length).toBeGreaterThan(0);
    expect(state.profile).toEqual({ name: "Jake", accent: "Amber" });
  });

  it("seeds the Amber accent from ACCENTS", () => {
    expect(ACCENTS[freshState().profile.accent]).toBeDefined();
  });
});

describe("saveState / loadState", () => {
  it("round-trips state through localStorage", () => {
    const state: AppState = freshState();
    expect(saveState(state)).toBe(true);
    expect(JSON.parse(backing.get(STORAGE_KEY)!)).toEqual(state);
    expect(loadState()).toEqual(state);
  });

  it("falls back to a fresh state when storage is corrupt", () => {
    backing.set(STORAGE_KEY, "not json at all");
    const loaded = loadState();
    expect(loaded).toEqual(freshState());
  });

  it("falls back to a fresh state when a book fails validation", () => {
    const bad = freshState();
    (bad.books[0] as Partial<Book>).wish = "yes" as unknown as boolean;
    backing.set(STORAGE_KEY, JSON.stringify(bad));
    expect(loadState()).toEqual(freshState());
  });
});
