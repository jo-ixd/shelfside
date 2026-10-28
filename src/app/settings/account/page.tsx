import { AccountView } from "@/components/account-view";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Account · Shelfside" };

export default function AccountPage() {
  return (
    <main>
      <PageHeader title="Account" sub="Profile and reading stats" back="/" />
      <AccountView />
    </main>
  );
}
