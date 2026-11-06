import Link from "next/link";
import { todayISO } from "@/lib/date";
import { getStore } from "@/lib/store";
import { NavLinks } from "./nav-links";

export async function SiteHeader() {
  const { due } = await getStore().counts(todayISO());

  return (
    <header className="sticky top-0 z-20 border-b border-rule/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[720px] items-center justify-between px-5 py-3">
        <Link href="/" className="font-display text-[1.6rem] leading-none tracking-[-0.03em]">
          echo<span className="text-accent">.</span>
        </Link>
        <NavLinks due={due} />
      </div>
    </header>
  );
}
