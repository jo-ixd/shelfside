import { PageHeader } from "@/components/page-header";

export function SettingsPlaceholder({
  title,
  sub,
  body,
  note,
}: {
  title: string;
  sub: string;
  body: string;
  note: string;
}) {
  return (
    <main>
      <PageHeader title={title} sub={sub} back="/" />
      <div className="px-4 pt-2.5">
        <div className="rounded-md border border-dashed border-border/70 px-5 py-8">
          <p className="font-serif text-base text-foreground">{body}</p>
          <p className="text-sm text-muted-foreground">{note}</p>
        </div>
      </div>
    </main>
  );
}
