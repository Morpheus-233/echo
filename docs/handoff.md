# Echo — handoff

Everything a new engineer (or agent) needs to pick this up without re-deriving it.

## What it is

A single-user learning journal that asks you back. You write what you learned
today, in your own words. The AI turns that note into recall questions. Echo
asks them again on **day 2, 3, 7, 16 and 35** after the note was written.
Works on PC and phone against one shared database.

**The note is canon.** The AI writes questions and multiple-choice options; it
never rewrites, summarises or replaces the user's words. The reveal always
shows the note verbatim.

## Status

| Area | State |
|---|---|
| Build (`npm run build`) | Passing |
| TypeScript | Clean |
| Lint (`npm run lint`) | Clean |
| Unit tests (`npm test`) | 18 passing |
| Today / Journal / Review pages | Verified in Chrome, desktop + 360/390px |
| Add note → AI questions → cards | Verified end to end against a mock OpenAI-compatible server |
| Passcode login | Verified (correct passcode, wrong passcode, cookie gate, redirect) |
| Real Groq API call | **Not yet tested** — no key |
| Real Postgres / Supabase | **Not yet tested** — no database |
| Vercel deploy | **Not yet done** |
| PWA install on a phone | **Not yet done** |

The code is committed except for the most recent small UI grouping change,
which builds but has not been re-checked in a browser (see "Last changes").

## Run it

```bash
npm install
# copy .env.example to .env.local and fill it in (optional for demo mode)
npm run dev      # http://localhost:3000
npm test
npm run build
npm run lint
```

With no `DATABASE_URL` the app runs in **demo mode**: seeded notes in memory,
everything works, nothing persists across a server restart.
With no `LLM_API_KEY` notes still save, but the note shows why the questions
couldn't be written and offers "Try again".

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. Empty → demo mode. |
| `LLM_API_KEY` | Provider key. Empty → notes save, questions fail with a visible reason. |
| `LLM_BASE_URL` | OpenAI-compatible base. Default `https://api.groq.com/openai/v1`. |
| `LLM_MODEL` | Default `openai/gpt-oss-120b`. |
| `APP_PASSCODE` | If set, a passphrase gate is enabled. Empty → open (fine locally). |
| `APP_TIMEZONE` | IANA zone deciding what "today" is. Default UTC. **Must be set on deploy.** |

Groq's free tier is the intended default: no credit card, ~1,000 requests/day.

## Stack and layout

Next.js 16.4.5 (App Router, Turbopack) · React 19.3 · TypeScript · Tailwind 4
· Postgres via `postgres` · Zod · Vitest. Deployed target: Vercel free tier,
Supabase free tier for Postgres. Installable PWA (manifest + icons).

```
app/            pages (today, journal, login), server actions, manifest
components/     composer, note card, calendar, review session, header, nav
lib/schedule.ts the ladder — pure functions, fully tested
lib/llm.ts      prompt, provider call, tolerant JSON parsing, Zod validation
lib/store/      one Store interface + postgres and in-memory implementations
lib/auth.ts     passcode + HMAC-signed http-only cookie
supabase/       schema migration
docs/design.md  original design decisions
docs/handoff.md this file
```

## Decisions that must not be undone

- **The note is never rewritten by AI.** Cards store only `question`,
  `options`, `correctIndex`. The note body is shown on reveal.
- **Ladder is absolute, not relative.** Due dates are measured from the note's
  own date (`note_date + 2/3/7/16/35`), never from the last review.
- **Late answers never schedule in the past.** After a correct answer the next
  due date is `max(anchored rung, tomorrow)`.
- **A miss drops one rung and returns in 2 days.** No streak resets, no penalty
  ladder.
- **Passing the 35-day rung marks the card `learned`** and removes it from the
  queue.
- **No session cap.** Every due card is shown; each answer is saved as it is
  given.
- **No backfilling.** A skipped day stays empty. The calendar has no way to add
  a note to a past date.
- **Multiple notes per day** (typically 1–5), each with its own cards.
- **Typed answers are self-graded** ("I got it" / "I missed it"). Only
  multiple-choice is auto-graded. The UI says so.
