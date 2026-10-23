import { BookcaseShelves } from "@/components/redesigns/bookcase-shelves";
import { CardCatalogue } from "@/components/redesigns/card-catalogue";
import { CatalogueIndex } from "@/components/redesigns/catalogue-index";
import { GalleryGrid } from "@/components/redesigns/gallery-grid";
import { ReadingRoom } from "@/components/redesigns/reading-room";

export const metadata = { title: "Redesigns · Shelfside" };

/* Five parallel redesign proposals for the home Collections section.
   Each is a self-contained client component in src/components/redesigns/.
   This page is deliberately quiet: the proposals carry the design. */

export default function RedesignsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
      <header className="pt-[18px] pb-6">
        <h1 className="font-serif text-2xl leading-tight">
          Collections, five ways
        </h1>
        <p className="mt-1 max-w-[70ch] text-base text-muted-foreground">
          Redesign proposals for the home screen — each answers the same
          problems differently: the long scroll, the too-small status tags,
          unclear interactions, and what a shelf should feel like here.
        </p>
      </header>

      <div className="space-y-14">
        <section aria-labelledby="var-1">
          <div className="mb-4 border-b border-border pb-3">
            <h2 id="var-1" className="font-serif text-xl">
              Option 1 — Bookcase
            </h2>
            <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
              Collections as real bookcases: wooden boards, books standing as
              spines at their natural widths. The whole library stacks into a
              fraction of the old scroll, and it finally looks like a shelf.
              Hover or focus a spine to pull it out and see its details.
            </p>
          </div>
          <BookcaseShelves />
        </section>

        <section aria-labelledby="var-2">
          <div className="mb-4 border-b border-border pb-3">
            <h2 id="var-2" className="font-serif text-xl">
              Option 2 — Ledger
            </h2>
            <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
              A librarian's register: one dense, typographic list of every
              book, filtered by collection through large sticky tabs. The
              entire library fits in about one screen of scroll; status gets
              a real badge column instead of a micro-pill.
            </p>
          </div>
          <CatalogueIndex />
        </section>

        <section aria-labelledby="var-3">
          <div className="mb-4 border-b border-border pb-3">
            <h2 id="var-3" className="font-serif text-xl">
              Option 3 — Wall
            </h2>
            <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
              A gallery wall of covers in a responsive grid, with big
              collection pills up top for instant filtering. Equal-height
              meta blocks fix the ragged baselines; tags are full-size and
              hover or focus reveals a clear open affordance.
            </p>
          </div>
          <GalleryGrid />
        </section>

        <section aria-labelledby="var-4">
          <div className="mb-4 border-b border-border pb-3">
            <h2 id="var-4" className="font-serif text-xl">
              Option 4 — Card catalogue
            </h2>
            <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
              The old library card catalogue: each collection is a drawer you
              pull open in place, revealing index cards with a rubber-stamp
              status. Closed, the whole page is three drawer fronts tall —
              the shortest scroll of the five.
            </p>
          </div>
          <CardCatalogue />
        </section>

        <section aria-labelledby="var-5">
          <div className="mb-4 border-b border-border pb-3">
            <h2 id="var-5" className="font-serif text-xl">
              Option 5 — Reading room
            </h2>
            <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
              A master–detail split: collections sit in a left rail with tiny
              spine-stack previews, the picked collection fills the right with
              large covers. Switching collections is instant — no scrolling to
              reach anything.
            </p>
          </div>
          <ReadingRoom />
        </section>
      </div>
    </main>
  );
}
