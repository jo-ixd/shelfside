"use client";

/* Shared pieces for the prototype homepage and collection pages: Google
   Books-style cover tiles with the metadata underneath, whitespace-only
   rails, and inline collection renaming. */

import * as React from "react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GENRE_COLORS } from "@/lib/library";
import type { Pill, ProtoBook, ProtoCol } from "@/lib/proto-library";
import { cn } from "cn";

export function Cover({
  b,
  className,
}: {
  b: ProtoBook;
  className?: string;
}) {
  const base = b.c || GENRE_COLORS[b.g] || GENRE_COLORS.Other;
  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col justify-between overflow-hidden rounded-md p-2 select-none",
        "shadow-[inset_-3px_0_6px_rgba(0,0,0,0.4),0_3px_8px_rgba(0,0,0,0.4)]",
        className
      )}
      style={{ background: `linear-gradient(160deg, ${base}, #1a130b 135%)` }}
    >
      <div className="pointer-events-none absolute inset-[5px] rounded-[2px] border border-[#f4ead6]/25" />
      <div className="relative flex flex-col items-start gap-1">
        <p className="font-serif text-base leading-tight text-balance text-[#f4ead6]">
          {b.t}
        </p>
        {b.ed ? (
          <span className="rounded-full border border-[#f4ead6]/25 bg-[#f4ead6]/10 px-1.5 text-[9px] text-[#f4ead6]/85">
            {b.ed}
          </span>
        ) : null}
      </div>
      <p className="relative font-serif text-[11px] italic text-[#f4ead6]/70">
        {b.a}
      </p>
    </div>
  );
}

export function StatusPill({ pill }: { pill: Pill }) {
  if (pill === "Read") {
    return <Badge className="h-4.5 px-1.5 text-[10px]">Read</Badge>;
  }
  if (pill === "Wishlist") {
    return (
      <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">
        <i className="size-1.5 rounded-full bg-[#d4a0d8]" aria-hidden />
        Wishlist
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">
      On shelf
    </Badge>
  );
}

/* A Google Books-style tile: cover art, then title, author and status pill
   underneath, all separated by whitespace. */
export function BookTile({
  b,
  onOpen,
  className,
}: {
  b: ProtoBook;
  onOpen: (b: ProtoBook) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(b)}
      className={cn(
        "flex w-[104px] shrink-0 flex-col items-start gap-1 text-left",
        className
      )}
    >
      <Cover b={b} className="h-[156px] w-full" />
      <span className="line-clamp-2 text-base leading-snug text-foreground">
        {b.t}
      </span>
      <span className="line-clamp-1 text-xs text-muted-foreground">{b.a}</span>
      <StatusPill pill={b.pill} />
    </button>
  );
}

/* Horizontal rail: whitespace does the separating, no borders between books. */
export function Rail({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "flex gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

export function EmptySlot({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border-2 border-dashed border-border/70 text-muted-foreground/60",
        className
      )}
    >
      <span className="px-2 text-center text-[11px] leading-tight">{label}</span>
    </div>
  );
}

export function ColTitle({
  col,
  onRename,
  className,
}: {
  col: ProtoCol;
  onRename: (colId: string, name: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(col.name);

  function commit() {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== col.name) onRename(col.id, name);
    else setDraft(col.name);
  }

  if (editing) {
    return (
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(col.name);
            setEditing(false);
          }
        }}
        className="h-8 w-44 rounded-lg px-2 text-base"
        aria-label="Collection name"
      />
    );
  }
  return (
    <span className={cn("flex min-w-0 items-baseline gap-1", className)}>
      <span className="truncate font-serif">{col.name}</span>
      <button
        type="button"
        aria-label={`Rename ${col.name}`}
        onClick={() => {
          setDraft(col.name);
          setEditing(true);
        }}
        className="text-muted-foreground/70 transition-colors hover:text-primary"
      >
        <PencilSquareIcon className="size-4" />
      </button>
    </span>
  );
}

/* The rename input needs focus when it appears; a ref callback avoids the
   autoFocus lint rule. */
export function focusRef(el: HTMLInputElement | null) {
  el?.focus();
  el?.select();
}
