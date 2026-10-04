import { CollectionsGrid } from "@/components/collections-grid";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Wishlist · Shelfside" };

export default function WishlistPage() {
  return (
    <main>
      <PageHeader title="Wishlist" />
      <CollectionsGrid wish />
    </main>
  );
}
