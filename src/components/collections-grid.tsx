"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  bookWidth,
  colourOf,
  SHELF,
  type Collection,
} from "@/lib/library";
import { buzz, useLibrary } from "@/lib/store";

export function CollectionsGrid({ wish }: { wish: boolean }) {
  const { state, update } = useLibrary();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  if (!state) return null;

  const cols: Collection[] = state.cols.filter((c) => c.wish === wish);
  const inWish = state.books.filter((b) => b.wish === wish);
  const noun = wish ? "list" : "collection";
  const sub = wish
    ? "Books you want to own, grouped into lists"
    : `${inWish.length} books across ${cols.length} collections`;

  function addCollection() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (state?.cols.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast(`"${trimmed}" already exists`);
      return;
    }
    update((d) => {
      d.cols.push({ name: trimmed, wish });
    });
    buzz(15);
    setAdding(false);
    setName("");
  }

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
              <h3 className="font-serif text-[0.95rem]">{c.name}</h3>
              <span className="text-[0.72rem] text-muted-foreground">
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
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-16 items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-sm text-muted-foreground/70"
        >
          <PlusIcon className="size-4" /> New {noun}
        </button>
      </section>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="font-serif">New {noun}</DialogTitle>
            <DialogDescription>
              Name your new {noun}. You can move books into it later.
            </DialogDescription>
          </DialogHeader>
          <Label
            htmlFor="new-col-name"
            className="text-xs uppercase tracking-widest text-muted-foreground"
          >
            Name
          </Label>
          <Input
            id="new-col-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={wish ? "Birthday list" : "Hallway"}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={addCollection} disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
