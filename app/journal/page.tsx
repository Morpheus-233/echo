import Link from "next/link";
import { Calendar } from "@/components/calendar";
import { NoteCard } from "@/components/note-card";
import { requireAuth } from "@/lib/auth";
import { daysInMonth, formatLong, formatMonth, monthKey, shiftMonth, todayISO } from "@/lib/date";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

function validMonth(value: string | undefined, fallback: string): string {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : fallback;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; d?: string; q?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const today = todayISO();
  const query = (params.q ?? "").trim();
  const store = getStore();

  if (query) {
    const results = await store.searchNotes(query);
    return (
      <div className="rise">
        <p className="label">Search</p>
        <h1 className="mt-3 font-display text-[2.2rem] leading-tight tracking-[-0.02em]">
          &ldquo;{query}&rdquo;
        </h1>
        <form action="/journal" method="get" className="mt-5 flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search your notes"
            className="w-full rounded-lg border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm text-paper hover:bg-accent">
            Search
          </button>
        </form>
        <p className="mt-3 text-xs text-ink-faint">
          {results.length} {results.length === 1 ? "note" : "notes"} matched.
        </p>
        <div className="mt-4">
          {results.map((note) => (
            <div key={note.id}>
              <p className="label mt-5">{formatLong(note.noteDate)}</p>
              <NoteCard note={note} />
            </div>
          ))}
        </div>
        <Link href={`/journal?m=${monthKey(today)}`} className="mt-6 inline-block text-sm text-accent">
          ← Back to the calendar
        </Link>
      </div>
    );
  }

  const month = validMonth(params.m, monthKey(today));
  const [year, monthNumber] = month.split("-").map(Number);
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth(year, monthNumber)).padStart(2, "0")}`;

  const counts = await store.noteCounts(from, to);

  const requested = params.d && /^\d{4}-\d{2}-\d{2}$/.test(params.d) ? params.d : null;
  const selected =
    requested && requested.startsWith(month) ? requested : month === monthKey(today) ? today : null;
  const notes = selected ? await store.notesForDate(selected) : [];

  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const totalInMonth = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Journal</p>
          <h1 className="mt-2 font-display text-[2.2rem] leading-none tracking-[-0.02em]">
            {formatMonth(`${month}-01`)}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/journal?m=${previous}`}
            aria-label="Previous month"
            className="rounded-full border border-rule px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-deep"
          >
            ←
          </Link>
          <Link
            href={`/journal?m=${next}`}
            aria-label="Next month"
            className="rounded-full border border-rule px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-deep"
          >
            →
          </Link>
        </div>
      </div>

      <form action="/journal" method="get" className="mt-5 flex gap-2">
        <input type="hidden" name="m" value={month} />
        <input
          name="q"
          placeholder="Search every note…"
          className="w-full rounded-lg border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft hover:bg-paper-deep"
        >
          Find
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-rule bg-paper-raised/60 p-3 sm:p-4">
        <Calendar month={month} counts={counts} selected={selected} today={today} />
      </div>

      <p className="mt-2 text-[11px] text-ink-faint">
        {totalInMonth} {totalInMonth === 1 ? "note" : "notes"} this month
      </p>

      <section className="mt-8">
        {selected ? (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl tracking-[-0.01em]">{formatLong(selected)}</h2>
              <span className="text-[11px] text-ink-faint">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
            </div>
            {notes.length === 0 ? (
              <p className="mt-4 border-t border-rule/70 pt-4 text-sm text-ink-faint">
                Nothing was written on this day. That day is empty, not owed.
              </p>
            ) : (
              <div>
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="border-t border-rule/70 pt-4 text-sm text-ink-faint">
            Pick a day to see what you learned on it.
          </p>
        )}
      </section>
    </div>
  );
}
