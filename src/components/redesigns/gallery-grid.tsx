"use client";

/* "Wall" redesign of the Collections home section: one responsive grid of
   front covers instead of stacked rails, filtered by large sticky pills.
   Covers are the art; chrome stays quiet. Every cell keeps a fixed-height
   meta block (title / author / status) so baselines align across a row. */

import * as React from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import { BookDetailSheet } from "@/components/book-detail-sheet";
import { Cover } from "@/components/book-tile";
import { READING_COLOR, colourOf, type Book, type Collection } from "@/lib/library";
import { useLibrary } from "@/lib/store";

export function GalleryGrid() {
  const { state } = useLibrary();
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [active, setActive] = React.useState<string | null>(null);

  if (!state) return null;

  const cols: Collection[] = state.cols.filter((c) => !c.wish);
  const books = state.books.filter((b) => !b.wish);
  const byName = new Map<string, Book[]>(
    cols.map((c) => [c.name, books.filter((b) => b.col === c.name)]),
  );
  const showing = active ? byName.get(active) || [] : books;
  const shownCols = active ? cols.filter((c) => c.name === active) : cols;

  return (
    <section aria-label="Collections" className="relative">
      <header className="px-4 pt-[18px] pb-1">
        <h2 className="font-serif text-2xl leading-tight">Collections</h2>
        <p className="mt-0.5 text-base text-muted-foreground">
          Browse every book you own, wall to wall
        </p>
      </header>

      {/* Sticky filter bar: solid bg so covers don't bleed through */}
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 py-2 backdrop-blur-sm">
        <div
          role="group"
          aria-label="Filter by collection"
          className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <FilterPill
            label="All"
            count={books.length}
            active={active === null}
            onToggle={() => setActive(null)}
          />
          {cols.map((c) => (
            <FilterPill
              key={c.name}
              label={c.name}
              count={byName.get(c.name)?.length || 0}
              active={active === c.name}
              onToggle={() => setActive(active === c.name ? null : c.name)}
            />
          ))}
        </div>
        <p aria-live="polite" className="sr-only">
          {showing.length} book{showing.length === 1 ? "" : "s"} shown
        </p>
      </div>

      {/* Visible results line keeps orientation without shouting */}
      <p className="px-4 pt-3 text-sm text-muted-foreground" aria-hidden>
        {active
          ? `${showing.length} in ${active}`
          : `${showing.length} book${showing.length === 1 ? "" : "s"} across ${cols.length} collection${cols.length === 1 ? "" : "s"}`}
      </p>

      <div
        key={active || "all"}
        className="grid grid-cols-2 gap-x-5 gap-y-9 px-4 pt-4 pb-10 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      >
        {showing.length === 0 ? (
          <div className="col-span-full mt-6 flex items-center justify-center rounded-md border-2 border-dashed border-border/70 py-12">
            <span className="text-center text-sm text-muted-foreground">
              {active ? `${active} is still waiting for its first book —` : "No books on this shelf yet —"}
              <span className="font-serif italic text-primary"> a wall with no art.</span>
            </span>
          </div>
        ) : (
          shownCols.flatMap((c) =>
            (byName.get(c.name) || []).map((b) => (
              <GalleryCell key={b.id} b={b} onOpen={setDetailId} />
            )),
          )
        )}
      </div>

      <BookDetailSheet bookId={detailId} onClose={() => setDetailId(null)} />
    </section>
  );
}

function FilterPill({
  label,
  count,
  active,
  onToggle,
}: {
  label: string;
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "flex h-10 min-w-fit shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors select-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs tabular-nums",
          active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function GalleryCell({ b, onOpen }: { b: Book; onOpen: (id: string) => void }) {
  const reading = b.st === "Reading";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${b.t} by ${b.a}`}
      onClick={() => onOpen(b.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(b.id);
        }
      }}
      className="group flex cursor-pointer flex-col items-stretch rounded-md text-left select-none [touch-action:pan-y] focus-visible:outline-none"
    >
      {/* Cover: lifts + rings on hover AND keyboard focus-within; the chevron
          badge makes the whole cell feel openable */}
      <div className="relative">
        <div
          className={cn(
            "overflow-hidden rounded-md ring-0 ring-ring/0 transition-transform group-focus-within:ring-2 group-hover:ring-2 group-focus-within:ring-ring/60 group-hover:ring-ring/60",
            "motion-safe:transition-transform motion-safe:duration-200 motion-reduce:transition-none",
          )}
          style={{ zIndex: 0 }}
        >
          <div className="motion-safe:transition-[transform,box-shadow] motion-safe:duration-200 motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-within:-translate-y-1 motion-reduce:transform-none">
            <Cover b={b} />
          </div>
        </div>
        <span
          aria-hidden
          className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity motion-safe:duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <ChevronRightIcon className="size-3.5" />
        </span>
      </div>

      {/* Fixed-height meta block so baselines align across the row */}
      <div className="mt-2.5 flex flex-col">
        <span className="line-clamp-2 h-10 text-sm leading-5 text-foreground">
          {b.t}
        </span>
        <span className="line-clamp-1 mt-0.5 h-4.5 text-xs leading-[1.125rem] text-muted-foreground">
          {b.a}
        </span>
        <div className="mt-1.5 flex h-7 items-start">
          <StatusTag b={b} reading={reading} />
        </div>
      </div>
    </div>
  );
}

function StatusTag({ b, reading }: { b: Book; reading: boolean }) {
  if (b.st === "Read") {
    return (
      <span className="inline-flex h-7 items-center rounded-4xl bg-primary px-3 text-xs font-medium text-primary-foreground">
        Read
      </span>
    );
  }
  if (reading) {
    return (
      <span
        className="inline-flex h-7 items-center gap-1.5 rounded-4xl border px-3 text-xs font-medium"
        style={{ borderColor: READING_COLOR, color: READING_COLOR }}
      >
        {typeof b.prog === "number" ? (
          <>
            Reading
            <span className="tabular-nums opacity-70">{b.prog}%</span>
          </>
        ) : (
          "Reading"
        )}
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-4xl border px-3 text-xs text-muted-foreground"
      style={{ borderColor: `${colourOf(b)}88` }}
    >
      {b.st}
    </span>
  );
}
