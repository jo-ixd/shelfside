"use client";

/* Mobile-only floating add button. It opens the shared Add menu (book or
   collection); on desktop the sidebar's Add button takes over. */

import { usePathname } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { AddMenu } from "@/components/add-menu";
import { buzz } from "@/lib/store";

export function AddFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ctx = pathname === "/wishlist" ? "wishlist" : "library";

  return (
    <>
      <button
        type="button"
        aria-label="Add a book or collection"
        onClick={() => {
          buzz(10);
          setOpen(true);
        }}
        className="fixed right-5 bottom-[78px] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/50 md:hidden"
      >
        <PlusIcon className="size-7" />
      </button>
      <AddMenu ctx={ctx} open={open} onOpenChange={setOpen} />
    </>
  );
}