- **Single user.** One passphrase, no user table, no RLS. The database is only
  ever reached from the server; the key never reaches the browser.
- **AI suggestions are advisory.** If the model thinks a fact is wrong it
  writes one sentence into `notes.suggestion`; the UI shows it as a
  dismissible "The examiner wonders" note. It is never applied automatically.
- **Editing a note rebuilds its cards and resets their schedule** (confirmed by
  a browser dialog first).

## Data model (`supabase/migrations/0001_init.sql`)

- `notes(id, body, note_date, created_at, status, suggestion,
  suggestion_dismissed, error)` — `status` is `pending | ready | failed`.
- `cards(id, note_id, question, options jsonb, correct_index, stage, due_on,
  status, created_at)` — `status` is `active | learned | rejected`.
  `stage` is the index into the ladder (0..4).
- `reviews(id, card_id, reviewed_at, mode, picked_index, typed_answer, correct)`
  — an audit trail, not read by the UI yet.

The migration is idempotent (`create table if not exists`).

## What to do next, in order

1. **Real AI.** Put a Groq key in `LLM_API_KEY`, run the app, add three or four
   notes, and judge the question quality. Watch for: valid JSON on the first
   try, four plausible options, no duplicate options, a suggestion only when a
   fact is actually wrong. `lib/llm.ts` already retries once with the failure
   reason appended to the prompt.
2. **Real database.** Create a Supabase project, run
   `supabase/migrations/0001_init.sql` in the SQL editor, copy the connection
   string into `DATABASE_URL`. Keep the pooler parameters; the client already
   sets `prepare: false`. Verify: add note, restart the server, data is still
   there; review a card, `stage`/`due_on`/`status` move in the table; editing a
   note deletes and recreates its cards.
3. **Deploy.** Push to GitHub, import in Vercel, set `DATABASE_URL`,
   `LLM_API_KEY`, `APP_PASSCODE`, `APP_TIMEZONE`. Open on a phone and "Add to
   Home Screen".
4. **Then the optional work**, roughly in value order:
   - real offline support (the service worker is deliberately a no-op today;
     only a manifest + icons make it installable),
   - a small settings page for the ladder (currently a constant in
     `lib/schedule.ts`),
   - an export (JSON or Markdown) so the journal is never trapped,
   - a "notes from this week" recap on Today,
   - showing `reviews` history on a note (data is already recorded).

## Gotchas

- `cacheComponents` is **off** in `next.config.ts` on purpose: it conflicts
  with `export const dynamic = "force-dynamic"`, which every page relies on.
- `lib/store/postgres.ts` must use `CARD_COLUMNS_QUALIFIED` (`c.` prefix) in
  joins — bare `id` / `created_at` are ambiguous against `notes`.
- Card options are written with `sql.json(...)` into the `jsonb` column.
- `ReviewSession` snapshots the server's card list into a `queue` state. Server
  actions refresh the RSC payload after every answer, which would otherwise
  shrink the list mid-session.
- The review page always mounts `ReviewSession`, even when nothing is due; the
  empty state lives inside the component so a refresh can't replace the summary
  with the server's empty page.
- The React keyboard listener reaches `record()` through a ref-updated-in-effect
  because the lint rule forbids writing a ref during render.
- The "N" bubble bottom-left is Next's dev overlay, not the app.
- Windows: the README's `cp` is `Copy-Item` in PowerShell.

## Last changes (uncommitted at handoff time)

- `components/note-card.tsx`: cards that share a rung and date are now grouped
  into one chip showing `×N` instead of repeating "day 2 · 8 November" once per
  card. Builds and lints; **not re-checked in a browser**.
- `.env.local` used for the mock-provider test was removed. No credentials are
  stored in the folder.

## Suggested first prompt for the next agent

> Read `docs/handoff.md` and `docs/design.md`, then run `npm install`,
> `npm test`, `npm run build`. Do not change the data model or the ladder.
> Start by verifying the two unverified paths — a real Groq call and a real
> Postgres connection — using the credentials I will provide. Report back with
> what broke before changing any code.
