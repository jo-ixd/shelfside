/* Shelfside data model — ported from the prototype's localStorage state.
   Key: "shelfside-v1". Field names match the prototype (t, a, g, col, shelf…). */

export const STORAGE_KEY = "shelfside-v1";

export type Book = {
  id: string;
  t: string;
  a: string;
  g: string;
  col: string;
  shelf: string;
  st: string;
  wish: boolean;
  prog?: number;
  c?: string;
  w?: number;
  cover?: string;
  spine?: string;
  added?: string;
  _new?: boolean;
};

export type Collection = { name: string; wish: boolean };

export type Profile = { name: string; accent: string };

export type AppState = {
  books: Book[];
  cols: Collection[];
  profile: Profile;
};

export const GENRE_COLORS: Record<string, string> = {
  Fantasy: "#7a2d3e",
  "Sci-Fi": "#2d5f6b",
  Fiction: "#3d5c4f",
  Thriller: "#31353d",
  History: "#7d5a3c",
  Classics: "#3a3a3a",
  "Non-fiction": "#b08d3f",
  Memoir: "#4a6b4f",
  Tech: "#5a4634",
  Poetry: "#6b3d5c",
  Other: "#4d4a45",
};

export const STATUSES = ["Read", "Reading", "To Read", "Reference", "Lent out"];
export const WISH_STATUSES = ["Wish", "Ordered"];

/* Shelf graphics & status colors, carried over from the prototype. */
export const SHELF = {
  gradient: "linear-gradient(#3a2d1c, #2c2213)",
  miniGradient: "linear-gradient(#3a2d1c, #2c2213)",
  border: "#54422a",
  lip: "#6b5433",
};
export const READING_COLOR = "#ffd76a";
export const WISH_COLOR = "#d4a0d8";

export const ACCENTS: Record<string, string> = {
  Amber: "#c9a86a",
  Teal: "#5fb3a1",
  Violet: "#a78bd4",
  Rose: "#d487a8",
};

export const SCAN_MATCHES = [
  { t: "Klara and the Sun", a: "Kazuo Ishiguro", g: "Fiction" },
  { t: "The Priory of the Orange Tree", a: "Samantha Shannon", g: "Fantasy" },
  { t: "Tomorrow, and Tomorrow, and Tomorrow", a: "Gabrielle Zevin", g: "Fiction" },
];

export const LINK_MATCHES: Record<string, { t: string; a: string; g: string }> = {
  amazon: { t: "Klara and the Sun", a: "Kazuo Ishiguro", g: "Fiction" },
  waterstones: {
    t: "Tomorrow, and Tomorrow, and Tomorrow",
    a: "Gabrielle Zevin",
    g: "Fiction",
  },
  bookdepository: {
    t: "The Priory of the Orange Tree",
    a: "Samantha Shannon",
    g: "Fantasy",
  },
};

type SeedBook = {
  t: string;
  a: string;
  g: string;
  col: string;
  shelf: string;
  st: string;
  prog?: number;
  cover?: string;
  spine?: string;
};

const SEED_LIB: SeedBook[] = [
  { t: "Fourth Wing", a: "Rebecca Yarros", g: "Fantasy", col: "Living Room", shelf: "Shelf A", st: "Read" },
  { t: "Iron Flame", a: "Rebecca Yarros", g: "Fantasy", col: "Living Room", shelf: "Shelf A", st: "Reading", prog: 45 },
  { t: "Onyx Storm", a: "Rebecca Yarros", g: "Fantasy", col: "Living Room", shelf: "Shelf A", st: "To Read" },
  { t: "The Name of the Wind", a: "Patrick Rothfuss", g: "Fantasy", col: "Living Room", shelf: "Shelf A", st: "Read" },
  { t: "Circe", a: "Madeline Miller", g: "Fantasy", col: "Living Room", shelf: "Shelf A", st: "Reading", prog: 60 },
  { t: "Brimstone", a: "Callie Hart", g: "Fantasy", col: "Living Room", shelf: "Shelf A", st: "To Read", cover: "/covers/brimstone.png", spine: "/covers/brimstone-spine.png" },
  { t: "Educated", a: "Tara Westover", g: "Memoir", col: "Living Room", shelf: "Shelf B", st: "Read" },
  { t: "Gone Girl", a: "Gillian Flynn", g: "Thriller", col: "Living Room", shelf: "Shelf B", st: "Lent out" },
  { t: "The Silent Patient", a: "Alex Michaelides", g: "Thriller", col: "Living Room", shelf: "Shelf B", st: "Read" },
  { t: "Dune", a: "Frank Herbert", g: "Sci-Fi", col: "Living Room", shelf: "Shelf B", st: "Read" },
  { t: "Project Hail Mary", a: "Andy Weir", g: "Sci-Fi", col: "Office", shelf: "Shelf 1", st: "Read" },
  { t: "The Martian", a: "Andy Weir", g: "Sci-Fi", col: "Office", shelf: "Shelf 1", st: "Read" },
  { t: "Snow Crash", a: "Neal Stephenson", g: "Sci-Fi", col: "Office", shelf: "Shelf 1", st: "Read" },
  { t: "The Pragmatic Programmer", a: "Hunt & Thomas", g: "Tech", col: "Office", shelf: "Shelf 1", st: "Reference" },
  { t: "Sapiens", a: "Yuval Noah Harari", g: "History", col: "Office", shelf: "Shelf 2", st: "Reading", prog: 30 },
  { t: "The Wager", a: "David Grann", g: "History", col: "Office", shelf: "Shelf 2", st: "To Read" },
  { t: "1984", a: "George Orwell", g: "Classics", col: "Office", shelf: "Shelf 2", st: "Read" },
  { t: "Brave New World", a: "Aldous Huxley", g: "Classics", col: "Office", shelf: "Shelf 2", st: "Read" },
  { t: "Atomic Habits", a: "James Clear", g: "Non-fiction", col: "Bedroom", shelf: "Shelf", st: "Read" },
  { t: "Why We Sleep", a: "Matthew Walker", g: "Non-fiction", col: "Bedroom", shelf: "Shelf", st: "Read" },
  { t: "Quiet", a: "Susan Cain", g: "Non-fiction", col: "Bedroom", shelf: "Shelf", st: "To Read" },
  { t: "Norwegian Wood", a: "Haruki Murakami", g: "Fiction", col: "Bedroom", shelf: "Shelf", st: "To Read" },
  { t: "Killing Commendatore", a: "Haruki Murakami", g: "Fiction", col: "Bedroom", shelf: "Shelf", st: "Read" },
  { t: "Piranesi", a: "Susanna Clarke", g: "Fantasy", col: "Bedroom", shelf: "Shelf", st: "To Read" },
  { t: "Sea of Rust", a: "C. Robert Cargill", g: "Sci-Fi", col: "Bedroom", shelf: "Shelf", st: "To Read" },
];

