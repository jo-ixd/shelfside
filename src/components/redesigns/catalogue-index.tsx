"use client";

/* "Ledger" redesign of the Collections homepage: one dense accession
   register of every book instead of one scroll-eating cover rail per
   collection. Collection switching lives in a tab row; each row of the
   register is a real button into the detail sheet. */

import * as React from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { BookDetailSheet } from "@/components/book-detail-sheet";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { colourOf, READING_COLOR, type Book } from "@/lib/library";
import { useLibrary } from "@/lib/store";

const SOLID_STATUS = "Read";
const READING_STATUS = "Reading";

function StatusBadge({ b }: { b: Book }) {
  if (b.st === SOLID_STATUS) {
    return (
      <span className="inline-flex h-7 items-center rounded-full bg-primary px-2.5 text-xs font-medium text-primary-foreground">
        Read
      </span>
    );
  }
  if (b.st === READING_STATUS) {
    return (
      <span
        className="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs"
        style={{ borderColor: READING_COLOR, color: READING_COLOR }}
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: READING_COLOR }}
        />
        Reading
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 items-center rounded-full border border-border px-2.5 text-xs text-muted-foreground">
      {b.st}
    </span>
  );
}

function StatusCell({ b }: { b: Book }) {
  const reading = b.st === READING_STATUS;
  return (
    <div className="flex items-center justify-end gap-3">
      <div className="flex flex-col gap-1">
        <StatusBadge b={b} />
        {reading ? (
          <div className="flex items-center gap-1.5">
            <div
              role="progressbar"
              aria-label={`${b.prog ?? 0}% read`}
              aria-valuenow={b.prog ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1 w-16 overflow-hidden rounded-full bg-primary/10"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${b.prog ?? 0}%`,
                  backgroundColor: READING_COLOR,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{b.prog ?? 0}%</span>
          </div>
        ) : null}
      </div>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-primary opacity-0 transition-opacity motion-safe:duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </div>
  );
}

function GenreCell({ b }: { b: Book }) {
  return (
    <span className="inline-flex items-center gap-2 truncate">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full border border-white/20"
        style={{ backgroundColor: colourOf(b) }}
      />
      <span className="truncate">{b.g}</span>
    </span>
  );
}

function Row({ b, onOpen }: { b: Book; onOpen: (id: string) => void }) {
  const open = () => onOpen(b.id);
  return (
    <tr
      role="button"
      tabIndex={0}
      data-book-row={b.id}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="group cursor-pointer border-b border-border/60 align-middle hover:bg-primary/5 focus-visible:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring/70 focus-visible:-outline-offset-2 motion-safe:transition-colors"
    >
      <td className="min-h-[52px] py-3 pr-4 pl-3 sm:pl-4">
        <span
          aria-hidden="true"
          className="mb-1 size-2.5 rounded-full border border-white/20 md:hidden"
          style={{ backgroundColor: colourOf(b) }}
        />
        <span className="truncate font-serif text-[16px] leading-snug">
          {b.t}
        </span>
        <span className="block truncate text-[13px] text-muted-foreground md:hidden">
          {b.a}
        </span>
      </td>
      <td className="hidden min-h-[52px] truncate py-3 pr-4 text-[13px] text-muted-foreground md:table-cell">
        {b.a}
      </td>
      <td className="hidden min-h-[52px] truncate pr-4 py-3 text-[13px] lg:table-cell">
        <GenreCell b={b} />
      </td>
      <td className="hidden min-h-[52px] truncate pr-4 py-3 text-[13px] text-muted-foreground lg:table-cell">
        {b.col} · {b.shelf}
      </td>
      <td className="min-h-[52px] py-3 pr-3 sm:pr-4">
        <StatusCell b={b} />
      </td>
    </tr>
  );
}

export function CatalogueIndex() {
  const { state } = useLibrary();
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [active, setActive] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  if (!state) return null;

  const cols = state.cols.filter((c) => !c.wish);
  const books = state.books.filter((b) => !b.wish);

  const tabs = [{ name: "All", count: books.length }].concat(
    cols.map((c) => ({
      name: c.name,
      count: books.filter((b) => b.col === c.name).length,
    })),
  );

  const scoped =
    active === "all" ? books : books.filter((b) => b.col === active);
  const q = query.trim().toLowerCase();
  const visible = q
    ? scoped.filter(
        (b) => (b.t + " " + b.a + " " + b.g).toLowerCase().includes(q),
      )
    : scoped;

  const countLine = q
    ? `${visible.length} of ${books.length} books match "${query.trim()}"`
    : `${books.length} books across ${cols.length} collection${cols.length === 1 ? "" : "s"}`;

  function moveTab(from: number, to: number) {
    const idx = (to + tabs.length) % tabs.length;
    const tab = tabs[idx];
    setActive(tab.name);
    tabRefs.current[idx]?.focus();
  }

  return (
    <>
      <PageHeader
        title="Collections"
        sub="The librarian's register — every book, in order"
      />

      {/* Collection tabs */}
      <div
        role="tablist"
        aria-label="Filter by collection"
        className="flex gap-1 overflow-x-auto px-3 pb-1 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onKeyDown={(e) => {
          const from = tabs.findIndex((t) => t.name === active);
          if (from < 0) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            moveTab(from, from + 1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            moveTab(from, from - 1);
          } else if (e.key === "Home") {
            e.preventDefault();
            moveTab(from, 0);
          } else if (e.key === "End") {
            e.preventDefault();
            moveTab(from, tabs.length - 1);
          }
        }}
      >
        {tabs.map((t, i) => {
          const selected = active === t.name;
          return (
            <button
              key={t.name}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`collection-tab-${i}`}
              aria-selected={selected}
              aria-controls="collection-register"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.name)}
              className={`min-h-10 shrink-0 rounded-t-md border-b-2 px-3.5 text-sm focus-visible:outline-2 focus-visible:outline-ring/70 focus-visible:-outline-offset-2 motion-safe:transition-colors ${
                selected
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.name}
              <span className="ml-1.5 text-[13px] text-muted-foreground/80">
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <section
        aria-label="Library register"
        aria-labelledby="collection-register-heading"
        className="mt-2 px-3 pb-10 sm:px-4"
      >
        <h2
          id="collection-register-heading"
          className="sr-only"
        >
          {active === "all" ? "All books" : active}
        </h2>

        {/* Filter + live count */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {countLine}
          </p>
          <div className="w-full max-w-64 sm:w-auto">
            <label htmlFor="register-filter" className="sr-only">
              Search the register by title, author or genre
            </label>
            <Input
              id="register-filter"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the register…"
              autoComplete="off"
              className="h-11 rounded-[10px] px-3 text-sm"
            />
          </div>
        </div>

        {/* The register */}
        <div className="mt-3 border-y border-border/80">
          {visible.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <p className="font-serif text-lg">Nothing here yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {q
                  ? `No books match "${query.trim()}" in ${
                      active === "all" ? "the library" : active
                    }`
                  : active === "all"
                    ? "The register is empty."
                    : `No books filed under ${active}.`}
              </p>
            </div>
          ) : (
            <table className="w-full table-fixed border-collapse">
              <caption className="sr-only">
                Accession register of{" "}
                {active === "all" ? "all books" : `books in ${active}`}: title,
                author, genre, shelf location and reading status.
              </caption>
              <colgroup>
                <col />
                <col className="hidden md:table-cell" style={{ width: "18%" }} />
                <col className="hidden lg:table-cell" style={{ width: "15%" }} />
                <col className="hidden lg:table-cell" style={{ width: "22%" }} />
                <col style={{ width: 156 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border/80">
                  <th
                    scope="col"
                    className="pb-2.5 pr-4 pl-3 text-left text-[13px] font-medium text-muted-foreground sm:pl-4"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    className="hidden pb-2.5 pr-4 text-left text-[13px] font-medium text-muted-foreground md:table-cell"
                  >
                    Author
                  </th>
                  <th
                    scope="col"
                    className="hidden pb-2.5 pr-4 text-left text-[13px] font-medium text-muted-foreground lg:table-cell"
                  >
                    Genre
                  </th>
                  <th
                    scope="col"
                    className="hidden pb-2.5 pr-4 text-left text-[13px] font-medium text-muted-foreground lg:table-cell"
                  >
                    Shelf
                  </th>
                  <th
                    scope="col"
                    className="pb-2.5 pr-3 text-right text-[13px] font-medium text-muted-foreground sm:pr-4"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => (
                  <Row key={b.id} b={b} onOpen={setDetailId} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <BookDetailSheet bookId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
