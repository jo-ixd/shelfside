"use client";

import { useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { BookDetailSheet } from "@/components/book-detail-sheet";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import {
  bookWidth,
  colourOf,
  READING_COLOR,
  SHELF,
  WISH_COLOR,
  type Book,
} from "@/lib/library";
import { buzz, useLibrary } from "@/lib/store";

type DropTarget = { shelf: string; idx: number };

type Gesture = {
  book: Book;
  el: HTMLElement;
  rect: DOMRect;
  sx: number;
  sy: number;
  timer: ReturnType<typeof setTimeout> | null;
  holding: boolean;
  dragging: boolean;
  scrollEl: HTMLElement | null;
  startScroll: number;
};

export function ShelfView() {
  const params = useSearchParams();
  const col = params.get("col") ?? "";
  const wish = params.get("wish") === "1";
  const { state, update } = useLibrary();

  const [searchQ, setSearchQ] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const gestureRef = useRef<Gesture | null>(null);
  const dropRef = useRef<DropTarget | null>(null);

  const q = searchQ.trim().toLowerCase();
  const all = state ? state.books.filter((b) => b.wish === wish && b.col === col) : [];

  /* Stop page scroll mid-gesture, like the prototype's touchmove guard. */
  useEffect(() => {
    if (!grabbedId && !drag) return;
    const h = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", h, { passive: false });
    return () => document.removeEventListener("touchmove", h);
  }, [grabbedId, drag]);

  function setDrop(t: DropTarget | null) {
    dropRef.current = t;
    setDropTarget(t);
  }

  function endGesture() {
    const g = gestureRef.current;
    if (g?.timer) clearTimeout(g.timer);
    gestureRef.current = null;
    setGrabbedId(null);
    setDrag(null);
    setDrop(null);
  }

  function updateDropTarget(e: PointerEvent) {
    const under = document.elementFromPoint(e.clientX, e.clientY) as
      | HTMLElement
      | null;
    const shelfEl = under?.closest<HTMLElement>("[data-shelf]") ?? null;
    if (!shelfEl || !shelfEl.dataset.shelf) {
      if (dropRef.current) setDrop(null);
      return;
    }
    const shelf = shelfEl.dataset.shelf;
    const books = Array.from(shelfEl.querySelectorAll<HTMLElement>("[data-book]"));
    let idx = books.length;
    for (let i = 0; i < books.length; i++) {
      const r = books[i].getBoundingClientRect();
      if (e.clientX < r.left + r.width / 2) {
        idx = i;
        break;
      }
    }
    const t: DropTarget = { shelf, idx };
    const prev = dropRef.current;
    if (!prev || prev.shelf !== t.shelf || prev.idx !== t.idx) setDrop(t);
  }

  function commitDrop(book: Book) {
    const target = dropRef.current;
    if (target) {
      update((d) => {
        const b = d.books.find((x) => x.id === book.id);
        if (!b) return;
        const bi = d.books.indexOf(b);
        if (bi > -1) d.books.splice(bi, 1);
        b.shelf = target.shelf;
        if (!b.w) b.w = bookWidth(b.t);
        b._new = true;
        const list = d.books.filter(
          (x) => x.wish === wish && x.col === col && x.shelf === target.shelf
        );
        if (target.idx < 0 || target.idx >= list.length) {
          d.books.push(b);
        } else {
          const anchor = list[target.idx];
          d.books.splice(d.books.indexOf(anchor), 0, b);
        }
      });
      buzz(25);
    }
    endGesture();
  }

  function onPointerDown(e: React.PointerEvent, book: Book) {
    if (!state) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const g: Gesture = {
      book,
      el,
      rect,
      sx: e.clientX,
      sy: e.clientY,
      timer: null,
      holding: false,
      dragging: false,
      scrollEl: null,
      startScroll: 0,
    };
    g.timer = setTimeout(() => {
      g.holding = true;
      buzz(15);
      setGrabbedId(book.id);
    }, 300);
    gestureRef.current = g;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - g.sx;
      const dy = ev.clientY - g.sy;
      const d = Math.hypot(dx, dy);
      if (g.dragging) {
        setDrag((prev) => (prev ? { ...prev, x: ev.clientX, y: ev.clientY } : prev));
        updateDropTarget(ev);
        return;
      }
      if (g.holding && d > 8) {
        g.dragging = true;
        if (g.timer) clearTimeout(g.timer);
        setGrabbedId(null);
        setDrag({
          id: g.book.id,
          x: ev.clientX,
          y: ev.clientY,
          w: g.rect.width,
          h: g.rect.height,
        });
        setDrop(null);
        updateDropTarget(ev);
        return;
      }
      if (!g.holding && d > 10) {
        if (g.timer) clearTimeout(g.timer);
        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          const shelfEl = g.el.closest<HTMLElement>("[data-shelf]");
          if (shelfEl) {
            g.scrollEl = shelfEl;
            g.startScroll = shelfEl.scrollLeft;
          }
        } else {
          gestureRef.current = null;
          return;
        }
      }
      if (g.scrollEl) g.scrollEl.scrollLeft = g.startScroll - dx;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      if (g.timer) clearTimeout(g.timer);
      if (g.dragging) {
        commitDrop(g.book);
      } else if (!g.holding && !g.scrollEl) {
        gestureRef.current = null;
        setGrabbedId(null);
        setDetailId(g.book.id);
      } else {
        gestureRef.current = null;
        setGrabbedId(null);
      }
    };
    const cancel = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      if (g.timer) clearTimeout(g.timer);
      gestureRef.current = null;
      setGrabbedId(null);
      setDrag(null);
      setDrop(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  }

  if (!state) return null;

  /* Group books by shelf, preserving first-seen order. */
  const byShelf = new Map<string, Book[]>();
  all.forEach((b) => {
    if (!byShelf.has(b.shelf)) byShelf.set(b.shelf, []);
    byShelf.get(b.shelf)!.push(b);
  });
  let matching = 0;
  byShelf.forEach((list) => {
    matching += list.filter(
      (b) => !q || (b.t + " " + b.a + " " + b.g).toLowerCase().includes(q)
    ).length;
  });

  const sub =
    (q ? `${matching} matching · ` : "") +
    `${all.length} book${all.length === 1 ? "" : "s"} · ${byShelf.size} shelf${byShelf.size === 1 ? "" : "ves"}` +
    (wish ? " · wishlist" : "");

  const dragBook = drag ? state.books.find((b) => b.id === drag.id) : undefined;

  return (
    <main>
      <PageHeader title={col} sub={sub} back={wish ? "/wishlist" : "/"} />
      <div className="px-4 pt-2.5">
        <Input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search these shelves…"
          autoComplete="off"
          className="h-11 rounded-[10px] px-3.5 text-base"
        />
      </div>
      <div className="mx-3.5 mt-3.5">
        {[...byShelf.entries()].map(([shelf, list]) => {
          const matches = (b: Book) =>
            !q || (b.t + " " + b.a + " " + b.g).toLowerCase().includes(q);
          const matchingCount = list.filter(matches).length;
          const draggingHere = dropTarget?.shelf === shelf;
          const items: React.ReactNode[] = [];
          let gapShown = false;
          list.forEach((b, i) => {
            if (draggingHere && dropTarget!.idx === i && !gapShown) {
              items.push(
                <div
                  key="gap"
                  className="pointer-events-none h-[140px] shrink-0 rounded-[2px_4px_4px_2px] border-2 border-dashed border-primary/70 bg-primary/10"
                  style={{ width: drag?.w ?? 40 }}
                />
              );
              gapShown = true;
            }
            if (drag && b.id === drag.id) return;
            items.push(
              <BookSpine
                key={b.id}
                b={b}
                match={matches(b)}
                grabbed={grabbedId === b.id}
                onPointerDown={onPointerDown}
                onOpen={setDetailId}
              />
            );
          });
          if (draggingHere && !gapShown) {
            items.push(
              <div
                key="gap"
                className="pointer-events-none h-[140px] shrink-0 rounded-[2px_4px_4px_2px] border-2 border-dashed border-primary/70 bg-primary/10"
                style={{ width: drag?.w ?? 40 }}
              />
            );
          }
          return (
            <div key={shelf} className="mb-0 mt-3.5">
              <p className="mb-1.5 ml-1 flex justify-between text-sm text-muted-foreground">
                <span>{shelf}</span>
                <span className="text-muted-foreground/60">
                  {matchingCount}
                  {q ? "/" + list.length : ""}
                </span>
              </p>
              <div
                data-shelf={shelf}
                className="flex items-end overflow-x-auto rounded-md px-2 pt-2.5 [scrollbar-width:none]"
                style={{
                  background: SHELF.gradient,
                  border: `2px solid ${SHELF.border}`,
                  borderBottom: `8px solid ${SHELF.lip}`,
                  minHeight: list.length ? 150 : 60,
                }}
              >
                {items}
              </div>
            </div>
          );
        })}
      </div>

      {drag && dragBook ? (
        <div
          className="pointer-events-none fixed z-50 flex items-center justify-center rounded-[2px_4px_4px_2px] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
          style={{
            left: drag.x - drag.w / 2,
            top: drag.y - drag.h / 2,
            width: drag.w,
            height: drag.h,
            background: colourOf(dragBook),
            transform: "rotate(4deg) scale(1.05)",
          }}
        >
          {!dragBook.spine ? (
            <span className="px-0.5 text-xs tracking-wider whitespace-nowrap text-white/90 [writing-mode:vertical-rl]">
              {dragBook.t}
            </span>
          ) : null}
        </div>
      ) : null}

      <BookDetailSheet bookId={detailId} onClose={() => setDetailId(null)} />
    </main>
  );
}

