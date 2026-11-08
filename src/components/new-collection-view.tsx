"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { buzz, useLibrary } from "@/lib/store";

export function NewCollectionView() {
  const router = useRouter();
  const { state, update } = useLibrary();

  const [name, setName] = useState("");

  if (!state) return null;

  function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (
      state?.cols.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      toast(`"${trimmed}" already exists`);
      return;
    }
    update((d) => {
      d.cols.push({ name: trimmed });
    });
    buzz(15);
    router.push("/");
  }

  return (
    <main>
      <PageHeader
        title="New collection"
        sub="Name your new collection. You can move books into it later."
        back="/"
      />
      <form
        className="px-4 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <Label
          htmlFor="new-col-name"
          className="text-base text-muted-foreground"
        >
          Name
        </Label>
        <Input
          id="new-col-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hallway"
          autoComplete="off"
          className="mt-1 h-10 rounded-lg px-3"
          autoFocus
        />
        <Button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 h-12 w-full rounded-[10px] text-base font-bold"
        >
          Create collection
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
          className="mt-2.5 h-12 w-full rounded-[10px] text-base font-bold"
        >
          Cancel
        </Button>
      </form>
    </main>
  );
}
