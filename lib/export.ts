import { formatLong } from "./date";
import { stageLabel } from "./schedule";
import type { NoteWithCards } from "./types";

export interface JournalExportPayload {
  version: 1;
  exportedAt: string;
  noteCount: number;
  cardCount: number;
  notes: Array<{
    id: string;
    noteDate: string;
    createdAt: string;
    body: string;
    status: NoteWithCards["status"];
    suggestion: string | null;
    suggestionDismissed: boolean;
    cards: Array<{
      id: string;
      question: string;
      options: string[];
      correctIndex: number;
      stage: number;
      dueOn: string;
      status: NoteWithCards["cards"][number]["status"];
    }>;
  }>;
}

export function buildExportPayload(notes: NoteWithCards[], exportedAt: string): JournalExportPayload {
  const sorted = [...notes].sort(
    (a, b) => a.noteDate.localeCompare(b.noteDate) || a.createdAt.localeCompare(b.createdAt),
  );
  const cardCount = sorted.reduce((sum, note) => sum + note.cards.length, 0);

  return {
    version: 1,
    exportedAt,
    noteCount: sorted.length,
    cardCount,
    notes: sorted.map((note) => ({
      id: note.id,
      noteDate: note.noteDate,
      createdAt: note.createdAt,
      body: note.body,
      status: note.status,
      suggestion: note.suggestion,
      suggestionDismissed: note.suggestionDismissed,
      cards: note.cards.map((card) => ({
        id: card.id,
        question: card.question,
        options: [...card.options],
        correctIndex: card.correctIndex,
        stage: card.stage,
        dueOn: card.dueOn,
        status: card.status,
      })),
    })),
  };
}

export function formatExportJson(notes: NoteWithCards[], exportedAt: string): string {
  return JSON.stringify(buildExportPayload(notes, exportedAt), null, 2);
}

export function formatExportMarkdown(notes: NoteWithCards[], exportedAt: string): string {
  const sorted = [...notes].sort(
    (a, b) => a.noteDate.localeCompare(b.noteDate) || a.createdAt.localeCompare(b.createdAt),
  );

  const lines: string[] = [
    "# Echo Journal",
    "",
    `Exported ${exportedAt} · ${sorted.length} ${sorted.length === 1 ? "note" : "notes"}`,
  ];

  if (sorted.length === 0) {
    lines.push("", "_No notes recorded yet._", "");
    return lines.join("\n");
  }

  let currentDay = "";
  for (const note of sorted) {
    if (note.noteDate !== currentDay) {
      currentDay = note.noteDate;
      lines.push("", `## ${formatLong(note.noteDate)} (${note.noteDate})`);
    }

    lines.push("", note.body);

    if (note.suggestion && !note.suggestionDismissed) {
      lines.push("", `> **The examiner wonders:** ${note.suggestion}`);
    }

    const visibleCards = note.cards.filter((card) => card.status !== "rejected");
    if (visibleCards.length > 0) {
      lines.push("", "### Recall questions");
      for (const card of visibleCards) {
        const badge =
          card.status === "learned" ? "learned" : `${stageLabel(card.stage)} · due ${card.dueOn}`;
        lines.push(`- **${card.question}** _(${badge})_`);
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}
