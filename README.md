# Echo

A journal that asks you back.

Write what you learned today, in your own words. Echo turns each note into
questions, then brings them back on **day 2, 3, 7, 16 and 35** — multiple
choice, or a box to answer in your own words. Your note is always the answer,
verbatim. The AI writes the questions; it never rewrites what you wrote.

Same journal on your PC and your phone, through one database.

## What it does

- **Today** — a dated page, one prompt, as many notes as you want.
- **Journal** — a month calendar; tap a day to see what you learned on it.
  A skipped day stays empty. Nothing is backdated.
- **Review** — everything due, all of it, shown up front. Pick an option or
  type your answer; then your original note is revealed underneath.
- **Ladder** — pass, and the gap grows. Miss, and the card returns in two days
  one rung lower. Pass the 35-day rung and the card is *learned*.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

With no `DATABASE_URL`, Echo runs in **demo mode**: a few seeded notes in
memory, everything works, data resets on restart.

With no `LLM_API_KEY`, notes save fine but their questions can't be written —
the note shows the reason and a retry button.

## Database

Any Postgres works. Supabase's free tier is the easy path:

1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`.
3. Copy the connection string (Project Settings → Database → Connection string → URI)
   into `DATABASE_URL`.
4. If the host is a pooler, keep the `?pgbouncer=true` style params — the app
   already disables prepared statements.

## AI

Echo talks to any OpenAI-compatible endpoint. The defaults are Groq's free
tier — a key with no credit card, roughly 1,000 requests a day, and a services
agreement that does not train on your inputs.

```
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
LLM_API_KEY=gsk_...
```

Swapping to Gemini or OpenRouter is three environment variables, not a code
change. The key is only ever read on the server.

## Deploy

Vercel, free tier:

1. Push the repo, import it in Vercel.
2. Add the same environment variables, plus a real `APP_PASSCODE`.
3. Deploy. Open it on your phone and "Add to Home Screen" — it runs fullscreen
   with an icon, no app store involved.

## Tests

```bash
npm test
```

The ladder lives in `lib/schedule.ts` and is pure, so it is tested without a
database or a network: month boundaries, late reviews, lapses, and the
learned state.

## Layout

```
app/            pages, server actions, manifest
components/     composer, note card, calendar, review session
lib/schedule.ts the ladder — pure functions
lib/llm.ts      prompt, provider call, JSON validation
lib/store/      one interface, Postgres and in-memory implementations
supabase/       schema
docs/           design decisions
```
