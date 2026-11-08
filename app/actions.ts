"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { todayISO } from "@/lib/date";
import { generateCards, LlmError } from "@/lib/llm";
import { applyReview } from "@/lib/schedule";
import { getStore } from "@/lib/store";
import type { ReviewInput } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type AddNoteResult = { ok: true; noteId: string } | { ok: false; error: string };

const MAX_NOTE_LENGTH = 8000;

function describe(error: unknown): string {
  if (error instanceof LlmError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath("/review");
  revalidatePath("/settings");
}

async function convert(noteId: string, body: string, noteDate: string): Promise<ActionResult> {
  const store = getStore();
  try {
    const generated = await generateCards(body, noteDate);
    await store.addCards(noteId, noteDate, generated.cards);
    await store.setNoteStatus(noteId, "ready", generated.suggestion, null);
    return { ok: true };
  } catch (error) {
    await store.setNoteStatus(noteId, "failed", null, describe(error));
    return { ok: false, error: describe(error) };
  }
}

export async function addNoteAction(body: string): Promise<AddNoteResult> {
  await requireAuth();

  const text = (body ?? "").trim();
  if (!text) return { ok: false, error: "Write something first." };
  if (text.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `That is longer than ${MAX_NOTE_LENGTH} characters. Split it into two notes.` };
  }

  const noteDate = todayISO();
  const store = getStore();
  const note = await store.createNote(text, noteDate);

  // Show the note immediately, then let the request finish converting it.
  revalidatePath("/");
  await convert(note.id, text, noteDate);
  revalidateAll();

  return { ok: true, noteId: note.id };
}

export async function retryConversionAction(noteId: string): Promise<ActionResult> {
  await requireAuth();
  const store = getStore();
  const note = await store.getNote(noteId);
  if (!note) return { ok: false, error: "That note no longer exists." };

  await store.clearCards(noteId);
  await store.setNoteStatus(noteId, "pending", null, null);
  const result = await convert(noteId, note.body, note.noteDate);
  revalidateAll();
  return result;
}

export async function saveNoteAction(noteId: string, body: string): Promise<ActionResult> {
  await requireAuth();
  const text = (body ?? "").trim();
  if (!text) return { ok: false, error: "A note cannot be empty." };
  if (text.length > MAX_NOTE_LENGTH) return { ok: false, error: "That note is too long." };

  const store = getStore();
  const note = await store.getNote(noteId);
  if (!note) return { ok: false, error: "That note no longer exists." };

  await store.updateNote(noteId, text);
  // The questions were built from the old words, so they no longer stand.
  await store.clearCards(noteId);
  await store.setNoteStatus(noteId, "pending", null, null);
  const result = await convert(noteId, text, note.noteDate);
  revalidateAll();
  return result;
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult> {
  await requireAuth();
  const store = getStore();
  await store.deleteNote(noteId);
  revalidateAll();
  return { ok: true };
}

export async function dismissSuggestionAction(noteId: string): Promise<ActionResult> {
  await requireAuth();
  const store = getStore();
  await store.dismissSuggestion(noteId);
  revalidateAll();
  return { ok: true };
}

export async function rejectCardAction(cardId: string): Promise<ActionResult> {
  await requireAuth();
  const store = getStore();
  await store.rejectCard(cardId);
  revalidateAll();
  return { ok: true };
}

export async function reviewCardAction(
  cardId: string,
  input: { mode: "mcq" | "typed"; pickedIndex: number | null; typedAnswer: string | null; correct: boolean },
): Promise<ActionResult> {
  await requireAuth();
  const store = getStore();
  const card = await store.getCard(cardId);
  if (!card) return { ok: false, error: "That question no longer exists." };

  const today = todayISO();
  const next = applyReview({ stage: card.stage, noteDate: card.noteDate }, input.correct, today);
  const review: ReviewInput = {
    mode: input.mode,
    pickedIndex: input.pickedIndex,
    typedAnswer: input.typedAnswer,
    correct: input.correct,
  };

  await store.recordReview(cardId, review, next);
  revalidateAll();
  return { ok: true };
}
