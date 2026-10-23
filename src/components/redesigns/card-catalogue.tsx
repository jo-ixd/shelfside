"use client";

/* "Card catalogue" — the library cabinet. Each collection is a drawer front
   you open in place; the interior reveals the books as library index cards
   (cream paper, ruled lines, rubber-stamp status). Accordion: one drawer
   open at a time so the page never becomes an endless rail scroll. */

import * as React from "react";
import { BookDetailSheet } from "@/components/book-detail-sheet";
import { PageHeader } from "@/components/page-header";
import {
  colourOf,
  READING_COLOR,
  SHELF,
  type Book,
} from "@/lib/library";
import { useLibrary } from "@/lib/store";

/* Ink palette on cream paper — all ≥ 4.5:1 against #f0e6d4/#f4ead6. */
const INK = "#3a2d1c";
const PAPER = "#f0e6d4";

function stampStyle(st: string) {
  if (st === "Read") {
    return {
      color: "#7a5a10",
      borderColor: "#a8842e",
      backgroundColor: "rgba(201,168,106,0.16)",
    };
  }
  if (st === "Reading") {
    return {
      color: "#6d5210",
      borderColor: READING_COLOR,
      backgroundColor: "rgba(255,215,106,0.14)",
    };
  }
  return {
    color: "#5f574a",
    borderColor: "rgba(95,87,74,0.55)",
    backgroundColor: "rgba(95,87,74,0.08)",
  };
}

function StampBadge({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ ...stampStyle(label), rotate: "-4deg" }}
      className="relative inline-flex h-[26px] min-w-[64px] shrink-0 items-center justify-center rounded-[3px] border-2 border-dashed px-2 font-serif text-[12px] font-bold uppercase tracking-[0.06em] shadow-[inset_0_0_6px_rgba(58,45,28,0.12)]"
    >
      {label}
    </span>
  );
}

