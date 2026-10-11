"use client";

/* Google Books-style tile shared by the home rails and the collection page:
   cover art, then title, author and status pill underneath, whitespace doing
   the separating. */

import * as React from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { colourOf, type Book } from "@/lib/library";

export function BookTile({
  b,
  onOpen,
  onPointerDown,
  dimmed,
  grabbed,
}: {
  b: Book;
  onOpen: (id: string) => void;
  /* When provided the caller owns the pointer gesture (drag-and-drop) and
     the tap-to-open path; the internal click handler stays off. */
  onPointerDown?: (e: React.PointerEvent, b: Book) => void;
  dimmed?: boolean;
  grabbed?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={b.t}
      onClick={onPointerDown ? undefined : () => onOpen(b.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(b.id);
        }
      }}
      onPointerDown={onPointerDown ? (e) => onPointerDown(e, b) : undefined}
      className={cn(
        "flex w-[104px] shrink-0 cursor-pointer flex-col items-start gap-1 text-left select-none [touch-action:pan-y] transition-transform hover:-translate-y-1.5",
        grabbed && "-translate-y-2.5",
        dimmed && "opacity-10",
      )}
    >
      <Cover b={b} />
      <span className="line-clamp-2 text-base leading-snug text-foreground">
        {b.t}
      </span>
      <span className="line-clamp-1 text-xs text-muted-foreground">{b.a}</span>
      <StatusPill b={b} />
    </div>
  );
}

/* Cover art: the real cover when the book has one, otherwise a front cover
   rendered from the book's colours, in the prototype's style. */
export function Cover({ b }: { b: Book }) {
  if (b.cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={b.cover}
        alt=""
        className="h-[156px] w-full shrink-0 rounded-md object-cover shadow-[0_3px_8px_rgba(0,0,0,0.4)]"
      />
    );
  }
  return (
    <div
      className="relative flex h-[156px] w-full shrink-0 flex-col justify-between overflow-hidden rounded-md p-2 shadow-[inset_-3px_0_6px_rgba(0,0,0,0.4),0_3px_8px_rgba(0,0,0,0.4)] select-none"
      style={{
        background: `linear-gradient(160deg, ${colourOf(b)}, #1a130b 135%)`,
      }}
    >
      <div className="pointer-events-none absolute inset-[5px] rounded-[2px] border border-[#f4ead6]/25" />
      <p className="relative font-serif text-base leading-tight text-balance text-[#f4ead6]">
        {b.t}
      </p>
      <p className="relative font-serif text-[11px] italic text-[#f4ead6]/70">
        {b.a}
      </p>
    </div>
  );
}

export function StatusPill({ b }: { b: Book }) {
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
