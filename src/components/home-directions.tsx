"use client";

/* Homepage prototype: three creative directions on one page, switchable.
   Dummy data follows the research notes (rounds 1-3): parent collections,
   auto-filed groups (series/author) plus custom groups, every edition as its
   own book entity, status pills under every cover in the rail view, and
   renameable collections. Horizontal scrolling of covers is the tested
   winner, so every direction keeps it. */

import * as React from "react";
import { toast } from "sonner";
import {
  ChevronRightIcon,
  PencilSquareIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GENRE_COLORS } from "@/lib/library";
import { cn } from "cn";

type Pill = "Read" | "On shelf" | "Wishlist";

type ProtoBook = {
  id: string;
  t: string;
  a: string;
  g: string;
  pill: Pill;
  ed?: string;
  c?: string;
};

type ProtoGroup = { name: string; auto: boolean; books: ProtoBook[] };

type ProtoCol = { id: string; name: string; groups: ProtoGroup[] };

type SharedApi = {
  cols: ProtoCol[];
  onRename: (colId: string, name: string) => void;
  onNewGroup: (colId: string) => void;
  onNewCol: () => void;
  onOpenBook: (b: ProtoBook) => void;
  onViewAll: (col: ProtoCol) => void;
};

const DIR_KEY = "shelfside-home-dir";

/* The chosen direction lives in localStorage, so read it the external-store
   way: server snapshot stays "a", the client snapshot hydrates cleanly. */
let cachedDir: DirId | null = null;
function subscribeDir(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function getDirSnapshot(): DirId {
  if (cachedDir) return cachedDir;
  try {
    const saved = localStorage.getItem(DIR_KEY);
    cachedDir = saved === "b" || saved === "c" ? saved : "a";
  } catch {
    cachedDir = "a";
  }
  return cachedDir;
}

const DIRECTIONS = [
  { id: "a", label: "A · Reading room" },
  { id: "b", label: "B · Desk" },
  { id: "c", label: "C · Bookshop window" },
] as const;

type DirId = (typeof DIRECTIONS)[number]["id"];

/* Dummy data straight from the research notes: parent collections named like
   genres plus "Special editions"; groups auto-filed by series with custom
   groups alongside; each edition is its own book entity. */

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

const INITIAL_COLS: ProtoCol[] = [
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

/* Shared pieces */

function Cover({
  b,
  size,
  className,
}: {
  b: ProtoBook;
  size: "sm" | "md" | "lg";
  className?: string;
}) {
  const base = b.c || GENRE_COLORS[b.g] || GENRE_COLORS.Other;
  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col justify-between overflow-hidden rounded-[3px_6px_6px_3px] p-2 select-none",
        "shadow-[inset_-4px_0_8px_rgba(0,0,0,0.45),0_4px_10px_rgba(0,0,0,0.4)]",
        className
      )}
      style={{ background: `linear-gradient(160deg, ${base}, #1a130b 135%)` }}
    >
      <div className="pointer-events-none absolute inset-[5px] rounded-[2px] border border-[#f4ead6]/25" />
      <div className="relative flex flex-col items-start gap-1">
        <p
          className={cn(
            "font-serif leading-tight text-balance text-[#f4ead6]",
            size === "sm" && "text-[11px]",
            size === "md" && "text-sm",
            size === "lg" && "text-base"
          )}
        >
          {b.t}
        </p>
        {b.ed ? (
          <span
            className={cn(
              "rounded-full border border-[#f4ead6]/25 bg-[#f4ead6]/10 px-1.5 text-[#f4ead6]/85",
              size === "sm" ? "text-[8px]" : "text-[9px]"
            )}
          >
            {b.ed}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "relative font-serif italic text-[#f4ead6]/70",
          size === "sm" ? "hidden" : size === "md" ? "text-[11px]" : "text-xs"
        )}
      >
        {b.a}
      </p>
    </div>
  );
}

