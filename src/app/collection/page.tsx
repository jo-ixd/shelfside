import { Suspense } from "react";
import { ProtoCollectionView } from "@/components/proto-collection-view";

export const metadata = { title: "Collection · Shelfside" };

export default function CollectionPage() {
  return (
    <Suspense fallback={null}>
      <ProtoCollectionView />
    </Suspense>
  );
}
