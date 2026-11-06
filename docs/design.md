# Echo — design

**Intent.** Write what you learned, in your own words, once. A week later the
app asks you about it — as a definition, as a multiple-choice question, or as a
box to type into — until it is actually in your head. Same journal on PC and
phone.

## The governing rule

The note is canon. The AI asks questions about it and never rewrites,
summarises, or improves it. Every reveal shows the original words. Every
generated card has a *this is wrong* button that deletes it.

## Goals

- Frictionless capture on both devices, as many notes a day as you want (1–5 typical).
- AI-written questions with plausible distractors; the learner's own words are the answer.
- The ladder: reviews 2, 3, 7, 16 and 35 days after the note was written.
- Full debt shown, not hidden.
- A calendar you can walk backwards through.

## Non-goals (v1)

Sharing, multiple users, native apps, audio notes, images, gamification,
offline write queueing, backfilling a missed day.

## Anti-goals

AI paraphrasing the learner's understanding; hiding overdue cards; making the
learner feel productive instead of testing them.

## Stack

Next.js (App Router, TypeScript) on Vercel · Postgres (Supabase) accessed
server-side only · Tailwind · Zod for validating model output · installable
PWA. AI through an OpenAI-compatible client pointed at Groq, configured by
`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` so the provider can be swapped
without touching code. Keys live in server environment variables.

Access is a single passphrase (`APP_PASSCODE`) checked against a signed,
http-only cookie. There is one user, so there is no user table and no RLS;
the database is only ever reached from the server.

## Data

- **notes** — id, body (verbatim), note_date, created_at, status
  (`pending` / `ready` / `failed`), suggestion, suggestion_dismissed.
- **cards** — id, note_id, question, options (jsonb), correct_index, stage,
  due_on, status (`active` / `learned` / `rejected`).
- **reviews** — card_id, reviewed_at, mode (`mcq` / `typed`), picked_index,
  typed_answer, correct.

## The loop

1. **Capture.** Today's page, dated. "What did you learn today?" Add as many
   notes as you like. A skipped day has no note and stays empty in the calendar.
2. **Convert.** On save, the server asks the model for 1–4 atomic cards: a
   definition-style question, four options, one correct, distractors plausible
   and similar in length. Strict JSON, Zod-validated, one retry on malformed
   output, and a visible "couldn't generate — retry" state rather than silence.
3. **Schedule.** Absolute days from the note's date: 2, 3, 7, 16, 35. A pass
   moves to the next rung. A miss re-enters two days later one rung down.
   Passing the 35-day rung marks the card *learned*: gone from the queue, still
   in the journal, resurfaceable on demand.
4. **Review.** The due count is shown before starting, and the session contains
   all of it. Each card: question, four options, and a text box if you would
   rather type. Then the reveal — correct option highlighted, the original note
   verbatim beneath it. Typed answers are self-graded; the AI does not rule on
   the learner.
5. **Suggest, never impose.** If the model thinks a fact is off, a dismissible
   note appears beside it. Nothing changes unless the learner changes it.

## Screens

- **Today** — date, prompt, composer, today's notes with their cards.
- **Journal** — month calendar, days marked with note counts, day view,
  full-text search, every note with its cards and their rung.
- **Review** — the due queue, card by card.
- **Settings** — ladder values, model, export, delete.

## Decisions made during design

- Installable PWA rather than native, because the app is text and buttons and
  one codebase covers both devices.
- Cloud (Supabase + Vercel) rather than self-hosting, because "PC must be on"
  kills the phone habit.
- Provider-agnostic AI layer, defaulting to Groq's free tier.
- Typed answers are self-graded, consistent with "the learner decides".
- Editing a note offers to regenerate its cards and says plainly that this
  resets their schedule.
- No backfilling: capture is only ever "now".

## Open at build time

- The exact visual identity lives in the code, not this document.
- Offline queuing is deferred to v1.1; v1 needs a connection.
