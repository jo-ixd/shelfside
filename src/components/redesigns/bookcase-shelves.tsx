"use client";

/* Redesign direction "Bookcase": each collection becomes a real cabinet —
   labelled, wood-framed — and the books stand on shelf boards as spines
   instead of full covers. Titles run vertically, a bookmark ribbon on every
   spine carries the status, and a plate with full book details appears on
   hover or keyboard focus. Boards wrap, so the whole library fits in a
   fraction of the old cover-rail scroll. */

import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { BookDetailSheet } from "@/components/book-detail-sheet";
import { PageHeader } from "@/components/page-header";
import { SHELF, READING_COLOR, colourOf, bookWidth, statusLabel, type Book } from "@/lib/library";
import { cn } from "cn";
import { useLibrary } from "@/lib/store";

/* Status ribbon colours — one hue per status, mirrored in the legend. */
const STATUS_RIBBON: Record<string, string> = {
  Read: "#7ca46b",
  Reading: READING_COLOR,
  "To Read": "#b9a88f",
  Reference: "#7d9aa8",
  "Lent out": "#b06a5f",
};

/* Stable pseudo-random value in [0, n) derived from a string, so spines
   keep the same tilt and height across renders — no Math.random. */
function hashMod(s: string, salt: number, n: number): number {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h % n;
}

function spineTilt(b: Book): number {
  return ((hashMod(b.t + b.id + b.id, 7, 9) - 4) * 0.5) % 3;
}

function spineHeight(b: Book): number {
  return 132 + hashMod(b.t + b.id, 3, 25);
}

/* Split a shelf's books into board rows: fill each board until its width
   is used up, then carry the rest onto the next board below. */
function packBoards(books: Book[], width: number): Book[][] {
  if (width <= 0) return [books];
  const boards: Book[][] = [];
  let row: Book[] = [];
  let used = 0;
  for (const b of books) {
    const w = Math.max(22, bookWidth(b.t));
    const gap = row.length > 0 ? 3 : 0;
    if (row.length > 0 && used + gap + w > width) {
      boards.push(row);
      row = [];
      used = 0;
    }
    row.push(b);
    used += w + (row.length > 1 ? 3 : 0);
  }
  if (row.length > 0) boards.push(row);
  return boards;
}

/* Measure the cabinet's usable content width so boards can wrap at the
   same point the real layout would. Falls back to a desktop-ish width
   until the first measurement lands. */
function useContentWidth(fallback: number) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
      });
    });
    ro.observe(el);
    if (el.getBoundingClientRect().width > 0) {
      setWidth(el.getBoundingClientRect().width);
    }
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/* ---- Spine: one book standing on a board ---- */