function StatusPill({ pill }: { pill: Pill }) {
  if (pill === "Read") {
    return <Badge className="h-4.5 px-1.5 text-[10px]">Read</Badge>;
  }
  if (pill === "Wishlist") {
    return (
      <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">
        <i className="size-1.5 rounded-full bg-[#d4a0d8]" aria-hidden />
        Wishlist
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">
      On shelf
    </Badge>
  );
}

function ColTitle({
  col,
  onRename,
  className,
}: {
  col: ProtoCol;
  onRename: SharedApi["onRename"];
  className?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(col.name);

  function commit() {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== col.name) onRename(col.id, name);
    else setDraft(col.name);
  }

  if (editing) {
    return (
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(col.name);
            setEditing(false);
          }
        }}
        className="h-8 w-44 rounded-lg px-2 text-base"
        aria-label="Collection name"
      />
    );
  }
  return (
    <span className={cn("flex min-w-0 items-baseline gap-1", className)}>
      <span className="truncate font-serif">{col.name}</span>
      <button
        type="button"
        aria-label={`Rename ${col.name}`}
        onClick={() => {
          setDraft(col.name);
          setEditing(true);
        }}
        className="text-muted-foreground/70 transition-colors hover:text-primary"
      >
        <PencilSquareIcon className="size-4" />
      </button>
    </span>
  );
}

/* The rename input needs focus when it appears; a ref callback avoids the
   autoFocus lint rule. */
function focusRef(el: HTMLInputElement | null) {
  el?.focus();
  el?.select();
}

function EmptySlot({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border-2 border-dashed border-border/70 text-muted-foreground/60",
        className
      )}
    >
      <span className="px-2 text-center text-[11px] leading-tight">{label}</span>
    </div>
  );
}

