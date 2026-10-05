"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  bookWidth,
  colourOf,
  SHELF,
  type Collection,
} from "@/lib/library";
import { useLibrary } from "@/lib/store";

export function CollectionsGrid({ wish }: { wish: boolean }) {
  const { state } = useLibrary();

  if (!state) return null;

  const cols: Collection[] = state.cols.filter((c) => c.wish === wish);
  const inWish = state.books.filter((b) => b.wish === wish);
  const sub = wish
    ? "Books you want to own, grouped into lists"
    : `${inWish.length} book${inWish.length === 1 ? "" : "s"} across ${cols.length} collection${cols.length === 1 ? "" : "s"}`;

  return (
    <>
      <PageHeader title={wish ? "Wishlist" : "Shelfside"} sub={sub} />
      <section aria-label={sub} className="grid grid-cols-1 gap-3 px-4 pt-3.5 pb-2">
        {cols.map((c) => {
          const inCol = inWish.filter((b) => b.col === c.name);
          const shelves = new Set(inCol.map((b) => b.shelf));
          return (
            <Link
              key={c.name}
              href={`/shelf?col=${encodeURIComponent(c.name)}&wish=${wish ? 1 : 0}`}
              className="block rounded-2xl border border-border bg-card p-3 transition-colors active:border-primary"
            >
              <h3 className="font-serif text-lg">{c.name}</h3>
              <span className="text-xs text-muted-foreground">
                {inCol.length} book{inCol.length === 1 ? "" : "s"} ·{" "}
                {shelves.size} shelf{shelves.size === 1 ? "" : "ves"}
              </span>
              <div
                className="mt-2.5 flex h-16 items-end gap-0.5 overflow-hidden rounded-md px-1.25 pt-1"
                style={{
                  background: SHELF.miniGradient,
                  border: "1px solid var(--border)",
                  borderBottom: `5px solid ${SHELF.lip}`,
                }}
              >
                {inCol.slice(0, 10).map((b) => (
                  <i
                    key={b.id}
                    className="block h-14 shrink-0 rounded-[1px_2px_2px_1px]"
                    style={{
                      background: colourOf(b),
                      width: (b.w || bookWidth(b.t)) + "px",
                    }}
                  />
                ))}
              </div>
            </Link>
          );
        })}
      </section>
    </>
  );
}
