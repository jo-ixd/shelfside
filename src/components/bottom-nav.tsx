"use client";

/* Mobile navigation: Collections tab plus an Account tab that opens the
   same account menu the desktop sidebar carries at its bottom. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BuildingLibraryIcon, UserIcon } from "@heroicons/react/24/outline";
import { BuildingLibraryIcon as BuildingLibrarySolidIcon } from "@heroicons/react/24/solid";
import { AccountContent } from "@/components/account-content";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function BottomNav() {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);

  const on = pathname === "/";
  const CollectionsIcon = on ? BuildingLibrarySolidIcon : BuildingLibraryIcon;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Main navigation"
    >
      <Link
        href="/"
        aria-current={on ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-base ${
          on ? "text-primary" : "text-muted-foreground/70"
        }`}
      >
        <CollectionsIcon className="size-6" />
        Collections
      </Link>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={accountOpen}
        onClick={() => setAccountOpen(true)}
        className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-base ${
          accountOpen ? "text-primary" : "text-muted-foreground/70"
        }`}
      >
        <UserIcon className="size-6" />
        Account
      </button>
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Account</DialogTitle>
          </DialogHeader>
          <AccountContent />
        </DialogContent>
      </Dialog>
    </nav>
  );
}
