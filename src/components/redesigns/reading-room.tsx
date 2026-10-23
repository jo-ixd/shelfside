"use client";

/* Redesign: "Reading Room" — the Collections section as a master–detail
   split. On md+ a sticky rail of collection rows sits left; the right pane
   shows exactly one collection's books as a comfortable cover grid, so
   switching collections never needs a scroll and there is only ever one
   grid in the DOM. On phones the rail collapses into a horizontally
   scrollable pill bar above the same grid. The mini spine-stacks in each
   rail row are the one signature detail; everything else stays quiet. */

import * as React from "react";
import { ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import { BookDetailSheet } from "@/components/book-detail-sheet";
import { Cover } from "@/components/book-tile";
import { Input } from "@/components/ui/input";
import {
  colourOf,
  READING_COLOR,
  type Book,
  type Collection,
} from "@/lib/library";
import { useLibrary } from "@/lib/store";

/* Deterministic rhythm for the decorative mini spines: same book position
   always gets the same shape, so each collection reads as its own stack. */
const SPINE_H = [34, 30, 36, 28, 32, 36, 30, 34];
const SPINE_W = [10, 8, 9, 11, 8, 10, 9, 12];

function SpineStack({ books }: { books: Book[] }) {
  return (
    <div
      aria-hidden
      className="flex h-9 shrink-0 items-end gap-[2px]"
    >
      {books.slice(0, 8).map((b, i) => (
        <span
          key={b.id}
          className="block rounded-[1px] shadow-[inset_-1px_0_0_rgba(0,0,0,0.45)]"
          style={{
            background: colourOf(b),
            width: SPINE_W[i % SPINE_W.length],
            height: SPINE_H[i % SPINE_H.length],
          }}
        />
      ))}
    </div>
  );
}

function StatusTag({ b }: { b: Book }) {
  const base =
    "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs leading-none";
  if (b.st === "Read") {
    return (
      <span
        className={cn(base, "border-transparent bg-primary font-medium text-primary-foreground")}
      >
        Read
      </span>
    );
  }
  if (b.st === "Reading") {
    return (
      <span
        className={cn(base, "font-medium")}
        style={{
          color: READING_COLOR,
          borderColor: `${READING_COLOR}59`,
          background: `${READING_COLOR}14`,
        }}
      >
        <i className="size-1.5 rounded-full" style={{ background: READING_COLOR }} aria-hidden />
        Reading
        {typeof b.prog === "number" ? <span className="opacity-80">{b.prog}%</span> : null}
      </span>
    );
  }
  return <span className={cn(base, "border-border text-muted-foreground")}>{b.st}</span>;
}

export function ReadingRoom() {
  const { state } = useLibrary();
  const [colIdx, setColIdx] = React.useState(0);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [searchQ, setSearchQ] = React.useState("");
  const railRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  if (!state) return null;

  const cols: Collection[] = state.cols.filter((c) => !c.wish);
  if (cols.length === 0) {
    return (
      <p className="px-4 text-base text-muted-foreground">
        No collections yet — add one to start shelving.
      </p>
    );
  }
  const active = cols[Math.min(colIdx, cols.length - 1)];
  const inCol = state.books.filter((b) => !b.wish && b.col === active.name);
  const shelfCount = new Set(inCol.map((b) => b.shelf)).size;

  const q = searchQ.trim().toLowerCase();
  const shown = q
    ? inCol.filter((b) => (b.t + " " + b.a + " " + b.g).toLowerCase().includes(q))
    : inCol;

  function selectCollection(i: number, moveFocus: boolean) {
    setColIdx(i);
    setSearchQ("");
    if (moveFocus) railRefs.current[i]?.focus();
  }

  function onRailKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const d = e.key === "ArrowDown" ? 1 : -1;
    selectCollection((colIdx + d + cols.length) % cols.length, true);
  }

  const railButton = (c: Collection, i: number, selected: boolean) => (
    <button
      key={c.name}
      ref={(el) => {
        railRefs.current[i] = el;
      }}
      type="button"
      tabIndex={selected ? 0 : -1}
      aria-current={selected ? "true" : "false"}
      onClick={() => selectCollection(i, false)}
      className={cn(
        "group/row flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left outline-none",
        "min-h-[56px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "transition-colors motion-safe:duration-200 motion-reduce:transition-none",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-transparent text-foreground hover:bg-accent/40 motion-reduce:hover:bg-primary/10",
      )}
    >
      <SpineStack books={state.books.filter((b) => !b.wish && b.col === c.name)} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium leading-tight">{c.name}</span>
        <span className="text-xs text-muted-foreground">
          {state.books.filter((b) => !b.wish && b.col === c.name).length} books
        </span>
      </span>
    </button>
  );

  const bookCell = (b: Book) => (
    <div
      key={b.id}
      role="button"
      tabIndex={0}
      aria-label={`Open ${b.t} by ${b.a}`}
      onClick={() => setDetailId(b.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setDetailId(b.id);
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col items-stretch text-left select-none outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md",
      )}
    >
      <div
        className={cn(
          "relative rounded-md",
          "transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1",
          "motion-reduce:hover:opacity-90",
          "group-focus-within:opacity-90",
        )}
      >
        <Cover b={b} />
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/85 text-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <ChevronRightIcon className="size-3.5" />
        </span>
      </div>
      {/* Fixed-height meta slots keep every card's rows on the same baseline. */}
      <span className="mt-2 block h-10 text-sm leading-5 font-medium text-foreground line-clamp-2">
        {b.t}
      </span>
      <span className="mt-0.5 block h-4 text-xs leading-4 text-muted-foreground line-clamp-1">
        {b.a}
      </span>
      <span className="mt-1.5 flex">
        <StatusTag b={b} />
      </span>
    </div>
  );

  return (
    <div className="md:flex md:items-start md:gap-8">
      {/* Left rail — vertical stack on md+, segmented pill bar on phones. */}
      <nav
        aria-label="Collections"
        onKeyDown={onRailKeyDown}
        className="md:sticky md:top-0 md:h-dvh md:w-[280px] md:shrink-0 md:overflow-y-auto md:border-r md:border-border/70 md:py-6 md:pr-6"
      >
        <h2 className="hidden font-serif text-lg md:block">Collections</h2>
        <div className="hidden md:block" role="list">
          {cols.map((c, i) => railButton(c, i, c.name === active.name))}
        </div>

        {/* Mobile segmented bar */}
        <div className="md:hidden">
          <h2 className="px-4 pt-[18px] font-serif text-2xl">Collections</h2>
          <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cols.map((c, i) => {
              const selected = c.name === active.name;
              return (
                <button
                  key={c.name}
                  ref={(el) => {
                    railRefs.current[i] = el;
                  }}
                  type="button"
                  aria-current={selected ? "true" : "false"}
                  onClick={() => selectCollection(i, false)}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[15px] outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    "transition-colors motion-safe:duration-200 motion-reduce:transition-none",
                    selected
                      ? "border-primary bg-primary/15 font-medium text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.name}
                  <span className="text-xs">
                    {state.books.filter((b) => !b.wish && b.col === c.name).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Right pane — only the selected collection ever renders here. */}
      <section aria-label={active.name} className="min-w-0 flex-1 px-4 md:px-0 md:py-6">
        <header className="mt-3 md:mt-0">
          <h3 className="font-serif text-xl leading-tight">{active.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {inCol.length} book{inCol.length === 1 ? "" : "s"} on {shelfCount} shelf
            {shelfCount === 1 ? "" : "ves"}
          </p>
        </header>

        {inCol.length > 3 ? (
          <form
            className="mt-4 md:mt-5 md:max-w-sm"
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="reading-room-search" className="sr-only">
              Search books, authors or genres in {active.name}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="reading-room-search"
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={`Search ${active.name}…`}
                autoComplete="off"
                className="h-11 rounded-md pl-9 text-sm md:bg-background/60"
              />
            </div>
          </form>
        ) : null}

        <p aria-live="polite" className="sr-only">
          {q
            ? `${shown.length} of ${inCol.length} books match "${searchQ.trim()}"`
            : `${inCol.length} books in ${active.name}`}
        </p>

        {shown.length === 0 ? (
          <div className="mt-6 flex flex-col items-start gap-1 rounded-md border border-dashed border-border/70 px-5 py-8">
            <p className="font-serif text-base text-foreground">
              {q ? "Nothing matches that search" : "No books on these shelves yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {q
                ? "Try a shorter phrase, or a different collection."
                : "Add books to this collection and they'll appear here."}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
            {shown.map(bookCell)}
          </div>
        )}
      </section>

      <BookDetailSheet bookId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
