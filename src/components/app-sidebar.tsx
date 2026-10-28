"use client";

/* Desktop navigation, styled after the "Reading Room" proposal: the sidebar
   is the collections rail — Add up top, one row per collection with its mini
   spine-stack and book count, and a simple account menu at the bottom.
   Rows link to the home pane for that collection (/?col=…), so selection
   stays in the URL across the whole app. */

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ChevronRightIcon,
  ChevronUpIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { cn } from "cn";
import { AddMenu } from "@/components/add-menu";
import { Button } from "@/components/ui/button";
import { colourOf, type Book } from "@/lib/library";
import { buzz, useLibrary } from "@/lib/store";

/* Deterministic rhythm for the decorative mini spines: same book position
   always gets the same shape, so each collection reads as its own stack. */
const SPINE_H = [34, 30, 36, 28, 32, 36, 30, 34];
const SPINE_W = [10, 8, 9, 11, 8, 10, 9, 12];

const SETTINGS_ITEMS = [
  { label: "Account", href: "/settings/account" },
  { label: "Notifications", href: "/settings/notifications" },
  { label: "Export data", href: "/settings/export" },
  { label: "About Shelfside", href: "/settings/about" },
];

function SpineStack({ books }: { books: Book[] }) {
  return (
    <div aria-hidden className="flex h-9 shrink-0 items-end gap-[2px]">
      {books.slice(0, 8).map((b, i) => (
        <span
          key={b.id}
          className="block rounded-[1px] shadow-[inset_-1px_0_0_rgba(0,0,0,0.45)]"
          style={{
            background: colourOf(b),
            width: SPINE_W[i % SPINE_W.length],
            height: SPINE_H[i % SPINE_H.length],
          }}
        />
      ))}
    </div>
  );
}

/* useSearchParams needs a suspense boundary while pages prerender. */
export function AppSidebar() {
  return (
    <React.Suspense fallback={null}>
      <Sidebar />
    </React.Suspense>
  );
}

function Sidebar() {
  const { state } = useLibrary();
  const pathname = usePathname();
  const params = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountBtnRef = React.useRef<HTMLButtonElement>(null);
  const accountPanelRef = React.useRef<HTMLDivElement>(null);

  const closeAccount = React.useCallback(() => {
    setAccountOpen(false);
    accountBtnRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAccount();
    };
    document.addEventListener("keydown", onKey);
    accountPanelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [accountOpen, closeAccount]);

  if (!state) return null;

  const cols = state.books.reduce<Array<{ name: string; books: Book[] }>>(
    (acc, b) => {
      let row = acc.find((c) => c.name === b.col);
      if (!row) {
        row = { name: b.col, books: [] };
        acc.push(row);
      }
      row.books.push(b);
      return acc;
    },
    state.cols.map((c) => ({ name: c.name, books: [] })),
  );

  const activeName =
    params.get("col") ?? (pathname === "/" ? cols[0]?.name : undefined);

  const name = state.profile.name;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col border-r border-border bg-sidebar px-3 py-5 md:flex">
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
        <nav
          aria-label="Collections"
          className="mt-5 flex-1 overflow-y-auto pb-2"
        >
          {cols.map((c) => {
            const on = c.name === activeName;
            return (
              <Link
                key={c.name}
                href={`/?col=${encodeURIComponent(c.name)}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "group/row flex items-center gap-3 border-l-2 px-3 py-3 text-left outline-none",
                  "min-h-[56px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  "transition-colors motion-safe:duration-200 motion-reduce:transition-none",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent text-foreground hover:bg-accent/40 motion-reduce:hover:bg-primary/10",
                )}
              >
                <SpineStack books={c.books} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-medium leading-tight">
                    {c.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.books.length} book{c.books.length === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Account menu pinned to the bottom of the rail. */}
        <div className="relative mt-3 border-t border-border pt-3">
          {accountOpen ? (
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={closeAccount}
              className="fixed inset-0 z-40 cursor-default"
            />
          ) : null}
          <button
            ref={accountBtnRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-controls="account-menu"
            onClick={() => {
              buzz(10);
              setAccountOpen((o) => !o);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {(name || "?").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {name}
            </span>
            <ChevronUpIcon
              aria-hidden
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform motion-safe:duration-200",
                accountOpen && "rotate-180",
              )}
            />
          </button>
          {accountOpen ? (
            <div
              ref={accountPanelRef}
              id="account-menu"
              role="menu"
              aria-label="Account settings"
              tabIndex={-1}
              className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-50 rounded-xl border border-border bg-popover p-1.5 shadow-xl shadow-black/40 focus:outline-none"
            >
              {SETTINGS_ITEMS.map((item) => {
                const on = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    aria-current={on ? "page" : undefined}
                    onClick={closeAccount}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring",
                      "transition-colors motion-safe:duration-200 motion-reduce:transition-none",
                      on
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent/40 motion-reduce:hover:bg-primary/10",
                    )}
                  >
                    {item.label}
                    <ChevronRightIcon
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0",
                        on ? "text-primary/60" : "text-muted-foreground/60",
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </aside>
      <AddMenu open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
