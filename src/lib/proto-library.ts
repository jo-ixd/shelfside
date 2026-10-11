/* Prototype data for the reworked homepage and collection pages, following
   the research notes: parent collections, groups auto-filed by series with
   custom groups alongside, every edition as its own book entity, and
   Read / On shelf / Wishlist status pills. */

export type Pill = "Read" | "On shelf" | "Wishlist";

export type ProtoBook = {
  id: string;
  t: string;
  a: string;
  g: string;
  pill: Pill;
  ed?: string;
  c?: string;
};

export type ProtoGroup = { name: string; auto: boolean; books: ProtoBook[] };

export type ProtoCol = { id: string; name: string; groups: ProtoGroup[] };

const PROTO_KEY = "shelfside-proto-cols-v1";

function b(
  id: string,
  t: string,
  a: string,
  g: string,
  pill: Pill,
  extra?: Partial<ProtoBook>
): ProtoBook {
  return { id, t, a, g, pill, ...extra };
}

function seed(): ProtoCol[] {
  return [
    {
      id: "c-fantasy",
      name: "Fantasy",
      groups: [
        {
          name: "Empyrean series",
          auto: true,
          books: [
            b("f1", "Fourth Wing", "Rebecca Yarros", "Fantasy", "Read"),
            b("f2", "Iron Flame", "Rebecca Yarros", "Fantasy", "On shelf"),
            b("f3", "Onyx Storm", "Rebecca Yarros", "Fantasy", "On shelf"),
          ],
        },
        {
          name: "The Kingkiller Chronicle",
          auto: true,
          books: [
            b("f4", "The Name of the Wind", "Patrick Rothfuss", "Fantasy", "Read"),
          ],
        },
        {
          name: "Standalone",
          auto: true,
          books: [
            b("f5", "Circe", "Madeline Miller", "Fantasy", "Read"),
            b("f6", "Brimstone", "Callie Hart", "Fantasy", "On shelf"),
            b("f7", "Piranesi", "Susanna Clarke", "Fantasy", "On shelf"),
          ],
        },
      ],
    },
    {
      id: "c-scifi",
      name: "Sci-fi",
      groups: [
        {
          name: "Dune saga",
          auto: true,
          books: [
            b("s1", "Dune", "Frank Herbert", "Sci-Fi", "Read"),
            b("s2", "Dune Messiah", "Frank Herbert", "Sci-Fi", "On shelf"),
          ],
        },
        {
          name: "Standalone",
          auto: true,
          books: [
            b("s3", "Project Hail Mary", "Andy Weir", "Sci-Fi", "Read"),
            b("s4", "The Martian", "Andy Weir", "Sci-Fi", "Read"),
            b("s5", "Snow Crash", "Neal Stephenson", "Sci-Fi", "On shelf"),
            b("s6", "Sea of Rust", "C. Robert Cargill", "Sci-Fi", "On shelf"),
          ],
        },
      ],
    },
    {
      id: "c-special",
      name: "Special editions",
      groups: [
        {
          name: "FairyLoot",
          auto: false,
          books: [
            b("e1", "Fourth Wing", "Rebecca Yarros", "Fantasy", "On shelf", {
              ed: "FairyLoot",
              c: "#3e5a34",
            }),
            b("e2", "Iron Flame", "Rebecca Yarros", "Fantasy", "Wishlist", {
              ed: "FairyLoot",
              c: "#6e4a1f",
            }),
          ],
        },
        {
          name: "Illumicrate",
          auto: false,
          books: [
            b("e3", "Onyx Storm", "Rebecca Yarros", "Fantasy", "Wishlist", {
              ed: "Illumicrate",
              c: "#43314f",
            }),
          ],
        },
        {
          name: "Unsorted",
          auto: true,
          books: [
            b("e4", "The Priory of the Orange Tree", "Samantha Shannon", "Fantasy", "On shelf", {
              ed: "Waterstones",
              c: "#23404a",
            }),
          ],
        },
      ],
    },
  ];
}

function validCols(v: unknown): v is ProtoCol[] {
  return (
    Array.isArray(v) &&
    v.every(
      (c) =>
        c &&
        typeof c === "object" &&
        typeof (c as ProtoCol).id === "string" &&
        typeof (c as ProtoCol).name === "string" &&
        Array.isArray((c as ProtoCol).groups)
    )
  );
}

export function loadCols(): ProtoCol[] {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(PROTO_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (validCols(parsed)) return parsed;
  } catch {
    /* fall through to seed */
  }
  return seed();
}

function saveCols(cols: ProtoCol[]) {
  try {
    localStorage.setItem(PROTO_KEY, JSON.stringify(cols));
  } catch {
    /* private mode etc. */
  }
}

/* Module-level store, same pattern as lib/store.tsx: server snapshot stays
   null so hydration is safe, mutations persist to localStorage. */
let state: ProtoCol[] | null = null;
const listeners = new Set<() => void>();

export function getProtoCols(): ProtoCol[] {
  if (!state) state = loadCols();
  return state;
}

export function getServerProtoCols(): ProtoCol[] | null {
  return null;
}

export function subscribeProtoCols(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function mutateProtoCols(fn: (draft: ProtoCol[]) => void) {
  const draft = JSON.parse(JSON.stringify(getProtoCols())) as ProtoCol[];
  fn(draft);
  state = draft;
  saveCols(draft);
  listeners.forEach((l) => l());
}

export function renameProtoCol(colId: string, name: string) {
  const clean = name.trim();
  if (!clean) return;
  mutateProtoCols((draft) => {
    const col = draft.find((c) => c.id === colId);
    if (col) col.name = clean;
  });
}

export function addProtoGroup(colId: string, name: string) {
  const clean = name.trim();
  if (!clean) return;
  mutateProtoCols((draft) => {
    const col = draft.find((c) => c.id === colId);
    if (col) col.groups.push({ name: clean, auto: false, books: [] });
  });
}

export function addProtoCol(name: string) {
  const clean = name.trim();
  if (!clean) return;
  mutateProtoCols((draft) => {
    draft.push({ id: `c-${Date.now()}`, name: clean, groups: [] });
  });
}
