"use client";

import { useState } from "react";
import { ACCENTS } from "@/lib/library";
import { buzz, useLibrary } from "@/lib/store";
import { Input } from "@/components/ui/input";

export function AccountView() {
  const { state, update } = useLibrary();
  const [nameInput, setNameInput] = useState<string | null>(null);

  if (!state) return null;

  const name = nameInput ?? state.profile.name;

  const reading = state.books.filter((b) => b.st === "Reading").length;
  const shelves = new Set(state.books.map((b) => b.col + "|" + b.shelf)).size;

  function saveName(value: string) {
    const next = value.trim() || "Reader";
    update((d) => {
      d.profile.name = next;
    });
    setNameInput(next);
  }

  function pickAccent(accent: string) {
    update((d) => {
      d.profile.accent = accent;
    });
    buzz(10);
  }

  return (
    <div className="px-4 pt-2.5">
      <div className="flex gap-4">
        <div className="flex size-[84px] shrink-0 items-center justify-center rounded-full bg-primary font-serif text-[2rem] font-bold text-primary-foreground">
          {(name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 pt-[18px]">
          <p className="text-base text-muted-foreground">Name</p>
          <Input
            value={name}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={(e) => saveName(e.target.value)}
            autoComplete="off"
            className="mt-1 h-10 w-[200px] max-w-full rounded-lg px-3"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2.5">
        {[
          { n: state.books.length, l: "Books" },
          { n: reading, l: "Reading" },
          { n: shelves, l: "Shelves" },
        ].map((s) => (
          <div
            key={s.l}
            className="flex-1 rounded-xl border border-border bg-card p-3 text-center"
          >
            <div className="text-2xl font-bold">{s.n}</div>
            <div className="mt-0.5 text-base text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      <section className="pt-4.5">
        <h2 className="mb-2.5 text-base text-muted-foreground">Theme</h2>
        <div className="flex gap-3">
          {Object.entries(ACCENTS).map(([name_, hex]) => (
            <button
              key={name_}
              type="button"
              aria-label={`${name_} theme`}
              aria-pressed={state.profile.accent === name_}
              onClick={() => pickAccent(name_)}
              className={`size-11 rounded-full border-3 ${
                state.profile.accent === name_
                  ? "border-white"
                  : "border-transparent"
              }`}
              style={{ background: hex }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
