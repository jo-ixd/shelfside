"use client";

/* Collection page: this is where the group structure surfaces. Each group
   (auto-filed by series, or user-created) gets its own rail, presented the
   same way collections are presented on the homepage. */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button, buttonVariants } from "@/components/ui/button";
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
  addProtoGroup,
  getProtoCols,
  getServerProtoCols,
  renameProtoCol,
  subscribeProtoCols,
} from "@/lib/proto-library";
import { cn } from "cn";

export function ProtoCollectionView() {
  const params = useSearchParams();
  const cols = React.useSyncExternalStore(
    subscribeProtoCols,
    getProtoCols,
    getServerProtoCols
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");

  if (!cols) return null;

  const col = cols.find((c) => c.id === (params.get("col") ?? ""));

  if (!col) {
    return (
      <main className="px-4 pt-6">
        <p className="text-sm text-muted-foreground">
          That collection doesn&apos;t exist.
        </p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "mt-3 w-fit")}>
          Back to your library
        </Link>
      </main>
    );
  }

  const totalBooks = col.groups.reduce((s, g) => s + g.books.length, 0);

  function submitNewGroup() {
    if (!nameDraft.trim()) return;
    addProtoGroup(col!.id, nameDraft);
    setDialogOpen(false);
    setNameDraft("");
    toast("Group added");
  }

  return (
    <main>
      <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-1">
        <Link href="/" aria-label="Back" className="text-primary">
          <ArrowLeftIcon className="size-6" />
        </Link>
        <ColTitle col={col} onRename={renameProtoCol} className="text-2xl" />
      </div>
      <p className="px-4 pb-1 text-sm text-muted-foreground">
        {totalBooks} book{totalBooks === 1 ? "" : "s"} · {col.groups.length}{" "}
        group{col.groups.length === 1 ? "" : "s"} · auto-filed by series
      </p>

      {col.groups.map((g) => (
        <section key={g.name} aria-label={g.name} className="mb-6">
          <div className="flex items-baseline gap-2 px-4">
            <h2 className="font-serif text-lg">{g.name}</h2>
            <span className="text-xs text-muted-foreground/70">
              {g.auto ? "auto-sorted" : "custom"}
            </span>
            <span className="ml-auto shrink-0 text-sm text-muted-foreground">
              {g.books.length} book{g.books.length === 1 ? "" : "s"}
            </span>
          </div>
          <Rail className="mt-2.5 items-start px-4">
            {g.books.length === 0 ? (
              <EmptySlot
                label="No books in this group yet — move them over from a book's page"
                className="h-[156px] w-56"
              />
            ) : (
              g.books.map((bk) => (
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
      ))}

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
          New group
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
            <DialogDescription>
              Custom groups sit alongside the auto-sorted ones and win over
              them.
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
              if (e.key === "Enter") submitNewGroup();
            }}
            placeholder="Group name"
            aria-label="Group name"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNewGroup}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