const SEED_WISH: SeedBook[] = [
  { t: "Babel", a: "R. F. Kuang", g: "Fantasy", col: "To Buy", shelf: "Shelf A", st: "Wish" },
  { t: "Hyperion", a: "Dan Simmons", g: "Sci-Fi", col: "To Buy", shelf: "Shelf A", st: "Wish" },
  { t: "The Secret History", a: "Donna Tartt", g: "Fiction", col: "To Buy", shelf: "Shelf A", st: "Ordered" },
];

export function freshState(): AppState {
  const books: Book[] = [];
  SEED_LIB.forEach((b, i) =>
    books.push({ ...b, id: "l" + i, wish: false } as Book)
  );
  SEED_WISH.forEach((b, i) =>
    books.push({ ...b, id: "w" + i, wish: true } as Book)
  );
  return {
    books,
    cols: [
      { name: "Living Room", wish: false },
      { name: "Office", wish: false },
      { name: "Bedroom", wish: false },
      { name: "To Buy", wish: true },
    ],
    profile: { name: "Jake", accent: "Amber" },
  };
}

export function loadState(): AppState {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as AppState) : null;
    const okBooks =
      !!parsed &&
      Array.isArray(parsed.books) &&
      parsed.books.every(
        (b) =>
          b &&
          typeof b === "object" &&
          typeof (b as Book).id === "string" &&
          typeof (b as Book).t === "string" &&
          typeof (b as Book).col === "string" &&
          typeof (b as Book).shelf === "string" &&
          typeof (b as Book).st === "string" &&
          typeof (b as Book).wish === "boolean"
      );
    const okCols =
      !!parsed &&
      Array.isArray(parsed.cols) &&
      parsed.cols.every(
        (c) =>
          c &&
          typeof c === "object" &&
          typeof (c as Collection).name === "string" &&
          typeof (c as Collection).wish === "boolean"
      );
    if (
      parsed &&
      okBooks &&
      parsed.profile &&
      typeof parsed.profile === "object" &&
      typeof parsed.profile.accent === "string" &&
      okCols
    )
      return parsed;
  } catch {
    /* fall through to fresh state */
  }
  const fresh = freshState();
  saveState(fresh);
  return fresh;
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function colourOf(b: Book): string {
  return b.c || GENRE_COLORS[b.g] || GENRE_COLORS.Other;
}

export function bookWidth(t: string): number {
  return 22 + Math.min(18, Math.round(t.length * 0.5));
}

export function statusLabel(b: Book): string {
  return b.st.startsWith("Lent") ? "Lent out" : b.st;
}

export function statusList(b: Book): string[] {
  return b.wish ? WISH_STATUSES : STATUSES;
}

/* Generated cover art, same look as the prototype's canvas cover. */
export function makeCover(
  title: string,
  author: string,
  genre: string
): string {
  const c = document.createElement("canvas");
  c.width = 300;
  c.height = 450;
  const x = c.getContext("2d");
  if (!x) return "";
  const base = GENRE_COLORS[genre] || GENRE_COLORS.Other;
  const grd = x.createLinearGradient(0, 0, 300, 450);
  grd.addColorStop(0, base);
  grd.addColorStop(1, "#161009");
  x.fillStyle = grd;
  x.fillRect(0, 0, 300, 450);
  x.strokeStyle = "rgba(255,235,200,.65)";
  x.lineWidth = 2;
  x.strokeRect(12, 12, 276, 426);
  x.strokeStyle = "rgba(255,235,200,.3)";
  x.lineWidth = 1;
  x.strokeRect(18, 18, 264, 414);
  x.fillStyle = "#f4ead6";
  x.textAlign = "center";
  x.font = "700 26px Georgia, serif";
  const words = (title || "Untitled").toUpperCase().split(" ");
  let line = "";
  const lines: string[] = [];
  words.forEach((w) => {
    if ((line + " " + w).trim().length > 13) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  });
  if (line) lines.push(line);
  const startY = 225 - Math.min(lines.length, 5) * 17 + 17;
  lines.slice(0, 5).forEach((l, i) => x.fillText(l, 150, startY + i * 34));
  x.font = "italic 15px Georgia, serif";
  x.fillStyle = "rgba(244,234,214,.8)";
  x.fillText(author || "", 150, 400);
  return c.toDataURL("image/jpeg", 0.8);
}

/* Pick an uploaded image, downscale to max 480px, return a jpeg data URL. */
export function fileToCoverData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = r.result as string;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
