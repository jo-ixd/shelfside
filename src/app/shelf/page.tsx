import { Suspense } from "react";
import { ShelfView } from "@/components/shelf-view";

export const metadata = { title: "Shelf · Shelfside" };

export default function ShelfPage() {
  return (
    <Suspense fallback={null}>
      <ShelfView />
    </Suspense>
  );
}