function BookSpine({
  b,
  match,
  grabbed,
  onPointerDown,
  onOpen,
}: {
  b: Book;
  match: boolean;
  grabbed: boolean;
  onPointerDown: (e: React.PointerEvent, b: Book) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div
      data-book
      role="button"
      tabIndex={0}
      aria-label={b.t}
      onPointerDown={(e) => onPointerDown(e, b)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(b.id);
        }
      }}
      className={`relative flex h-[140px] shrink-0 cursor-pointer items-center justify-center rounded-[2px_4px_4px_2px] shadow-[inset_-3px_0_5px_rgba(0,0,0,0.4)] transition-transform [touch-action:pan-y] select-none hover:-translate-y-1.5 ${
        grabbed ? "-translate-y-2.5 -rotate-2" : ""
      } ${match ? "" : "opacity-10"}`}
      style={{
        width: (b.w || bookWidth(b.t)) + "px",
        background: colourOf(b),
        backgroundImage: b.spine ? `url(${b.spine})` : undefined,
        backgroundSize: b.spine ? "cover" : undefined,
        backgroundPosition: b.spine ? "center" : undefined,
      }}
    >
      {!b.spine ? (
        <span className="pointer-events-none max-h-[130px] overflow-hidden px-0.5 py-2 text-xs tracking-wider whitespace-nowrap text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] [writing-mode:vertical-rl]">
          {b.t}
        </span>
      ) : null}
      {b.st === "Reading" ? (
        <span
          className="absolute bottom-1.5 left-1 right-1 h-[3px] rounded-sm"
          style={{ background: READING_COLOR, opacity: 0.8 }}
        />
      ) : null}
      {b.wish ? (
        <span
          className="absolute bottom-1.5 left-1 right-1 h-[3px] rounded-sm"
          style={{ background: WISH_COLOR }}
        />
      ) : null}
      {b.st.startsWith("Lent") ? (
        <ArrowRightIcon className="absolute top-1 right-1 size-3 text-[#ffd76a]" />
      ) : null}
    </div>
  );
}
