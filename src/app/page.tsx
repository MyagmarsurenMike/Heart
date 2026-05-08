import { Breadcrumb } from "@/components/workspace/breadcrumb";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 md:px-8">
      <Breadcrumb items={[{ label: "today" }]} />
      <header className="flex flex-col gap-2">
        <h1 className="text-[22px] font-medium leading-tight text-[var(--text-primary)]">
          Today
        </h1>
        <p className="text-[12px] text-[var(--text-muted)]">
          phase 0 — pick a page from the sidebar to view it.
        </p>
      </header>
    </div>
  );
}