function Spine({
  b,
  first,
  last,
  onOpen,
}: {
  b: Book;
  first: boolean;
  last: boolean;
  onOpen: (id: string) => void;
}) {
  const w = Math.max(22, bookWidth(b.t));
  const h = spineHeight(b);
  const tilt = spineTilt(b);
  const ribbon = STATUS_RIBBON[statusLabel(b)] || STATUS_RIBBON["To Read"];
  const reading = b.st === "Reading";
  const prog = reading ? b.prog || 0 : 0;

  /* Plate aligns toward the board centre so it never spills past the
     cabinet (causing horizontal scroll) on narrow viewports. */
  const platePos = first
    ? "left-0 translate-x-0"
    : last
      ? "right-0 translate-x-0"
      : "left-1/2 -translate-x-1/2";

  return (
    <button
      type="button"
      onClick={() => onOpen(b.id)}
      aria-label={`${b.t} by ${b.a || "unknown author"} — ${statusLabel(b)}${reading ? `, ${prog}% through` : ""}`}
      className={cn(
        "group relative z-0 flex cursor-pointer items-end outline-none",
        "motion-safe:transition-transform motion-safe:duration-150",
        "motion-safe:hover:-translate-y-1.5 motion-safe:focus-visible:-translate-y-1.5",
        "hover:z-30 focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      style={{ width: w, height: h }}
    >
      {/* enlarged hit area without widening the visible spine */}
      <span
        aria-hidden
        className="absolute inset-y-0 -left-1.5 -right-1.5 rounded-sm"
      />
      {/* info plate, shown on hover or keyboard focus */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-full z-40 mb-2.5 hidden w-max max-w-[210px] flex-col gap-1 rounded-md border border-border bg-popover px-3 py-2 text-left shadow-[0_6px_16px_rgba(0,0,0,0.5)]",
          platePos,
          "group-hover:flex group-focus-visible:flex",
          "motion-safe:transition-opacity motion-safe:duration-100",
        )}
      >
        <span className="line-clamp-2 font-serif text-[13px] leading-snug text-popover-foreground">
          {b.t}
        </span>
        <span className="text-[12px] leading-tight text-muted-foreground">
          {b.a || "Unknown author"}
        </span>
        <span
          className="mt-0.5 inline-flex h-7 w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-3 text-[12px] text-foreground"
        >
          <i
            className="size-2 rounded-full"
            style={{ background: ribbon }}
            aria-hidden
          />
          {statusLabel(b)}
          {reading ? ` · ${prog}%` : ""}
        </span>
      </span>
      {/* the spine itself */}
      <span
        className="relative block h-full w-full overflow-hidden rounded-[2px] shadow-[inset_2px_0_3px_rgba(255,255,255,0.08),inset_-3px_0_5px_rgba(0,0,0,0.55),0_2px_4px_rgba(0,0,0,0.5)]"
        style={{
          background: `linear-gradient(120deg, ${colourOf(b)}, #161009 165%)`,
          transform: `rotate(${tilt}deg)`,
          transformOrigin: "50% 100%",
        }}
      >
        {b.spine ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.spine}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        {/* spine top band, colour-coded by status */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: ribbon, opacity: 0.9 }}
        />
        {/* bookmark ribbon hanging over the top edge */}
        <span
          aria-hidden
          className="absolute right-0 top-0 h-4 w-[5px] rounded-b-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          style={{ background: ribbon }}
        />
        {/* title running vertically along the spine */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-3 bottom-2 flex justify-center overflow-hidden font-serif text-[11px] tracking-[0.08em] text-[#f6efdd] [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]"
          style={{ writingMode: "vertical-rl" }}
        >
          {b.t}
        </span>
        {/* reading progress rises from the bottom of the spine */}
        {reading ? (
          <>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 bg-[rgba(0,0,0,0.45)]"
              style={{ height: `${prog}%` }}
            />
            <span
              aria-hidden
              className="absolute inset-x-0 bg-[#ffd76a]/70"
              style={{ bottom: `calc(${prog}% - 1px)`, height: 2 }}
            />
          </>
        ) : null}
      </span>
    </button>
  );
}

/* ---- Bookcase: cabinet frame + shelf boards for one collection ---- */

function Bookcase({
  name,
  books,
  onOpen,
}: {
  name: string;
  books: Book[];
  onOpen: (id: string) => void;
}) {
  const { ref, width } = useContentWidth(800);

  /* Group by the book's real shelf label, preserving first-seen order. */
  const byShelf = new Map<string, Book[]>();
  books.forEach((b) => {
    if (!byShelf.has(b.shelf)) byShelf.set(b.shelf, []);
    byShelf.get(b.shelf)!.push(b);
  });

  const shelfLabel = (
    shelf: string,
    count: number,
  ): React.ReactNode => (
    <p className="mb-2 ml-1 flex items-baseline gap-2 tracking-[0.16em] text-muted-foreground uppercase">
      <span className="text-[11px]">{shelf}</span>
      <span className="text-[11px] text-muted-foreground/60 normal-case">
        {count} book{count === 1 ? "" : "s"}
      </span>
    </p>
  );

  const board = (row: Book[]): React.ReactNode => (
    <div className="relative">
      <div className="flex items-end gap-[3px] px-0.5">
        {row.map((b, i) => (
          <Spine
            key={b.id}
            b={b}
            first={i === 0}
            last={i === row.length - 1}
            onOpen={onOpen}
          />
        ))}
      </div>
      {/* wooden board with a protruding lip */}
      <div
        className="-mx-1.5 mt-0 h-3.5 rounded-b-[2px]"
        style={{
          background: SHELF.gradient,
          borderTop: `1px solid ${SHELF.lip}`,
          borderBottom: "1px solid rgba(0,0,0,0.55)",
          boxShadow:
            "inset 0 2px 3px rgba(0,0,0,0.55), 0 2px 3px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );

  return (
    <div
      className="mx-3 overflow-hidden rounded-lg border-2 md:mx-4"
      style={{
        borderColor: SHELF.border,
        background: "linear-gradient(180deg, #241a0e, #1a1309)",
        boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
      }}
    >
      {/* cabinet top lintel */}
      <div
        className="h-2.5"
        style={{
          background: SHELF.gradient,
          borderBottom: `1px solid ${SHELF.lip}`,
          boxShadow: "inset 0 2px 3px rgba(0,0,0,0.4)",
        }}
      />
      <div ref={ref} className="px-2.5 pt-3 pb-4 sm:px-4">
        {books.length === 0 ? (
          <div className="relative">
            {/* empty cabinet: one bare board with a placeholder */}
            <div
              className="mx-0.5 flex h-[150px] items-center justify-center rounded-sm border-2 border-dashed border-border/60"
            >
              <span className="px-4 text-center text-[11px] tracking-[0.14em] text-muted-foreground/70 uppercase">
                {name} — empty cabinet
              </span>
            </div>
            <div
              className="-mx-1.5 mt-0 h-3.5 rounded-b-[2px]"
              style={{
                background: SHELF.gradient,
                borderTop: `1px solid ${SHELF.lip}`,
                boxShadow: "inset 0 2px 3px rgba(0,0,0,0.55)",
              }}
            />
          </div>
        ) : null}
        {[...byShelf.entries()].map(([shelf, list]) => {
          const boards = packBoards(list, width);
          return (
            <div key={shelf} className={shelf ? "mb-4 last:mb-0" : ""}>
              {shelf ? shelfLabel(shelf, list.length) : null}
              {boards.map((row, i) => (
                <div key={row.map((b) => b.id).join("-")} className={i < boards.length - 1 ? "mb-1" : ""}>
                  {board(row)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Page: header + legend + one cabinet per collection ---- */

export function BookcaseShelves() {
  const { state } = useLibrary();
  const [detailId, setDetailId] = React.useState<string | null>(null);

  if (!state) return null;

  const cols = state.cols.filter((c) => !c.wish);
  const owned = state.books.filter((b) => !b.wish);

  const legend = (
    <div
      className="mx-3 mt-2 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 md:mx-4"
      role="group"
      aria-label="Status ribbon legend"
    >
      {["Read", "Reading", "To Read", "Reference", "Lent out"].map((s) => (
        <span
          key={s}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground"
        >
          <i
            className="size-2 rounded-full"
            style={{ background: STATUS_RIBBON[s] }}
            aria-hidden
          />
          {s}
        </span>
      ))}
      <span className="text-[12px] text-muted-foreground/60">
        Ribbon on the spine marks the status
      </span>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Collections"
        sub={`${owned.length} book${owned.length === 1 ? "" : "s"} standing on ${cols.length} bookcase${cols.length === 1 ? "" : "s"}`}
      />
      {legend}
      {cols.map((c) => {
        const inCol = owned.filter((b) => b.col === c.name);
        return (
          <section key={c.name} aria-label={c.name} className="mb-7">
            <div className="mx-3 flex items-baseline gap-2 px-0.5 pb-2 md:mx-4">
              <h2 className="min-w-0 font-serif text-xl leading-tight">
                {c.name}
              </h2>
              <Link
                href={`/shelf?col=${encodeURIComponent(c.name)}&wish=0`}
                className="flex shrink-0 items-center gap-0.5 text-[12px] text-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                View all
                <ChevronRightIcon className="size-3.5" aria-hidden />
              </Link>
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {inCol.length} book{inCol.length === 1 ? "" : "s"}
              </span>
            </div>
            <Bookcase name={c.name} books={inCol} onOpen={setDetailId} />
          </section>
        );
      })}
      <BookDetailSheet bookId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
