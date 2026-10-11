"use client";

/* Desktop navigation: fixed sidebar with the nav links and the Add button,
   replacing the mobile bottom nav + FAB on md-and-up screens. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookmarkIcon,
  BuildingLibraryIcon,
  PlusIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  BookmarkIcon as BookmarkSolidIcon,
  BuildingLibraryIcon as BuildingLibrarySolidIcon,
  UserIcon as UserSolidIcon,
} from "@heroicons/react/24/solid";
import { AddMenu } from "@/components/add-menu";
import { Button } from "@/components/ui/button";
import { buzz } from "@/lib/store";

const TABS = [
  { href: "/", label: "Collections", icon: BuildingLibraryIcon, active: BuildingLibrarySolidIcon },
  { href: "/wishlist", label: "Wishlist", icon: BookmarkIcon, active: BookmarkSolidIcon },
  { href: "/profile", label: "Profile", icon: UserIcon, active: UserSolidIcon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const ctx = pathname === "/wishlist" ? "wishlist" : "library";

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-sidebar px-3 py-5 md:flex">
        <p className="px-2 font-serif text-xl">Shelfside</p>
        <Button
          size="lg"
          className="mt-5 w-full justify-center"
          onClick={() => {
            buzz(10);
            setAddOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add
        </Button>
        <nav aria-label="Main navigation" className="mt-6 flex flex-col gap-1">
          {TABS.map((tab) => {
            const on = pathname === tab.href;
            const Icon = on ? tab.active : tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base ${
                  on
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-6 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <AddMenu ctx={ctx} open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
