"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CameraIcon,
  LinkIcon,
  PencilSquareIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { buzz } from "@/lib/store";

type Mode = "manual" | "scan" | "link";

export function AddFab() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wish = pathname === "/wishlist";

  const acts: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    sub: string;
    mode: Mode;
  }[] = [
    { icon: PencilSquareIcon, label: "Add manually", sub: "Type the details yourself", mode: "manual" },
    { icon: CameraIcon, label: "Scan ISBN", sub: "Point the camera at the barcode", mode: "scan" },
  ];
  if (wish) {
    acts.push({ icon: LinkIcon, label: "Add from weblink", sub: "Amazon, Waterstones, any retailer page", mode: "link" });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Add a book"
        onClick={() => {
          buzz(10);
          setOpen(true);
        }}
        className="fixed right-5 bottom-[78px] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/50"
      >
        <PlusIcon className="size-7" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="p-4">
          <DrawerHeader className="p-0 pb-2">
            <DrawerTitle className="font-serif text-lg">Add a book</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-2.5">
            {acts.map((a) => (
              <button
                key={a.mode}
                type="button"
                onClick={() => {
                  setOpen(false);
                  const ctx = wish ? "wishlist" : "library";
                  buzz(10);
                  router.push(`/add?ctx=${ctx}&mode=${a.mode}`);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary px-3.5 py-3.5 text-left text-[0.95rem] text-foreground"
              >
                <a.icon className="size-6 shrink-0 text-primary" />
                <span>
                  {a.label}
                  <small className="block text-xs text-muted-foreground">
                    {a.sub}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
