import { CollectionsGrid } from "@/components/collections-grid";
import { PageHeader } from "@/components/page-header";

export default function Home() {
  return (
    <main>
      <PageHeader title="Shelfside" />
      <CollectionsGrid wish={false} />
    </main>
  );
}
