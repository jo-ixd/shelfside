"use client";

import { useRef, useState } from "react";
import { CameraIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  colourOf,
  READING_COLOR,
  statusLabel,
  statusList,
  type Book,
} from "@/lib/library";
import { buzz, useLibrary } from "@/lib/store";
import { fileToCoverData } from "@/lib/library";
import { toast } from "sonner";

export function BookDetailSheet({
  bookId,
  onClose,
}: {
  bookId: string | null;
  onClose: () => void;
}) {
  const { state, update } = useLibrary();
  const [armedId, setArmedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const book: Book | undefined = bookId
    ? state?.books.find((b) => b.id === bookId)
    : undefined;
  const armed = book !== undefined && armedId === book.id;

  if (!state) return null;

  function cycleStatus(b: Book) {
    const list = statusList(b);
    const label = b.wish ? b.st : statusLabel(b);
    const i = list.indexOf(label);
    update((d) => {
      const nb = d.books.find((x) => x.id === b.id);
      if (!nb) return;
      nb.st = list[(i + 1) % list.length];
      if (nb.st === "Reading" && !nb.prog) nb.prog = 0;
    });
    buzz(10);
  }

  function addProgress(b: Book) {
    let finished = false;
    update((d) => {
      const nb = d.books.find((x) => x.id === b.id);
      if (!nb) return;
      nb.prog = Math.min(100, (nb.prog || 0) + 10);
      if (nb.prog === 100) {
        nb.prog = 0;
        nb.st = "Read";
        finished = true;
      }
    });
    if (finished) {
      buzz(30);
      toast("Finished — nice one");
    }
  }

  function removeBook(b: Book) {
    if (!armed) {
      setArmedId(b.id);
      return;
    }
    update((d) => {
      d.books = d.books.filter((x) => x.id !== b.id);
    });
    buzz(20);
    onClose();
    toast("Removed");
  }

  async function swapCover(b: Book, file: File | undefined) {
    if (!file || !b) return;
    let data: string;
    try {
      data = await fileToCoverData(file);
    } catch {
      toast("Couldn't read that image");
      return;
    }
    const ok = update((d) => {
      const nb = d.books.find((x) => x.id === b.id);
      if (nb) nb.cover = data;
    });
    if (!ok) {
      /* The failed save was never committed, so committed state (including
         any previous cover) is untouched — nothing to roll back. */
      toast("Storage full, cover not saved");
    }
    buzz(15);
  }

  if (!book) return null;

  const prog = book.prog || 0;

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[86dvh] overflow-y-auto p-4 text-left">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-2.5 right-3.5 text-muted-foreground"
        >
          <XMarkIcon className="size-5" />
        </button>
        <div className="flex gap-3.5">
          <button
            type="button"
            aria-label="Swap cover"
            onClick={() => fileRef.current?.click()}
            className="relative h-[140px] w-24 shrink-0 cursor-pointer overflow-hidden rounded-[4px_8px_8px_4px] shadow-[3px_4px_10px_rgba(0,0,0,0.5)]"
            style={
              book.cover
                ? undefined
                : {
                    background: `linear-gradient(135deg, ${colourOf(book)}, #161009)`,
                  }
            }
          >
            {book.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.cover}
                alt={book.t}
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
                <CameraIcon className="size-5" />
                Swap cover
              </span>
            )}
          </button>
          <div className="min-w-0 pt-0.5">
            <DrawerTitle className="font-serif text-lg leading-snug">
              {book.t}
            </DrawerTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {book.a || "Unknown author"}
            </p>
          </div>
        </div>
        <p className="pt-2 text-sm text-muted-foreground">
          {book.col} · {book.shelf} · {book.g || "Unsorted"}
          {book.added ? ` · added ${book.added}` : ""}
        </p>
        <button
          type="button"
          onClick={() => cycleStatus(book)}
          className="mt-2.5 w-fit rounded-full border border-border bg-secondary px-3.5 py-1.5 text-sm"
        >
          {book.st}
        </button>
        {book.st === "Reading" ? (
          <div className="mt-3">
            <button
              type="button"
              aria-label="Add 10% progress"
              onClick={() => addProgress(book)}
              className="block h-3.5 w-full overflow-hidden rounded-full bg-secondary"
            >
              <span
                className="block h-full rounded-full transition-[width] duration-200"
                style={{
                  width: prog + "%",
                  background: `linear-gradient(90deg, var(--primary), ${READING_COLOR})`,
                }}
              />
            </button>
            <p className="mt-1 text-sm text-muted-foreground">
              {prog}% through · tap the bar to add 10%
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => removeBook(book)}
          className="mt-3.5 w-full rounded-lg border border-destructive/40 px-3.5 py-2 text-sm text-destructive"
        >
          {armed
            ? `Tap again to remove \u201C${book.t}\u201D`
            : book.wish
              ? "Remove from wishlist"
              : "Remove from library"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void swapCover(book, f);
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}
