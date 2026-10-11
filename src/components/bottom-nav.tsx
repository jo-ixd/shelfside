"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarkIcon,
  BuildingLibraryIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  BookmarkIcon as BookmarkSolidIcon,
  BuildingLibraryIcon as BuildingLibrarySolidIcon,
  UserIcon as UserSolidIcon,
} from "@heroicons/react/24/solid";

const TABS = [
  { href: "/", label: "Collections", icon: BuildingLibraryIcon, active: BuildingLibrarySolidIcon },
  { href: "/wishlist", label: "Wishlist", icon: BookmarkIcon, active: BookmarkSolidIcon },
  { href: "/profile", label: "Profile", icon: UserIcon, active: UserSolidIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Main navigation"
    >
      {TABS.map((tab) => {
        const on = pathname === tab.href;
        const Icon = on ? tab.active : tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-base ${
              on ? "text-primary" : "text-muted-foreground/70"
            }`}
          >
            <Icon className="size-6" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
