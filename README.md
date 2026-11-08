# Echo

**A personal learning journal that asks you back.**

Write what you learned today, in your own words. Echo turns each note into recall questions and brings them back on **day 2, 3, 7, 16, and 35** — as multiple choice or a free-response box.

**The note is canon.** The AI writes recall questions and distractors; it never rewrites, summarises, or replaces what you wrote. Every reveal shows your original words verbatim.

---

## Core Invariants

- **Your words stay untouched** — Cards store only `question`, `options`, and `correctIndex`. The reveal always displays your verbatim note.
- **Absolute recall ladder (`2, 3, 7, 16, 35`)** — Due dates are anchored to the day the note was written (`note_date + rung`), never shifted relative to the last review. Late reviews never schedule in the past (`max(anchored rung, tomorrow)`).
- **Gentle lapses** — Missing a question drops it one rung and brings it back in 2 days. Passing the 35-day rung marks the question `learned`.
- **Self-graded typed recall** — Multiple-choice answers are graded automatically; typed answers are self-graded (*"I got it"* / *"I missed it"*) after revealing your note.
- **No backfilling** — A skipped day stays empty on the calendar. Capture is only ever *today*.
- **Advisory suggestions** — If the AI examiner spots a factual error in your note, it adds a dismissible one-sentence note (*"The examiner wonders"*). It never edits your text.

---

## Screens

| Route | Purpose |
|---|---|
| `/` (**Today**) | Dated prompt, note composer, due-queue banner, and today's notes with grouped schedule chips. |
| `/journal` (**Journal**) | Month calendar with daily note counts, day inspector, and full-text search across all notes. |
| `/review` (**Review**) | Full due queue with multiple-choice or typed recall, keyboard shortcuts (`1–4`, `Enter`, `G`/`M`), and verbatim note reveal. |
| `/settings` (**Settings**) | Recall ladder summary, one-click **Markdown (`.md`)** and **JSON (`.json`)** journal exports, and runtime environment status. |

---

## Quickstart (Zero-Config Demo Mode)

Echo runs out of the box with **zero credentials**:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000):

- **No `DATABASE_URL`** → Runs in **in-memory demo mode** with seeded notes and due review cards so you can explore Today, Journal, Review, and Settings immediately.
- **No `LLM_API_KEY`** → New notes still save cleanly; question generation reports why it couldn't run and provides a one-click **Try again** button.

To configure real persistence and AI question generation, copy `.env.example` to `.env.local`:

```bash
# macOS / Linux
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | *(empty → demo mode)* | Postgres connection URI (e.g. Supabase pooler or direct connection). |
| `LLM_API_KEY` | *(empty)* | API key for the OpenAI-compatible provider (Groq free tier recommended). |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` | OpenAI-compatible `/chat/completions` base URL (Groq, OpenRouter, Gemini, etc.). |
| `LLM_MODEL` | `openai/gpt-oss-120b` | Model identifier used to generate recall questions. |
| `APP_PASSCODE` | *(empty → open)* | Single-user passphrase gate backed by an HMAC-signed `httpOnly` cookie. |
| `APP_TIMEZONE` | `UTC` | IANA timezone (e.g. `Asia/Kolkata`, `America/New_York`) deciding when "today" rolls over. |

---

## Architecture & Layout

Built with **Next.js 16 (App Router, Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Postgres (`postgres`)**, **Zod**, and **Vitest**. Installable on mobile & desktop as a **PWA**.

```text
app/                  App Router pages (today, journal, review, settings, login), server actions, PWA manifest
components/           Composer, note card (grouped schedule chips), calendar, review session, export controls, nav
lib/
  schedule.ts         Pure spaced-repetition ladder (days 2, 3, 7, 16, 35)
  llm.ts              Examiner system prompt, OpenAI-compatible fetch, tolerant JSON extraction & Zod validation
  export.ts           Deterministic JSON & Markdown journal exporters
  auth.ts             Single-user passcode verification & HMAC session cookie
  date.ts             Timezone-aware YYYY-MM-DD calendar arithmetic
  store/              Unified Store interface with Postgres (lib/store/postgres.ts) & in-memory (lib/store/memory.ts) backends
supabase/migrations/  Idempotent Postgres schema (notes, cards, reviews)
docs/                 Design specification (docs/design.md) & engineering handoff (docs/handoff.md)
```

---

## Database Setup (Supabase / Postgres)

1. Create a free project on [Supabase](https://supabase.com) (or any Postgres instance).
2. Run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the SQL Editor (safe to run multiple times).
3. Set `DATABASE_URL` in `.env.local` (Transaction pooler URIs with `?pgbouncer=true` work out of the box; prepared statements are disabled automatically).

---

## Testing & Verification

```bash
npm test          # Vitest unit suite (schedule ladder, LLM JSON parser, journal export)
npm run lint      # ESLint check
npm run build     # Production Next.js build & TypeScript check
```
