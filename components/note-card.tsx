"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteNoteAction,
  dismissSuggestionAction,
  retryConversionAction,
  saveNoteAction,
} from "@/app/actions";
import { formatShort } from "@/lib/date";
import { stageLabel } from "@/lib/schedule";
import type { NoteWithCards } from "@/lib/types";

export function NoteCard({ note }: { note: NoteWithCards }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [error, setError] = useState<string | null>(null);

  const active = note.cards.filter((card) => card.status === "active");
  const learned = note.cards.filter((card) => card.status === "learned");

  // Cards from one note usually share a rung and a date; group them so two
  // identical chips don't appear side by side.
  const upcoming = new Map<string, { stage: number; dueOn: string; count: number }>();
  for (const card of active) {
    const key = `${card.stage}|${card.dueOn}`;
    const entry = upcoming.get(key);
    if (entry) entry.count += 1;
    else upcoming.set(key, { stage: card.stage, dueOn: card.dueOn, count: 1 });
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else router.refresh();
    });
  }

  function save() {
    if (!window.confirm("Changing the words rebuilds this note's questions and resets their schedule. Continue?")) {
      return;
    }
    startTransition(async () => {
      const result = await saveNoteAction(note.id, draft);
      if (!result.ok) setError(result.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <article className="border-b border-rule/70 py-6 first:pt-2 last:border-b-0">
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            className="note-body w-full resize-y rounded-lg border border-rule bg-paper-raised p-3 outline-none focus:border-accent"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-paper hover:bg-accent disabled:opacity-40"
            >
              {pending ? "Rebuilding…" : "Save words"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(note.body);
                setEditing(false);
              }}
              className="rounded-full px-3 py-1.5 text-xs text-ink-soft hover:bg-paper-deep"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="note-body">{note.body}</p>
      )}

      {note.status === "pending" ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
          <span className="pending-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          Writing the questions…
        </p>
      ) : null}

      {note.status === "failed" ? (
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 px-3 py-2.5">
          <p className="text-xs text-ink-soft">
            Questions could not be written. {note.error ?? ""}
          </p>
          <button
            type="button"
            onClick={() => run(() => retryConversionAction(note.id))}
            disabled={pending}
            className="mt-2 rounded-full border border-accent/40 px-3 py-1 text-xs font-medium text-accent hover:bg-accent hover:text-paper disabled:opacity-40"
          >
            {pending ? "Trying…" : "Try again"}
          </button>
        </div>
      ) : null}

      {note.status === "ready" && note.cards.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {[...upcoming.entries()].map(([key, group]) => (
            <span
              key={key}
              className="rounded-full border border-rule bg-paper-raised px-2.5 py-1 text-[11px] text-ink-soft"
            >
              {stageLabel(group.stage)} · {formatShort(group.dueOn)}
              {group.count > 1 ? ` ×${group.count}` : ""}
            </span>
          ))}
          {learned.length > 0 ? (
            <span className="rounded-full border border-moss/25 bg-moss-soft px-2.5 py-1 text-[11px] text-moss">
              {learned.length} learned
            </span>
          ) : null}
        </div>
      ) : null}

      {note.suggestion && !note.suggestionDismissed ? (
        <div className="mt-3 border-l-2 border-accent/50 pl-3">
          <p className="label">The examiner wonders</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{note.suggestion}</p>
          <p className="mt-1 text-xs text-ink-faint">Your note is untouched. Keep it as it is, or change it yourself.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(note.body);
                setEditing(true);
              }}
              className="rounded-full border border-rule px-3 py-1 text-[11px] text-ink-soft hover:bg-paper-deep"
            >
              Edit my words
            </button>
            <button
              type="button"
              onClick={() => run(() => dismissSuggestionAction(note.id))}
              className="rounded-full px-2 py-1 text-[11px] text-ink-faint hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-accent">{error}</p> : null}

      {!editing ? (
        <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-faint">
          <button type="button" onClick={() => setEditing(true)} className="hover:text-ink">
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this note and its questions?")) {
                run(() => deleteNoteAction(note.id));
              }
            }}
            className="hover:text-accent"
          >
            Delete
          </button>
          <span className="ml-auto">
            {note.cards.length} {note.cards.length === 1 ? "question" : "questions"}
          </span>
        </div>
      ) : null}
    </article>
  );
}
