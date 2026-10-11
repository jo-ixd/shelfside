"use client";

/* Homepage: one horizontal rail of standalone covers per collection, Google
   Books-style metadata underneath, whitespace doing the separating. Shelf
   structure lives on the collection page, not here. */

import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { BookDetailSheet } from "@/components/book-detail-sheet";
import { PageHeader } from "@/components/page-header";
import { BookTile } from "@/components/book-tile";
import { type Collection } from "@/lib/library";
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
      <PageHeader title={wish ? "Wishlist" : "Collections"} sub={sub} />
      {cols.map((c) => {
        const inCol = inWish.filter((b) => b.col === c.name);
        return (
          <section key={c.name} aria-label={c.name} className="mb-7">
            <div className="flex items-baseline gap-2 px-4">
              <h3 className="min-w-0 truncate font-serif text-lg">{c.name}</h3>
              <Link
                href={`/shelf?col=${encodeURIComponent(c.name)}&wish=${wish ? 1 : 0}`}
                className="flex shrink-0 items-center gap-0.5 text-base text-primary"
              >
                View all
                <ChevronRightIcon className="size-3.5" />
              </Link>
              <span className="shrink-0 text-base text-muted-foreground">
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
