import { SettingsPlaceholder } from "@/components/settings-placeholder";

export const metadata = { title: "Notifications · Shelfside" };

export default function NotificationsPage() {
  return (
    <SettingsPlaceholder
      title="Notifications"
      sub="Notices about your library"
      body="Notifications aren't wired up in the prototype yet."
      note="They'll appear here once the app supports them."
    />
  );
}
