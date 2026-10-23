"use client";

/* Home — the "Reading Room" design. On md+ the collections rail lives in
   the app sidebar, so this view is just the right pane: exactly one
   collection's books as a comfortable cover grid. On phones the rail
   collapses into a horizontally scrollable pill bar above the same grid.
   The selected collection is the ?col= URL param, so it survives
   navigation, the back button, and the sidebar highlighting. */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { cn } from "cn";
import { BookDetailSheet } from "@/components/book-detail-sheet";
import { Cover } from "@/components/book-tile";
import { Input } from "@/components/ui/input";
import { READING_COLOR, type Book } from "@/lib/library";
import { useLibrary } from "@/lib/store";

function StatusTag({ b }: { b: Book }) {
  const base =
    "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs leading-none";
  if (b.st === "Read") {
    return (
      <span
        className={cn(
          base,
          "border-transparent bg-primary font-medium text-primary-foreground",
        )}
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
        <i
          className="size-1.5 rounded-full"
          style={{ background: READING_COLOR }}
          aria-hidden
        />
        Reading
        {typeof b.prog === "number" ? (
          <span className="opacity-80">{b.prog}%</span>
        ) : null}
      </span>
    );
  }
  return (
    <span className={cn(base, "border-border text-muted-foreground")}>
      {b.st}
    </span>
  );
}

export function HomeView() {
  const params = useSearchParams();
  const { state } = useLibrary();
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [searchQ, setSearchQ] = React.useState("");

  if (!state) return null;

  const cols = state.cols;
  if (cols.length === 0) {
    return (
      <main className="px-4 pt-[18px]">
        <h1 className="font-serif text-2xl">Collections</h1>
        <p className="mt-3 text-base text-muted-foreground">
          No collections yet — add one to start shelving.
        </p>
        <Link
          href="/collections/new"
          className="mt-4 inline-flex items-center gap-1 text-base text-primary"
        >
          New collection
          <ChevronRightIcon className="size-3.5" />
        </Link>
      </main>
    );
  }

  const colParam = params.get("col");
  const active = cols.find((c) => c.name === colParam) ?? cols[0];
  const inCol = state.books.filter((b) => b.col === active.name);
  const shelfCount = new Set(inCol.map((b) => b.shelf)).size;

  const q = searchQ.trim().toLowerCase();
  const shown = q
    ? inCol.filter((b) =>
        (b.t + " " + b.a + " " + b.g).toLowerCase().includes(q),
      )
    : inCol;

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
    <>
      {/* Phones: the collections rail collapses into a pill bar. */}
      <div className="md:hidden">
        <h2 className="px-4 pt-[18px] font-serif text-2xl">Collections</h2>
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cols.map((c) => {
            const selected = c.name === active.name;
            const count = state.books.filter((b) => b.col === c.name).length;
            return (
              <Link
                key={c.name}
                href={`/?col=${encodeURIComponent(c.name)}`}
                aria-current={selected ? "true" : "false"}
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
                <span className="text-xs">{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right pane — only the selected collection ever renders here. */}
      <section
        aria-label={active.name}
        className="min-w-0 px-4 pt-3 md:px-8 md:pt-7"
      >
        <header className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-xl leading-tight md:text-2xl">
              {active.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {inCol.length} book{inCol.length === 1 ? "" : "s"} on {shelfCount}{" "}
              shelf{shelfCount === 1 ? "" : "ves"}
            </p>
          </div>
          <Link
            href={`/shelf?col=${encodeURIComponent(active.name)}`}
            className="flex shrink-0 items-center gap-0.5 text-base text-primary"
          >
            Shelves
            <ChevronRightIcon className="size-3.5" />
          </Link>
        </header>

        {inCol.length > 3 ? (
          <form
            className="mt-4 md:mt-5 md:max-w-sm"
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="collection-search" className="sr-only">
              Search books, authors or genres in {active.name}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="collection-search"
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
              {q
                ? "Nothing matches that search"
                : "No books on these shelves yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {q
                ? "Try a shorter phrase, or a different collection."
                : "Add books to this collection and they'll appear here."}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map(bookCell)}
          </div>
        )}
      </section>

      <BookDetailSheet bookId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
