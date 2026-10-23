"use client";

/* The Add menu: one small dialog with the only two choices that matter —
   a book, or a collection to put it in. Shared by the mobile FAB and the
   desktop sidebar so both entry points stay identical. */

import { useRouter } from "next/navigation";
import { BookOpenIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buzz } from "@/lib/store";

export function AddMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    buzz(10);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">Add</DialogTitle>
          <DialogDescription>
            A book to shelve, or a new collection to shelve it in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => go("/add")}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary px-3.5 py-3.5 text-left text-base text-foreground"
          >
            <BookOpenIcon className="size-6 shrink-0 text-primary" />
            <span>
              Add a book
              <small className="block text-base text-muted-foreground">
                Type the details or scan the ISBN
              </small>
            </span>
          </button>
          <button
            type="button"
            onClick={() => go("/collections/new")}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary px-3.5 py-3.5 text-left text-base text-foreground"
          >
            <PlusIcon className="size-6 shrink-0 text-primary" />
            <span>
              New collection
              <small className="block text-base text-muted-foreground">
                Group books into a new collection
              </small>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
