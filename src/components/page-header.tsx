"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export function PageHeader({
  title,
  sub,
  back,
}: {
  title: string;
  sub?: string;
  back?: string;
}) {
  const router = useRouter();
  return (
    <div className="px-4 pt-[18px] pb-1">
      <div className="flex items-center gap-2.5">
        {back ? (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push(back)}
            className="text-primary"
          >
            <ArrowLeftIcon className="size-6" />
          </button>
        ) : null}
        <div>
          <h1 className="font-serif text-2xl leading-tight">{title}</h1>
          {sub ? (
            <p className="mt-0.5 text-base text-muted-foreground">{sub}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
