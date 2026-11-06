import { redirect } from "next/navigation";
import { authEnabled, isAuthed } from "@/lib/auth";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!authEnabled()) redirect("/");
  if (await isAuthed()) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-5 py-16">
      <p className="label">Echo</p>
      <h1 className="mt-3 font-display text-4xl leading-tight tracking-[-0.02em]">
        Say it once. It comes back.
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        This journal is yours alone. One passphrase stands in front of it.
      </p>

      <form action={loginAction} className="mt-8 space-y-3">
        <label className="label block" htmlFor="passcode">
          Passphrase
        </label>
        <input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-lg border border-rule bg-paper-raised px-4 py-3 text-base outline-none focus:border-accent"
          placeholder="••••••••"
        />
        {error ? <p className="text-sm text-accent">That is not it. Try again.</p> : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper transition hover:bg-accent"
        >
          Open the journal
        </button>
      </form>
    </main>
  );
}
