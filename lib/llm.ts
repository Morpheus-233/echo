import { z } from "zod";
import type { GeneratedSet } from "./types";

export const CardSchema = z.object({
  question: z.string().trim().min(8, "question is too short"),
  options: z
    .array(z.string().trim().min(1, "option is empty"))
    .length(4, "exactly four options are required"),
  correctIndex: z.number().int().min(0).max(3),
});

export const GeneratedSetSchema = z
  .object({
    cards: z.array(CardSchema).min(1).max(4),
    suggestion: z.string().trim().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    for (const [i, card] of value.cards.entries()) {
      const distinct = new Set(card.options.map((o) => o.toLowerCase().replace(/\s+/g, " ").trim()));
      if (distinct.size !== card.options.length) {
        ctx.addIssue({
          code: "custom",
          message: `card ${i} has duplicate options`,
          path: ["cards", i, "options"],
        });
      }
    }
  });

export class LlmError extends Error {
  readonly code: "no-key" | "timeout" | "bad-json" | "http" | "empty";

  constructor(code: LlmError["code"], message: string) {
    super(message);
    this.name = "LlmError";
    this.code = code;
  }
}

/** Tolerant JSON extraction: models still wrap JSON in fences or prose. */
export function parseModelJson(raw: string): GeneratedSet {
  let text = raw.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LlmError("bad-json", "The model did not return valid JSON.");
  }

  const result = GeneratedSetSchema.safeParse(parsed);
  if (!result.success) {
    throw new LlmError("bad-json", `The model's JSON did not match the schema: ${result.error.issues[0]?.message ?? "unknown"}`);
  }

  return {
    cards: result.data.cards,
    suggestion: result.data.suggestion?.trim() || null,
  };
}

export const SYSTEM_PROMPT = `You are the examiner inside a personal learning journal called Echo.

You receive one note, written by one person, in their own words, on a given date.

Your only job: write recall questions about that note.

Hard rules:
1. The note is the truth. Never correct, rewrite, summarise or replace it. The learner is always shown their own sentence, never yours.
2. Each card tests exactly ONE fact from the note. A note with three separate facts gets three cards. Never more than four.
3. The question must be answerable from the note alone. Ask "what is X", "why does Y happen", "what happens when Z" — definition and explanation, not trivia about wording.
4. Exactly four options. The correct one must be entailed by the note. The other three must be plausible, in the same register, roughly the same length, and not obviously absurd. No "all of the above", no "none of the above", no jokes.
5. Every option is a self-contained statement, not a label or a fragment.
6. Do not reuse the note's exact phrasing in the correct option if that makes it recognisable by wording alone. Restate the same meaning.
7. If something in the note is factually wrong, say so in one gentle sentence in "suggestion". Otherwise null. You may suggest; you may not override.
8. Output JSON only, in exactly this shape:
{"cards":[{"question":"...","options":["...","...","...","..."],"correctIndex":0}],"suggestion":null}`;

function endpoint(): string {
  const base = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
  return `${base.replace(/\/+$/, "")}/chat/completions`;
}

function model(): string {
  return process.env.LLM_MODEL || "openai/gpt-oss-120b";
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}

async function callModel(noteBody: string, noteDate: string, repair: string | null): Promise<string> {
  const key = process.env.LLM_API_KEY;
  if (!key) {
    throw new LlmError("no-key", "No AI key is configured. Add LLM_API_KEY to the environment.");
  }

  const userMessage = [
    `NOTE (written ${noteDate}):`,
    '"""',
    noteBody,
    '"""',
    repair ? `\nYour previous reply was rejected: ${repair}\nReply again with JSON only, matching the shape exactly.` : "",
    "\nWrite the cards now.",
  ]
    .filter(Boolean)
    .join("\n");

  let response: Response;
  try {
    response = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model(),
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new LlmError("timeout", "The model took too long to answer.");
    }
    throw new LlmError("http", "Could not reach the model provider.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LlmError("http", `The model provider returned ${response.status}. ${detail.slice(0, 200)}`.trim());
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new LlmError("empty", "The model returned nothing.");
  return content;
}

/** Ask the model for cards about one note, with one repair attempt. */
export async function generateCards(noteBody: string, noteDate: string): Promise<GeneratedSet> {
  const body = noteBody.trim();
  if (!body) throw new LlmError("empty", "The note is empty.");

  let repair: string | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callModel(body, noteDate, repair);
    try {
      return parseModelJson(raw);
    } catch (error) {
      lastError = error;
      repair = error instanceof Error ? error.message : "invalid JSON";
    }
  }

  throw lastError instanceof LlmError
    ? lastError
    : new LlmError("bad-json", "The model could not produce valid questions.");
}
