import Link from "next/link";
import { Breadcrumb } from "@/components/workspace/breadcrumb";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 md:px-8">
      <Breadcrumb items={[{ label: "404" }]} />
      <header className="flex flex-col gap-2">
        <h1 className="text-[22px] font-medium leading-tight text-[var(--text-primary)]">
          Page not found
        </h1>
        <p className="text-[12px] text-[var(--text-muted)]">
          this page doesn’t exist on disk.{" "}
          <Link href="/" className="text-[var(--accent)] hover:underline">
            go home
          </Link>
        </p>
      </header>
    </div>
  );
}
