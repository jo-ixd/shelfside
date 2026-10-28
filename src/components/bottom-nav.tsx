"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BuildingLibraryIcon, UserIcon } from "@heroicons/react/24/outline";
import { BuildingLibraryIcon as BuildingLibrarySolidIcon } from "@heroicons/react/24/solid";

export function BottomNav() {
  const pathname = usePathname();

  const on = pathname === "/";
  const settingsOn = pathname.startsWith("/settings");
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
      <Link
        href="/settings/account"
        aria-current={settingsOn ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-base ${
          settingsOn ? "text-primary" : "text-muted-foreground/70"
        }`}
      >
        <UserIcon className="size-6" />
        Account
      </Link>
    </nav>
  );
}
