import { Suspense } from "react";
import { NewCollectionView } from "@/components/new-collection-view";

export const metadata = { title: "New collection · Shelfside" };

export default function NewCollectionPage() {
  return (
    <Suspense fallback={null}>
      <NewCollectionView />
    </Suspense>
  );
}
