"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addNoteAction } from "@/app/actions";

export function Composer() {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = body.trim().length > 0 && !pending;

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await addNoteAction(text);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
      areaRef.current?.focus();
    });
  }

  return (
    <div className="rounded-2xl border border-rule bg-paper-raised p-4 shadow-[0_1px_0_rgba(27,26,23,0.04),0_12px_30px_-24px_rgba(27,26,23,0.4)] sm:p-5">
      <label className="label block" htmlFor="note-body">
        Today&apos;s note
      </label>
      <textarea
        id="note-body"
        ref={areaRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        rows={4}
        placeholder="A memory leak is memory that was allocated and never freed…"
        className="mt-2 w-full resize-y bg-transparent font-display text-[1.15rem] leading-relaxed tracking-[-0.01em] outline-none placeholder:text-ink-faint/70"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-rule/70 pt-3">
        <p className="text-xs leading-relaxed text-ink-faint">
          {pending ? (
            <span className="text-accent">Asking the examiner…</span>
          ) : (
            <>Your words stay yours. The AI only writes the questions.</>
          )}
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Keeping…" : "Keep it"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
    </div>
  );
}
