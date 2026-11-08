import { Suspense } from "react";
import { HomeView } from "@/components/home-view";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeView />
    </Suspense>
  );
}
