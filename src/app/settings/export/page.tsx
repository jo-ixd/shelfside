import { SettingsPlaceholder } from "@/components/settings-placeholder";

export const metadata = { title: "Export data · Shelfside" };

export default function ExportPage() {
  return (
    <SettingsPlaceholder
      title="Export data"
      sub="Download a copy of your library"
      body="Export isn't wired up in the prototype yet."
      note="Your library lives only in this browser for now."
    />
  );
}
