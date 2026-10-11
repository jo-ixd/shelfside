"use client";

/* Homepage: one horizontal rail of standalone covers per collection, Google
   Books-style metadata underneath, whitespace doing the separating. Shelf
   structure lives on the collection page, not here. */

import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { BookDetailSheet } from "@/components/book-detail-sheet";
import { PageHeader } from "@/components/page-header";
import {
  colourOf,
  type Book,
  type Collection,
} from "@/lib/library";
import { useLibrary } from "@/lib/store";

export function CollectionsGrid({ wish }: { wish: boolean }) {
  const { state } = useLibrary();
  const [detailId, setDetailId] = React.useState<string | null>(null);

  if (!state) return null;

  const cols: Collection[] = state.cols.filter((c) => c.wish === wish);
  const inWish = state.books.filter((b) => b.wish === wish);
  const sub = wish
    ? "Books you want to own, grouped into lists"
    : `${inWish.length} book${inWish.length === 1 ? "" : "s"} across ${cols.length} collection${cols.length === 1 ? "" : "s"}`;

  return (
    <>
      <PageHeader title={wish ? "Wishlist" : "Shelfside"} sub={sub} />
      {cols.map((c) => {
        const inCol = inWish.filter((b) => b.col === c.name);
        return (
          <section key={c.name} aria-label={c.name} className="mb-7">
            <div className="flex items-baseline gap-2 px-4">
              <h3 className="min-w-0 truncate font-serif text-lg">{c.name}</h3>
              <Link
                href={`/shelf?col=${encodeURIComponent(c.name)}&wish=${wish ? 1 : 0}`}
                className="flex shrink-0 items-center gap-0.5 text-sm text-primary"
              >
                View all
                <ChevronRightIcon className="size-3.5" />
              </Link>
              <span className="shrink-0 text-sm text-muted-foreground">
                {inCol.length} book{inCol.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-3 flex items-start gap-6 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {inCol.length === 0 ? (
                <div className="flex h-[156px] w-40 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-border/70 text-muted-foreground/60">
                  <span className="px-2 text-center text-[11px] leading-tight">
                    No books yet
                  </span>
                </div>
              ) : (
                inCol.map((b) => (
                  <BookTile key={b.id} b={b} onOpen={setDetailId} />
                ))
              )}
            </div>
          </section>
        );
      })}
      <BookDetailSheet bookId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}

/* A Google Books-style tile: cover art, then title, author and status pill
   underneath, all separated by whitespace. */
function BookTile({
  b,
  onOpen,
}: {
  b: Book;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(b.id)}
      aria-label={b.t}
      className="flex w-[104px] shrink-0 flex-col items-start gap-1 text-left"
    >
      {b.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={b.cover}
          alt=""
          className="h-[156px] w-full shrink-0 rounded-md object-cover shadow-[0_3px_8px_rgba(0,0,0,0.4)]"
        />
      ) : (
        <Cover b={b} />
      )}
      <span className="line-clamp-2 text-sm leading-snug text-foreground">
        {b.t}
      </span>
      <span className="line-clamp-1 text-xs text-muted-foreground">{b.a}</span>
      <StatusPill b={b} />
    </button>
  );
}

/* Front cover rendered from the book's colours, in the prototype's style. */
function Cover({ b }: { b: Book }) {
  return (
    <div
      className="relative flex h-[156px] w-full shrink-0 flex-col justify-between overflow-hidden rounded-md p-2 shadow-[inset_-3px_0_6px_rgba(0,0,0,0.4),0_3px_8px_rgba(0,0,0,0.4)] select-none"
      style={{ background: `linear-gradient(160deg, ${colourOf(b)}, #1a130b 135%)` }}
    >
      <div className="pointer-events-none absolute inset-[5px] rounded-[2px] border border-[#f4ead6]/25" />
      <p className="relative font-serif text-sm leading-tight text-balance text-[#f4ead6]">
        {b.t}
      </p>
      <p className="relative font-serif text-[11px] italic text-[#f4ead6]/70">
        {b.a}
      </p>
    </div>
  );
}

function StatusPill({ b }: { b: Book }) {
  if (b.wish) {
    return (
      <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">
        <i className="size-1.5 rounded-full bg-[#d4a0d8]" aria-hidden />
        Wishlist
      </Badge>
    );
  }
  if (b.st === "Read") {
    return <Badge className="h-4.5 px-1.5 text-[10px]">Read</Badge>;
  }
  if (b.st === "Reading") {
    return (
      <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">
        <i className="size-1.5 rounded-full bg-[#ffd76a]" aria-hidden />
        Reading
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">
      On shelf
    </Badge>
  );
}
