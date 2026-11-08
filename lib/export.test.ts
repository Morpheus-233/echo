import { describe, expect, it } from "vitest";
import { formatExportJson, formatExportMarkdown } from "./export";
import type { NoteWithCards } from "./types";

const sampleNotes: NoteWithCards[] = [
  {
    id: "n-2",
    body: "TCP opens a connection with SYN, SYN-ACK, ACK.",
    noteDate: "2026-11-06",
    createdAt: "2026-11-06T10:00:00.000Z",
    status: "ready",
    suggestion: null,
    suggestionDismissed: false,
    error: null,
    cards: [
      {
        id: "c-2",
        noteId: "n-2",
        question: "Which packet starts the handshake?",
        options: ["SYN", "ACK", "FIN", "RST"],
        correctIndex: 0,
        stage: 4,
        dueOn: "2026-12-11",
        status: "learned",
      },
      {
        id: "c-rejected",
        noteId: "n-2",
        question: "Bad question",
        options: ["a", "b", "c", "d"],
        correctIndex: 0,
        stage: 0,
        dueOn: "2026-11-08",
        status: "rejected",
      },
    ],
  },
  {
    id: "n-1",
    body: "A memory leak happens when unreachable memory is never freed.",
    noteDate: "2026-11-01",
    createdAt: "2026-11-01T09:00:00.000Z",
    status: "ready",
    suggestion: "Garbage collectors do reclaim unreachable memory in managed runtimes.",
    suggestionDismissed: false,
    error: null,
    cards: [
      {
        id: "c-1",
        noteId: "n-1",
        question: "What causes a memory leak?",
        options: ["Unfreed unreachable memory", "CPU cache miss", "Disk full", "Bad cable"],
        correctIndex: 0,
        stage: 1,
        dueOn: "2026-11-04",
        status: "active",
      },
    ],
  },
];

describe("export", () => {
  it("serialises notes and cards chronologically as JSON with verbatim note text", () => {
    const raw = formatExportJson(sampleNotes, "2026-11-08");
    const parsed = JSON.parse(raw);

    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe("2026-11-08");
    expect(parsed.noteCount).toBe(2);
    expect(parsed.cardCount).toBe(3);
    expect(parsed.notes[0].id).toBe("n-1");
    expect(parsed.notes[0].body).toBe("A memory leak happens when unreachable memory is never freed.");
    expect(parsed.notes[1].id).toBe("n-2");
  });

  it("formats Markdown with verbatim notes, examiner suggestions, and non-rejected cards", () => {
    const md = formatExportMarkdown(sampleNotes, "2026-11-08");

    expect(md).toContain("# Echo Journal");
    expect(md).toContain("## Sunday 1 November 2026 (2026-11-01)");
    expect(md).toContain("A memory leak happens when unreachable memory is never freed.");
    expect(md).toContain("> **The examiner wonders:** Garbage collectors do reclaim unreachable memory");
    expect(md).toContain("- **What causes a memory leak?** _(day 3 · due 2026-11-04)_");
    expect(md).toContain("- **Which packet starts the handshake?** _(learned)_");
    expect(md).not.toContain("Bad question");
  });

  it("handles an empty journal gracefully in Markdown", () => {
    const md = formatExportMarkdown([], "2026-11-08");
    expect(md).toContain("_No notes recorded yet._");
  });
});
