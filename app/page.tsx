import Link from "next/link";
import { Composer } from "@/components/composer";
import { NoteCard } from "@/components/note-card";
import { requireAuth } from "@/lib/auth";
import { formatLong, todayISO } from "@/lib/date";
import { getStore, isDemoMode } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  await requireAuth();
  const today = todayISO();
  const store = getStore();
  const [notes, counts] = await Promise.all([store.notesForDate(today), store.counts(today)]);

  return (
    <div className="rise">
      <p className="label">{formatLong(today)}</p>
      <h1 className="mt-3 max-w-[16ch] font-display text-[2.5rem] leading-[1.04] tracking-[-0.025em] sm:text-[3rem]">
        What did you learn today?
      </h1>
      <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-ink-soft">
        One thing, or five. Write it the way you would explain it to a friend — the words are yours, and they stay yours.
      </p>

      {counts.due > 0 ? (
        <Link
          href="/review"
          className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-accent/25 bg-accent-soft/50 px-4 py-3 transition hover:border-accent/50"
        >
          <span className="text-sm text-ink">
            <strong className="font-semibold">{counts.due}</strong>{" "}
            {counts.due === 1 ? "question is" : "questions are"} waiting for you.
          </span>
          <span className="text-xs font-medium text-accent">Review →</span>
        </Link>
      ) : null}

      <div className="mt-7">
        <Composer />
      </div>

      {isDemoMode() ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Demo data — no database is connected yet, so this journal lives in memory and resets when the server restarts.
        </p>
      ) : null}

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="label">Today&apos;s notes</h2>
          <span className="text-[11px] text-ink-faint">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        {notes.length === 0 ? (
          <p className="mt-4 border-t border-rule/70 pt-4 text-sm text-ink-faint">
            Nothing yet. The first note is the hardest.
          </p>
        ) : (
          <div>
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-14 border-t border-rule/70 pt-4">
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Asked again on day 2, 3, 7, 16 and 35. A skipped day stays empty — nothing to catch up on.
        </p>
      </footer>
    </div>
  );
}