function IndexCard({
  book,
  onOpen,
}: {
  book: Book;
  onOpen: (id: string) => void;
}) {
  const shades = [0.05, 0.09, 0.045];
  const tint = shades[book.id.length % shades.length];
  const isReading = book.st === "Reading";
  const shadeHex = colourOf(book);

  return (
    <button
      type="button"
      onClick={() => onOpen(book.id)}
      style={{ backgroundColor: PAPER, color: INK }}
      className="group/card relative flex min-h-[92px] w-full cursor-pointer flex-col justify-between rounded-[4px] px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(58,45,28,0.10)] transition-transform duration-150 motion-safe:hover:-translate-y-[3px] motion-safe:focus-visible:-translate-y-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a5a10] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2c2213]"
    >
      {/* ruled lines + aged paper, layered gradients only */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[4px]"
        style={{
          backgroundColor: `rgba(122,90,16,${tint})`,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 25px, rgba(58,45,28,0.13) 25px 26px), radial-gradient(120% 90% at 12% 8%, rgba(122,90,16,0.10), transparent 55%), radial-gradient(100% 80% at 92% 96%, rgba(58,45,28,0.10), transparent 60%)",
        }}
      />
      {/* top punch-hole strip like a real library card */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-[7px] border-t border-dashed border-[#3a2d1c]/25"
      />

      <span className="relative flex items-start justify-between gap-2 pt-2">
        <span className="min-w-0">
          <span className="line-clamp-2 font-serif text-[16px] leading-snug text-[#3a2d1c]">
            {book.t}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-[#6b5a40] italic">
            {book.a}
          </span>
        </span>
        <StampBadge label={book.st} />
      </span>

      <span className="relative flex items-end justify-between gap-2">
        {/* genre colour spot — the dot in the card's corner */}
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-[#5f574a]">
          <span
            aria-hidden="true"
            className="size-[10px] shrink-0 rounded-full border border-[#3a2d1c]/25"
            style={{ backgroundColor: shadeHex }}
          />
          <span className="truncate">
            {book.col} · {book.shelf}
          </span>
        </span>
        {isReading && typeof book.prog === "number" ? (
          <span
            className="shrink-0 text-[12px] italic"
            style={{ color: "#4c5a3c" }}
          >
            {book.prog}% through
          </span>
        ) : null}
      </span>

      {/* "pull card" corner fold — appears on hover and keyboard focus */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 hidden h-4 w-4 group-hover/card:block group-focus-visible/card:block"
        style={{
          background: PAPER,
          clipPath: "polygon(100% 0, 0 0, 100% 100%)",
          filter: "drop-shadow(-1px 1px 1px rgba(58,45,28,0.35))",
        }}
      />
    </button>
  );
}

export function CardCatalogue() {
  const { state } = useLibrary();
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [openName, setOpenName] = React.useState<string | null>(null);

  if (!state) return null;

  const cols = state.cols.filter((c) => !c.wish);
  const booksOf = (name: string) =>
    state.books.filter((b) => !b.wish && b.col === name);

  const total = state.books.filter((b) => !b.wish).length;

  return (
    <div>
      <PageHeader
        title="Collections"
        sub={`${total} books in the card catalogue`}
      />

      <section
        aria-label="Collections — card catalogue"
        className="mx-3 mt-2 rounded-xl border px-3 pb-4 pt-3 sm:mx-4"
        style={{
          background:
            "linear-gradient(160deg, #33271a 0%, #2c2213 55%, #241b0e 100%)",
          borderColor: SHELF.border,
          boxShadow:
            "inset 0 1px 0 rgba(255,235,200,0.08), 0 6px 20px rgba(0,0,0,0.35)",
        }}
      >
        <h2 className="px-1 font-serif text-lg text-[#e9dcba]">
          The Card Catalogue
        </h2>
        <p className="mt-0.5 px-1 text-[12px] text-[#c4b28d]">
          Every home shelf in three drawers — pull one open.
        </p>

        <div className="mt-3 flex flex-col gap-2.5">
          {cols.map((c) => {
            const books = booksOf(c.name);
            const isOpen = openName === c.name;
            const shelves = Array.from(
              new Set(books.map((b) => b.shelf)),
            );
            const controlId = `drawer-${c.name.replace(/\s+/g, "-").toLowerCase()}`;

            return (
              <div
                key={c.name}
                className="rounded-lg"
                style={{
                  background: isOpen
                    ? "linear-gradient(#2a2013, #221a0d)"
                    : "linear-gradient(#3d2f1e, #312616)",
                  boxShadow: isOpen
                    ? "inset 0 4px 12px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.35)"
                    : "0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,200,0.10)",
                }}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={controlId}
                  onClick={() => setOpenName(isOpen ? null : c.name)}
                  className="group/drawer flex min-h-[76px] w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 truncate font-serif text-[17px] leading-tight text-[#e9dcba]">
                        {c.name}
                      </span>
                      <span className="shrink-0 text-[12.5px] text-[#a8946a]">
                        {books.length} book
                        {books.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[12.5px] text-[#8f7c55]">
                      {shelves.length > 0
                        ? shelves.join(" · ")
                        : "No shelves yet"}
                    </span>
                  </span>

                  {/* recessed brass handle strip */}
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-24 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background:
                        "linear-gradient(#241b0e, #3a2d1c)",
                      boxShadow:
                        "inset 0 1px 3px rgba(0,0,0,0.7), 0 1px 0 rgba(255,235,200,0.10)",
                    }}
                  >
                    <span
                      className="h-[3px] w-16 rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, #8a6d38, #c9a86a 50%, #8a6d38)",
                        opacity: isOpen ? 1 : 0.75,
                      }}
                    />
                  </span>
                </button>

                {/* drawer interior */}
                <div
                  id={controlId}
                  role="region"
                  aria-label={`${c.name} contents`}
                  className="grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-in-out"
                  style={{
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                    visibility: isOpen ? "visible" : "hidden",
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="px-3 pb-3">
                      <div
                        className="rounded-md border border-black/40 px-3 py-3"
                        style={{
                          background:
                            "linear-gradient(#1e170c, #241b0e)",
                          boxShadow:
                            "inset 0 3px 10px rgba(0,0,0,0.6)",
                        }}
                      >
                        {books.length === 0 ? (
                          <p className="py-3 text-center text-[13px] text-[#a8946a]">
                            This drawer is empty — no index cards yet.
                            Add some books to start a collection.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {books.map((b) => (
                              <IndexCard
                                key={b.id}
                                book={b}
                                onOpen={setDetailId}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <BookDetailSheet bookId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
