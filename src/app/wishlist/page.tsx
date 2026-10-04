import { CollectionsGrid } from "@/components/collections-grid";

export const metadata = { title: "Wishlist · Shelfside" };

export default function WishlistPage() {
  return (
    <main>
      <CollectionsGrid wish />
    </main>
  );
}
