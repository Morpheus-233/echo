import { logoutAction } from "@/app/login/actions";
import { ExportControls } from "@/components/export-controls";
import { authEnabled, requireAuth } from "@/lib/auth";
import { todayISO } from "@/lib/date";
import { formatExportJson, formatExportMarkdown } from "@/lib/export";
import { hasLlmKey } from "@/lib/llm";
import { LADDER_DAYS, MISS_DELAY_DAYS } from "@/lib/schedule";
import { getStore, isDemoMode } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAuth();
  const today = todayISO();
  const store = getStore();
  const [notes, counts] = await Promise.all([
    store.notesBetween("1970-01-01", today),
    store.counts(today),
  ]);

  const jsonExport = formatExportJson(notes, today);
  const markdownExport = formatExportMarkdown(notes, today);
  const totalCards = notes.reduce((sum, note) => sum + note.cards.length, 0);
  const activeCards = notes.reduce(
    (sum, note) => sum + note.cards.filter((card) => card.status === "active").length,
    0,
  );

  const demo = isDemoMode();
  const aiReady = hasLlmKey();
  const modelName = process.env.LLM_MODEL || "openai/gpt-oss-120b";
  const timezone = process.env.APP_TIMEZONE || "UTC";
  const protectedByPasscode = authEnabled();

  return (
    <div className="rise">
      <p className="label">Settings</p>
      <h1 className="mt-2 font-display text-[2.2rem] leading-tight tracking-[-0.02em]">
        Schedule &amp; archive
      </h1>
      <p className="mt-3 max-w-[50ch] text-sm leading-relaxed text-ink-soft">
        Your words stay yours. Every note and question can be exported at any time as plain Markdown or structured JSON.
      </p>

      {/* Ladder Configuration Summary */}
      <section className="mt-9 border-t border-rule/70 pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="label">The recall ladder</h2>
          <span className="text-[11px] text-ink-faint">Absolute days from note date</span>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {LADDER_DAYS.map((day, index) => (
            <div
              key={day}
              className="rounded-xl border border-rule bg-paper-raised px-3 py-3 text-center"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                Rung {index + 1}
              </p>
              <p className="mt-1 font-display text-lg text-ink">Day {day}</p>
            </div>
          ))}
        </div>

        <dl className="mt-5 space-y-2.5 text-xs leading-relaxed text-ink-soft">
          <div className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="font-medium text-ink">Anchored schedule:</dt>
            <dd>
              Reviews fall on day {LADDER_DAYS.join(", ")} measured from the day the note was written — never shifted relative to when you last answered.
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="font-medium text-ink">Late answers:</dt>
            <dd>
              Answering overdue questions never schedules in the past; the next review is at least tomorrow.
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="font-medium text-ink">When you miss:</dt>
            <dd>
              The question steps down one rung and returns in {MISS_DELAY_DAYS} days. No streak resets.
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="font-medium text-ink">Graduation:</dt>
            <dd>
              Passing day {LADDER_DAYS[LADDER_DAYS.length - 1]} marks a question <span className="text-moss font-medium">learned</span> and removes it from your review queue.
            </dd>
          </div>
        </dl>
      </section>

      {/* Export Section */}
      <section className="mt-9 border-t border-rule/70 pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="label">Export journal</h2>
          <span className="text-[11px] text-ink-faint">
            {notes.length} {notes.length === 1 ? "note" : "notes"} · {activeCards} active · {counts.learned} learned ({totalCards} total)
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Download your complete learning journal — verbatim notes, examiner suggestions, and every generated question with its current schedule rung.
        </p>

        <ExportControls
          json={jsonExport}
          markdown={markdownExport}
          filenameBase={`echo-journal-${today}`}
        />

        <details className="mt-4 rounded-xl border border-rule bg-paper-raised/60 p-3 text-xs text-ink-soft">
          <summary className="cursor-pointer select-none font-medium text-ink">
            Preview Markdown export
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-rule/70 bg-paper p-3 font-mono text-[11px] leading-relaxed text-ink">
            {markdownExport}
          </pre>
        </details>
      </section>

      {/* Environment & Runtime Summary */}
      <section className="mt-9 border-t border-rule/70 pt-6">
        <h2 className="label">Environment</h2>
        <div className="mt-4 divide-y divide-rule/60 rounded-xl border border-rule bg-paper-raised px-4">
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="text-ink-soft">Storage</span>
            <span className="font-medium text-ink">
              {demo ? "Demo mode (in-memory)" : "Postgres"}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="text-ink-soft">AI examiner</span>
            <span className="font-medium text-ink">
              {aiReady ? `Connected (${modelName})` : `No key set (${modelName})`}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="text-ink-soft">Timezone (`APP_TIMEZONE`)</span>
            <span className="font-medium text-ink">{timezone}</span>
          </div>
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="text-ink-soft">Passcode gate</span>
            <span className="font-medium text-ink">
              {protectedByPasscode ? "Enabled" : "Open (no passcode configured)"}
            </span>
          </div>
        </div>

        {protectedByPasscode ? (
          <form action={logoutAction} className="mt-5">
            <button
              type="submit"
              className="rounded-full border border-rule px-4 py-1.5 text-xs text-ink-soft transition hover:border-accent hover:text-accent"
            >
              Lock journal
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
