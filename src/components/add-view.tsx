"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import {
  CameraIcon,
  CheckCircleIcon,
  PhotoIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { CameraOverlay } from "@/components/camera-overlay";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bookWidth,
  fileToCoverData,
  GENRE_COLORS,
  LINK_MATCHES,
  makeCover,
  SCAN_MATCHES,
  type Book,
} from "@/lib/library";
import { buzz, useLibrary } from "@/lib/store";

const MATCHED = { bg: "#2a3b2a", border: "#3f5a3f", text: "#a8d8b0" };
const GENRES = Object.keys(GENRE_COLORS);

export function AddView() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, update } = useLibrary();

  const ctx = params.get("ctx") === "wishlist" ? "wishlist" : "library";
  const wish = ctx === "wishlist";

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [shelf, setShelf] = useState("Shelf A");
  const [genre, setGenre] = useState(GENRES[0]);
  const [colValue, setColValue] = useState<string>("");
  const [coverData, setCoverData] = useState<string | null>(null);
  const [matched, setMatched] = useState<string | null>(null);
  const [camMode, setCamMode] = useState<null | "scan" | "ai">(null);
  const [chooser, setChooser] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [url, setUrl] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const scanIdx = useRef(0);

  const cols = state?.cols.filter((c) => c.wish === wish) ?? [];
  const col = colValue || cols[0]?.name || "";

  function prefill(
    m: { t: string; a: string; g: string },
    note: string
  ) {
    setTitle(m.t);
    setAuthor(m.a || "");
    setGenre(GENRES.includes(m.g) ? m.g : "Other");
    setCoverData(makeCover(m.t, m.a, m.g));
    setMatched(note);
    buzz(20);
  }

  function nextMatch() {
    const m = SCAN_MATCHES[scanIdx.current++ % SCAN_MATCHES.length];
    return m;
  }

  function save() {
    const t = title.trim();
    if (!t) {
      toast("A title is the one thing it needs");
      return;
    }
    const nb: Book = {
      id: "u" + Date.now(),
      t,
      a: author.trim() || "Unknown author",
      g: genre,
      col: col,
      shelf: shelf.trim() || "Shelf A",
      st: wish ? "Wish" : "To Read",
      wish,
      _new: true,
      c: GENRE_COLORS[genre] || GENRE_COLORS.Other,
      w: bookWidth(t),
      added: new Date().toISOString().slice(0, 10),
    };
    if (coverData) nb.cover = coverData;
    const ok = update((d) => {
      if (!d.cols.some((c) => c.name.toLowerCase() === nb.col.toLowerCase() && c.wish === wish)) {
        d.cols.push({ name: nb.col, wish });
      }
      d.books.push(nb);
    });
    if (!ok) {
      update((d) => {
        d.books = d.books.filter((x) => x.id !== nb.id);
      });
      toast("Storage full — book not saved");
      return;
    }
    buzz(25);
    toast(`\u201C${t}\u201D added`);
    router.push(wish ? "/wishlist" : "/");
  }

  function fetchLink() {
    const u = url.trim();
    if (!u) {
      toast("Paste a retailer link first");
      return;
    }
    setFetching(true);
    setTimeout(() => {
      setFetching(false);
      const host = Object.keys(LINK_MATCHES).find((h) =>
        u.toLowerCase().includes(h)
      );
      const m = host ? LINK_MATCHES[host] : nextMatch();
      prefill(m, "Details scraped from the page — edit anything");
    }, 1600);
  }

  if (!state) return null;

  const showSave = Boolean(title.trim() || coverData);
  const back = wish ? "/wishlist" : "/";

  return (
    <main>
      <PageHeader
        title="Add a book"
        sub={wish ? "to your wishlist" : "to your library"}
        back={back}
      />
      <div className="px-4 pt-3">
        {matched ? (
          <p
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-base"
            style={{ background: MATCHED.bg, border: `1px solid ${MATCHED.border}`, color: MATCHED.text }}
          >
            <CheckCircleIcon className="size-4 shrink-0" />
            {matched}
          </p>
        ) : null}
        <div className="flex gap-3.5">
          <button
            type="button"
            aria-label="Add cover"
            onClick={() => setChooser(true)}
            className="relative flex h-[158px] w-[108px] shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[4px_8px_8px_4px] border border-dashed border-border bg-secondary p-2 text-center text-xs text-muted-foreground/80"
            style={coverData ? { borderStyle: "solid" } : undefined}
          >
            {coverData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverData}
                alt="Cover preview"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <>
                <CameraIcon className="size-5" />
                Add cover
              </>
            )}
          </button>
          <div className="min-w-0 flex-1 pt-1">
            {wish ? (
              <div className="mb-2">
                <Label className="text-base text-muted-foreground">
                  Product page link
                </Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…"
                    inputMode="url"
                    className="h-10 flex-1 rounded-lg px-3"
                  />
                  <Button onClick={fetchLink} className="h-10 font-bold">
                    {fetching ? "…" : "Fetch"}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <Label
                htmlFor="f-title"
                className="text-base text-muted-foreground"
              >
                Title
              </Label>
              <button
                type="button"
                onClick={() => {
                  buzz(10);
                  setCamMode("scan");
                }}
                className="flex items-center gap-1 text-base text-primary"
              >
                <CameraIcon className="size-4" />
                Scan ISBN
              </button>
            </div>
            <Input
              id="f-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title"
              autoComplete="off"
              className="mt-1 h-10 rounded-lg px-3"
              autoFocus
            />
            <Label
              htmlFor="f-author"
              className="mt-2.5 text-base text-muted-foreground"
            >
              Author
            </Label>
            <Input
              id="f-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author"
              autoComplete="off"
              className="mt-1 h-10 rounded-lg px-3"
            />
          </div>
        </div>

        <div className="mt-1 flex gap-2.5">
          <div className="flex-1">
            <Label className="text-base text-muted-foreground">
              Collection
            </Label>
            <Select
              value={col}
              onValueChange={(v) => setColValue(v as string)}
            >
              <SelectTrigger className="mt-1 h-10 w-full rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cols.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label
              htmlFor="f-shelf"
              className="text-base text-muted-foreground"
            >
              Shelf
            </Label>
            <Input
              id="f-shelf"
              value={shelf}
              onChange={(e) => setShelf(e.target.value)}
              autoComplete="off"
              className="mt-1 h-10 rounded-lg px-3"
            />
          </div>
        </div>

        <Label className="mt-2.5 text-base text-muted-foreground">
          Genre
        </Label>
        <Select value={genre} onValueChange={(v) => setGenre(v as string)}>
          <SelectTrigger className="mt-1 h-10 w-full rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GENRES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showSave ? (
          <Button onClick={save} className="mt-4 h-12 w-full rounded-[10px] text-base font-bold">
            {wish ? "Add to wishlist" : "Put it on the shelf"}
          </Button>
        ) : null}
      </div>

      <Drawer open={chooser} onOpenChange={setChooser}>
        <DrawerContent className="p-4">
          <DrawerHeader className="p-0 pb-2">
            <DrawerTitle className="font-serif text-lg">Add a cover</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setChooser(false);
                setTimeout(() => fileRef.current?.click(), 60);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary px-3.5 py-3.5 text-left text-base"
            >
              <PhotoIcon className="size-6 shrink-0 text-primary" />
              <span>
                Upload photo
                <small className="block text-base text-muted-foreground">
                  Your own picture for odd editions
                </small>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setChooser(false);
                setTimeout(() => setCamMode("ai"), 60);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary px-3.5 py-3.5 text-left text-base"
            >
              <SparklesIcon className="size-6 shrink-0 text-primary" />
              <span>
                Generate with AI
                <small className="block text-base text-muted-foreground">
                  Snap the real cover, let AI flatten it
                </small>
              </span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {camMode ? (
        <CameraOverlay
          open
          mode={camMode}
          onCancel={() => setCamMode(null)}
          onScan={() => {
            setCamMode(null);
            prefill(nextMatch(), "ISBN matched — details fetched from lookup");
          }}
          onShot={() => {
            setCamMode(null);
            setCoverData(
              makeCover(title.trim() || "Untitled", author.trim(), genre)
            );
            toast("AI cover generated (prototype)");
            buzz(20);
          }}
        />
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const data = await fileToCoverData(f);
          setCoverData(data);
          buzz(15);
        }}
      />
    </main>
  );
}
