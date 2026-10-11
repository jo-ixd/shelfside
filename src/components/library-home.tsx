"use client";

/* Homepage: one flat horizontal rail of covers per collection, Google
   Books-style metadata underneath, whitespace doing the separating. Groups
   and series structure live on the collection page, not here. */

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";
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
import { BookTile, ColTitle, EmptySlot, Rail } from "@/components/proto-shared";
import {
  addProtoCol,
  getProtoCols,
  getServerProtoCols,
  renameProtoCol,
  subscribeProtoCols,
} from "@/lib/proto-library";

export function LibraryHome() {
  const cols = React.useSyncExternalStore(
    subscribeProtoCols,
    getProtoCols,
    getServerProtoCols
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");

  if (!cols) return null;

  const totalBooks = cols.reduce(
    (sum, c) => sum + c.groups.reduce((s, g) => s + g.books.length, 0),
    0
  );

  function submitNewCol() {
    if (!nameDraft.trim()) return;
    addProtoCol(nameDraft);
    setDialogOpen(false);
    setNameDraft("");
    toast("Collection added");
  }

  return (
    <main>
      <header className="px-4 pt-5 pb-3">
        <h1 className="font-serif text-2xl">Your library</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {totalBooks} book{totalBooks === 1 ? "" : "s"} across{" "}
          {cols.length} collection{cols.length === 1 ? "" : "s"}
        </p>
      </header>
      {cols.map((col) => {
        const flat = col.groups.flatMap((g) => g.books);
        return (
          <section key={col.id} aria-label={col.name} className="mb-7">
            <div className="flex items-baseline gap-2 px-4">
              <ColTitle col={col} onRename={renameProtoCol} className="text-lg" />
              <span className="shrink-0 text-sm text-muted-foreground">
                {flat.length} book{flat.length === 1 ? "" : "s"}
              </span>
              <Link
                href={`/collection?col=${col.id}`}
                className="ml-auto flex shrink-0 items-center gap-0.5 text-sm text-primary"
              >
                View all
                <ChevronRightIcon className="size-3.5" />
              </Link>
            </div>
            <Rail className="mt-3 items-start px-4">
              {flat.length === 0 ? (
                <EmptySlot
                  label="No books yet"
                  className="h-[156px] w-40"
                />
              ) : (
                flat.map((bk) => (
                  <BookTile
                    key={bk.id}
                    b={bk}
                    onOpen={(book) =>
                      toast(
                        `"${book.t}" opens the detail sheet — not part of this prototype`
                      )
                    }
                  />
                ))
              )}
            </Rail>
          </section>
        );
      })}
      <div className="px-4 pb-2">
        <Button
          variant="outline"
          className="w-full justify-center border-dashed"
          onClick={() => {
            setNameDraft("");
            setDialogOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          New collection
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>
              Books land here once you add them from the unsorted pool.
            </DialogDescription>
          </DialogHeader>
          <Input
            ref={(el) => {
              if (dialogOpen) {
                el?.focus();
                el?.select();
              }
            }}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNewCol();
            }}
            placeholder="Collection name"
            aria-label="Collection name"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNewCol}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
