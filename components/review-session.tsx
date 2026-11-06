"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { rejectCardAction, reviewCardAction } from "@/app/actions";
import { formatShort } from "@/lib/date";
import type { CardWithNote } from "@/lib/types";

type Phase = "answer" | "reveal" | "done";

const LETTERS = ["A", "B", "C", "D"];

export function ReviewSession({ cards, hasNotes }: { cards: CardWithNote[]; hasNotes: boolean }) {
  const router = useRouter();
  // The session owns its queue. Server refreshes happen after every recorded
  // answer, and they must not shrink the list underneath the person answering.
  const [queue] = useState<CardWithNote[]>(() => cards);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(queue.length ? "answer" : "done");
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState({ right: 0, wrong: 0 });

  const card = queue[index];
  const attempted = tally.right + tally.wrong;
  const progress = queue.length ? (index / queue.length) * 100 : 0;

  const verdict = useMemo(() => {
    if (phase !== "reveal" || !card || picked === null) return null;
    return picked === card.correctIndex;
  }, [phase, card, picked]);

  function advance() {
    setError(null);
    setPicked(null);
    setTyped("");
    if (index + 1 >= queue.length) {
      setPhase("done");
      router.refresh();
      return;
    }
    setIndex(index + 1);
    setPhase("answer");
  }

  async function record(correct: boolean) {
    if (!card || busy) return;
    setBusy(true);
    const result = await reviewCardAction(card.id, {
      mode: picked === null ? "typed" : "mcq",
      pickedIndex: picked,
      typedAnswer: picked === null ? typed.trim() || null : null,
      correct,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTally((current) => ({
      right: current.right + (correct ? 1 : 0),
      wrong: current.wrong + (correct ? 0 : 1),
    }));
    advance();
  }

  async function reject() {
    if (!card || busy) return;
    setBusy(true);
    const result = await rejectCardAction(card.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    advance();
  }

  // The keyboard listener is registered once per phase instead of once per
  // render, so it reaches `record` through a ref rather than a dependency.
  const recordRef = useRef(record);
  useEffect(() => {
    recordRef.current = record;
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (phase === "done") return;
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      if (typing) return;

      if (phase === "answer" && ["1", "2", "3", "4"].includes(event.key)) {
        setPicked(Number(event.key) - 1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (phase === "answer" && (picked !== null || typed.trim())) {
          setPhase("reveal");
        } else if (phase === "reveal" && picked !== null) {
          void recordRef.current(verdict === true);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, picked, typed, verdict]);

  if (phase === "done" || !card) {
    if (attempted === 0 && queue.length === 0) {
      return (
        <div className="rise">
          <p className="label">Review</p>
          <h1 className="mt-3 font-display text-[2.4rem] leading-[1.08] tracking-[-0.02em]">
            Nothing is due.
          </h1>
          <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-ink-soft">
            {hasNotes
              ? "The queue refills as each question reaches its next day. Nothing to catch up on."
              : "Write your first note and it will come back to you on day 2."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-accent">
              {hasNotes ? "Write today's note" : "Write your first note"}
            </Link>
            <Link
              href="/journal"
              className="rounded-full border border-rule px-5 py-2.5 text-sm text-ink-soft hover:bg-paper-deep"
            >
              Open the journal
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="rise">
        <p className="label">Session finished</p>
        <h1 className="mt-3 font-display text-[2.4rem] leading-[1.08] tracking-[-0.02em]">
          {attempted === 0 ? "Nothing answered." : `${tally.right} of ${attempted} recalled.`}
        </h1>
        <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-ink-soft">
          {attempted === 0
            ? "The queue is empty for now."
            : tally.right === attempted
              ? "All of them came back. The gaps between questions grow from here."
              : "The ones you missed return in two days, one rung lower."}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-accent">
            Back to today
          </Link>
          <Link
            href="/journal"
            className="rounded-full border border-rule px-5 py-2.5 text-sm text-ink-soft hover:bg-paper-deep"
          >
            Open the journal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rise">
      <div className="flex items-center justify-between gap-4">
        <p className="label">
          Question {index + 1} of {queue.length}
        </p>
        <p className="text-[11px] text-ink-faint">{formatShort(card.noteDate)}</p>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-paper-deep">
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <h1 className="mt-7 font-display text-[1.65rem] leading-[1.3] tracking-[-0.015em] sm:text-[2rem]">
        {card.question}
      </h1>

      <div className="mt-6 space-y-2">
        {card.options.map((option, optionIndex) => {
          const isCorrect = optionIndex === card.correctIndex;
          const isPicked = optionIndex === picked;
          let className = "border-rule bg-paper-raised text-ink hover:border-ink-faint";
          if (phase === "answer" && isPicked) className = "border-ink bg-paper-deep text-ink";
          if (phase === "reveal" && isCorrect) className = "border-moss bg-moss-soft text-ink";
          if (phase === "reveal" && isPicked && !isCorrect) className = "border-accent bg-accent-soft/70 text-ink";

          return (
            <button
              key={optionIndex}
              type="button"
              disabled={phase !== "answer" || busy}
              onClick={() => {
                setPicked(optionIndex);
                setError(null);
              }}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[15px] leading-snug transition disabled:cursor-default ${className}`}
            >
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                  phase === "reveal" && isCorrect
                    ? "border-moss bg-moss text-paper"
                    : phase === "reveal" && isPicked
                      ? "border-accent bg-accent text-paper"
                      : isPicked
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-faint"
                }`}
              >
                {LETTERS[optionIndex] ?? optionIndex + 1}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {phase === "answer" ? (
        <>
          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-rule" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">or answer it yourself</span>
            <span className="h-px flex-1 bg-rule" />
          </div>
          <textarea
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
              if (event.target.value) setPicked(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (typed.trim()) setPhase("reveal");
              }
            }}
            rows={2}
            placeholder="Say it the way you remember it…"
            className="mt-3 w-full resize-y rounded-xl border border-rule bg-paper-raised px-4 py-3 font-display text-[1.05rem] leading-relaxed outline-none placeholder:font-sans placeholder:text-sm placeholder:text-ink-faint focus:border-accent"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-ink-faint">You are not being marked by a machine.</p>
            <button
              type="button"
              disabled={busy || (picked === null && !typed.trim())}
              onClick={() => setPhase("reveal")}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
            >
              Check
            </button>
          </div>
        </>
      ) : null}

      {phase === "reveal" ? (
        <div className="rise mt-6">
          {picked !== null ? (
            <p className={`text-sm font-medium ${verdict ? "text-moss" : "text-accent"}`}>
              {verdict ? "Right." : `Not quite — the answer was ${LETTERS[card.correctIndex]}.`}
            </p>
          ) : (
            <p className="text-sm text-ink-soft">Compare what you wrote with what you wrote then.</p>
          )}

          {typed.trim() ? (
            <div className="mt-4 rounded-xl border border-rule/70 bg-paper-deep/30 px-4 py-3">
              <p className="label">You wrote, just now</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{typed}</p>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-rule bg-paper-raised p-4">
            <p className="label">Your words · {formatShort(card.noteDate)}</p>
            <p className="note-body mt-2">{card.noteBody}</p>
          </div>

          {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={reject}
              disabled={busy}
              className="text-[11px] text-ink-faint underline decoration-rule underline-offset-4 hover:text-accent disabled:opacity-40"
            >
              This question is wrong
            </button>

            {picked !== null ? (
              <button
                type="button"
                onClick={() => record(verdict === true)}
                disabled={busy}
                className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper transition hover:bg-accent disabled:opacity-40"
              >
                {busy ? "Saving…" : index + 1 >= queue.length ? "Finish" : "Next question"}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => record(false)}
                  disabled={busy}
                  className="rounded-full border border-accent/40 px-4 py-2.5 text-sm text-accent hover:bg-accent hover:text-paper disabled:opacity-40"
                >
                  I missed it
                </button>
                <button
                  type="button"
                  onClick={() => record(true)}
                  disabled={busy}
                  className="rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-40"
                >
                  I got it
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
