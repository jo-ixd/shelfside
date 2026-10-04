import { Suspense } from "react";
import { AddView } from "@/components/add-view";

export const metadata = { title: "Add book · Shelfside" };

export default function AddPage() {
  return (
    <Suspense fallback={null}>
      <AddView />
    </Suspense>
  );
}