function Rail({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "flex overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

function ViewAll({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-0.5 text-sm text-primary"
    >
      View all
      <ChevronRightIcon className="size-3.5" />
    </button>
  );
}

function bookCount(col: ProtoCol) {
  const n = col.groups.reduce((sum, g) => sum + g.books.length, 0);
  const gs = col.groups.length;
  return (
    <span className="shrink-0 text-sm text-muted-foreground">
      {n} book{n === 1 ? "" : "s"} · {gs} group{gs === 1 ? "" : "s"}
    </span>
  );
}

/* Direction A — Reading room: full-bleed serif editorial, one horizontal
   cover rail per collection with inline group segments. */

function DirectionA({ cols, onRename, onNewGroup, onNewCol, onOpenBook, onViewAll }: SharedApi) {
  return (
    <div className="pb-4">
      <header className="px-4 pt-5 pb-3">
        <h1 className="font-serif text-2xl">Your library</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          One rail per collection, filed by series
        </p>
      </header>
      {cols.map((col) => (
        <section key={col.id} aria-label={col.name} className="mb-6">
          <div className="flex items-baseline gap-2 px-4">
            <ColTitle col={col} onRename={onRename} className="text-lg" />
            {bookCount(col)}
            <span className="ml-auto">
              <ViewAll onClick={() => onViewAll(col)} />
            </span>
          </div>
          <Rail className="mt-2.5 items-stretch gap-5 px-4">
            {col.groups.map((g) => (
              <div key={g.name} className="flex shrink-0 items-stretch gap-2">
                <div className="flex w-6 shrink-0 flex-col items-center justify-between rounded-md border border-border bg-card py-1.5">
                  <span className="[writing-mode:vertical-rl] text-[11px] tracking-wide text-muted-foreground">
                    {g.name}
                  </span>
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      g.auto ? "bg-primary/60" : "bg-[#d4a0d8]"
                    )}
                    aria-hidden
                    title={g.auto ? "Auto-sorted" : "Custom group"}
                  />
                </div>
                {g.books.length === 0 ? (
                  <EmptySlot label="No books yet" className="h-[156px] w-[104px]" />
                ) : (
                  g.books.map((bk) => (
                    <button
                      key={bk.id}
                      type="button"
                      onClick={() => onOpenBook(bk)}
                      className="flex w-[104px] shrink-0 flex-col items-center gap-1.5 text-left"
                    >
                      <Cover b={bk} size="md" className="h-[156px] w-full" />
                      <StatusPill pill={bk.pill} />
                    </button>
                  ))
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => onNewGroup(col.id)}
              className="flex w-8 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/70 transition-colors hover:border-primary hover:text-primary"
              aria-label={`New group in ${col.name}`}
            >
              <PlusIcon className="size-4" />
            </button>
          </Rail>
        </section>
      ))}
      <div className="px-4">
        <Button
          variant="outline"
          className="w-full justify-center border-dashed"
          onClick={onNewCol}
        >
          <PlusIcon data-icon="inline-start" />
          New collection
        </Button>
      </div>
    </div>
  );
}

/* Direction B — Desk: compact cards, one per collection, with group tabs
   filtering the rail. */

function DirectionB({ cols, onRename, onNewGroup, onNewCol, onOpenBook, onViewAll }: SharedApi) {
  const [tab, setTab] = React.useState<Record<string, number>>({});

  return (
    <div className="pb-4">
      <header className="px-4 pt-5 pb-3">
        <h1 className="font-serif text-2xl">Your library</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Compact cards, switch groups inside each collection
        </p>
      </header>
      {cols.map((col) => {
        const idx = Math.min(tab[col.id] ?? 0, col.groups.length - 1);
        const active = col.groups[idx];
        return (
          <section
            key={col.id}
            aria-label={col.name}
            className="mx-4 mb-4 rounded-2xl border border-border bg-card p-3"
          >
            <div className="flex items-baseline gap-2">
              <ColTitle col={col} onRename={onRename} className="text-lg" />
              {bookCount(col)}
              <span className="ml-auto">
                <ViewAll onClick={() => onViewAll(col)} />
              </span>
            </div>
            <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {col.groups.map((g, i) => (
                <Button
                  key={g.name}
                  size="xs"
                  variant={i === idx ? "secondary" : "ghost"}
                  className="shrink-0"
                  onClick={() => setTab((t) => ({ ...t, [col.id]: i }))}
                >
                  {g.name}
                </Button>
              ))}
              <Button
                size="xs"
                variant="ghost"
                className="shrink-0 text-muted-foreground"
                onClick={() => onNewGroup(col.id)}
              >
                <PlusIcon data-icon="inline-start" />
                New group
              </Button>
            </div>
            <Rail className="mt-2.5 items-end gap-2.5 px-0.5">
              {active.books.length === 0 ? (
                <EmptySlot label="No books in this group yet" className="h-[126px] w-full" />
              ) : (
                active.books.map((bk) => (
                  <button
                    key={bk.id}
                    type="button"
                    onClick={() => onOpenBook(bk)}
                    className="flex w-[84px] shrink-0 flex-col items-center gap-1 text-left"
                  >
                    <Cover b={bk} size="sm" className="h-[126px] w-full" />
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <i
                        className={cn(
                          "size-1.5 rounded-full",
                          bk.pill === "Read" && "bg-primary",
                          bk.pill === "On shelf" && "bg-muted-foreground/50",
                          bk.pill === "Wishlist" && "bg-[#d4a0d8]"
                        )}
                        aria-hidden
                      />
                      {bk.pill}
                    </span>
                  </button>
                ))
              )}
            </Rail>
          </section>
        );
      })}
      <div className="px-4">
        <Button
          variant="outline"
          className="w-full justify-center border-dashed"
          onClick={onNewCol}
        >
          <PlusIcon data-icon="inline-start" />
          New collection
        </Button>
      </div>
    </div>
  );
}

/* Direction C — Bookshop window: immersive wooden bays with large standing
   covers, group bookends, pills resting on the shelf. */

function DirectionC({ cols, onRename, onNewGroup, onNewCol, onOpenBook, onViewAll }: SharedApi) {
  return (
    <div className="pb-4">
      <header className="px-4 pt-5 pb-3">
        <h1 className="font-serif text-2xl">Your library</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your collections, shelved like a bookshop window
        </p>
      </header>
      {cols.map((col) => (
        <section key={col.id} aria-label={col.name} className="mb-7">
          <div className="flex items-baseline gap-2 px-4">
            <ColTitle col={col} onRename={onRename} className="text-xl" />
            {bookCount(col)}
            <span className="ml-auto">
              <ViewAll onClick={() => onViewAll(col)} />
            </span>
          </div>
          <div
            className="mt-3 border-y border-[#54422a]/80 px-4 py-4"
            style={{ background: "linear-gradient(180deg, #2b2014, #1c1409)" }}
          >
            <Rail className="items-end gap-6">
              {col.groups.map((g) => (
                <div key={g.name} className="flex shrink-0 items-end gap-4">
                  <div className="flex w-7 shrink-0 flex-col items-center justify-end gap-1 self-stretch">
                    <span className="[writing-mode:vertical-rl] font-serif text-sm italic text-[#d9c9a8]/85">
                      {g.name}
                    </span>
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        g.auto ? "bg-[#c9a86a]/70" : "bg-[#d4a0d8]"
                      )}
                      aria-hidden
                      title={g.auto ? "Auto-sorted" : "Custom group"}
                    />
                  </div>
                  {g.books.length === 0 ? (
                    <EmptySlot label="No books yet" className="h-[200px] w-[132px] border-[#54422a] text-[#d9c9a8]/50" />
                  ) : (
                    g.books.map((bk, i) => (
                      <button
                        key={bk.id}
                        type="button"
                        onClick={() => onOpenBook(bk)}
                        className="flex shrink-0 flex-col items-center gap-1.5 text-left"
                        style={{ marginTop: i % 2 === 0 ? 0 : 10 }}
                      >
                        <Cover
                          b={bk}
                          size="lg"
                          className={cn(
                            "w-[132px]",
                            i % 2 === 0 ? "h-[200px]" : "h-[190px]"
                          )}
                        />
                        <StatusPill pill={bk.pill} />
                      </button>
                    ))
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => onNewGroup(col.id)}
                className="flex h-[200px] w-9 shrink-0 items-center justify-center self-end rounded-md border border-dashed border-[#54422a] text-[#d9c9a8]/60 transition-colors hover:border-primary hover:text-primary"
                aria-label={`New group in ${col.name}`}
              >
                <PlusIcon className="size-4" />
              </button>
            </Rail>
          </div>
          <div
            className="h-2 rounded-b-[3px] border-x border-b border-[#6b5433] bg-[#6b5433]"
            aria-hidden
          />
        </section>
      ))}
      <div className="px-4">
        <Button
          variant="outline"
          className="w-full justify-center border-dashed"
          onClick={onNewCol}
        >
          <PlusIcon data-icon="inline-start" />
          New collection
        </Button>
      </div>
    </div>
  );
}

/* Shell: switcher bar plus the active direction. */

export function HomeDirections() {
  const stored = React.useSyncExternalStore(subscribeDir, getDirSnapshot, () => "a" as DirId);
  const [picked, setPicked] = React.useState<DirId | null>(null);
  const dir = picked ?? stored;
  const [cols, setCols] = React.useState<ProtoCol[]>(INITIAL_COLS);
  const [dialog, setDialog] = React.useState<
    { kind: "group"; colId: string } | { kind: "col" } | null
  >(null);
  const [nameDraft, setNameDraft] = React.useState("");

  function pick(next: DirId) {
    setPicked(next);
    try {
      localStorage.setItem(DIR_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function rename(colId: string, name: string) {
    setCols((cs) => cs.map((c) => (c.id === colId ? { ...c, name } : c)));
  }

  function submitDialog() {
    const name = nameDraft.trim();
    if (!name || !dialog) return;
    if (dialog.kind === "group") {
      setCols((cs) =>
        cs.map((c) =>
          c.id === dialog.colId
            ? { ...c, groups: [...c.groups, { name, auto: false, books: [] }] }
            : c
        )
      );
      toast(`Group "${name}" added`);
    } else {
      setCols((cs) => [...cs, { id: `c-${Date.now()}`, name, groups: [] }]);
      toast(`Collection "${name}" added`);
    }
    setDialog(null);
    setNameDraft("");
  }

  const api: SharedApi = {
    cols,
    onRename: rename,
    onNewGroup: (colId) => {
      setNameDraft("");
      setDialog({ kind: "group", colId });
    },
    onNewCol: () => {
      setNameDraft("");
      setDialog({ kind: "col" });
    },
    onOpenBook: (bk) =>
      toast(`"${bk.t}" opens the detail sheet — not part of this prototype`),
    onViewAll: () =>
      toast("View all opens the list view — not part of this prototype"),
  };

  return (
    <div className="home-proto bg-background text-foreground">
      <div className="sticky top-0 z-30 border-b border-border bg-background/90 px-3 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground">
            Homepage directions
          </span>
          <div className="flex min-w-0 flex-1 gap-1">
            {DIRECTIONS.map((d) => (
              <Button
                key={d.id}
                size="sm"
                variant={dir === d.id ? "secondary" : "ghost"}
                aria-pressed={dir === d.id}
                className="min-w-0 flex-1 px-1.5"
                onClick={() => pick(d.id)}
              >
                <span className="truncate">{d.label}</span>
              </Button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          Dummy data from the research notes · your pick is remembered on this device
        </p>
      </div>
      {dir === "a" ? (
        <DirectionA {...api} />
      ) : dir === "b" ? (
        <DirectionB {...api} />
      ) : (
        <DirectionC {...api} />
      )}

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "group" ? "New group" : "New collection"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "group"
                ? "Custom groups sit alongside the auto-sorted ones and win over them."
                : "Books land here once you add them from the unsorted pool."}
            </DialogDescription>
          </DialogHeader>
          <Input
            ref={focusRef}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitDialog();
            }}
            placeholder={
              dialog?.kind === "group" ? "Group name" : "Collection name"
            }
            aria-label="Name"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={submitDialog}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
