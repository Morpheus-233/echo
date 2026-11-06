import { randomUUID } from "node:crypto";
import { addDays } from "../date";
import { initialDueOn } from "../schedule";
import type { Card, Note, NoteWithCards } from "../types";
import type { Store } from "./types";

interface MemoryState {
  notes: Note[];
  cards: Card[];
  reviews: Array<{ id: string; cardId: string; correct: boolean; reviewedAt: string }>;
  seeded: boolean;
}

function seed(state: MemoryState, today: string) {
  if (state.seeded) return;
  state.seeded = true;

  const add = (body: string, noteDate: string, cards: Array<Omit<Card, "id" | "noteId" | "dueOn">>) => {
    const note: Note = {
      id: randomUUID(),
      body,
      noteDate,
      createdAt: `${noteDate}T09:12:00.000Z`,
      status: "ready",
      suggestion: null,
      suggestionDismissed: false,
      error: null,
    };
    state.notes.push(note);
    for (const card of cards) {
      state.cards.push({
        ...card,
        id: randomUUID(),
        noteId: note.id,
        dueOn: initialDueOn(noteDate),
      });
    }
  };

  add(
    "A memory leak is memory that a program allocates and never frees. It's not that the memory is gone — it's that nothing can reach it any more, so the allocator can't reuse it. The process keeps growing until it gets killed.",
    addDays(today, -7),
    [
      {
        question: "Why does an unreachable allocation count as a leak?",
        options: [
          "The allocator can no longer reuse it, so the process keeps growing",
          "The operating system has physically destroyed the memory",
          "The garbage collector frees it too early",
          "The stack has run out of frames",
        ],
        correctIndex: 0,
        stage: 2,
        status: "active",
      },
    ],
  );

  add(
    "TCP opens a connection with a three-way handshake: SYN, SYN-ACK, ACK. The point is that both sides agree on the starting sequence numbers before any data moves.",
    addDays(today, -2),
    [
      {
        question: "What does the three-way handshake actually establish?",
        options: [
          "A shared starting sequence number on both sides",
          "An encrypted tunnel between the hosts",
          "Which side will send the most data",
          "A fixed window size for the whole connection",
        ],
        correctIndex: 0,
        stage: 1,
        status: "active",
      },
      {
        question: "Which packet opens the handshake?",
        options: ["SYN", "ACK", "FIN", "RST"],
        correctIndex: 0,
        stage: 1,
        status: "active",
      },
    ],
  );

  add(
    "Postgres uses MVCC: an UPDATE writes a new row version and leaves the old one for readers, so readers never block writers. Vacuum is what eventually cleans up the dead versions.",
    today,
    [
      {
        question: "Why don't readers block writers in Postgres?",
        options: [
          "Each update writes a new row version that readers ignore",
          "Readers take a shared lock on the whole table",
          "Writers buffer their changes until readers finish",
          "Postgres serialises every transaction",
        ],
        correctIndex: 0,
        stage: 0,
        status: "active",
      },
    ],
  );

  // Make the two older notes due today so the review screen has something real.
  for (const card of state.cards) {
    if (card.dueOn > today) continue;
    const note = state.notes.find((n) => n.id === card.noteId);
    if (note && note.noteDate !== today) card.dueOn = today;
  }
}

export function createMemoryStore(): Store {
  const state: MemoryState = { notes: [], cards: [], reviews: [], seeded: false };

  const withCards = (note: Note): NoteWithCards => ({
    ...note,
    cards: state.cards.filter((c) => c.noteId === note.id).sort((a, b) => a.id.localeCompare(b.id)),
  });

  return {
    async notesForDate(date) {
      seed(state, date);
      return state.notes
        .filter((n) => n.noteDate === date)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(withCards);
    },

    async notesBetween(from, to) {
      const today = to;
      seed(state, today);
      return state.notes
        .filter((n) => n.noteDate >= from && n.noteDate <= to)
        .sort((a, b) => a.noteDate.localeCompare(b.noteDate) || a.createdAt.localeCompare(b.createdAt))
        .map(withCards);
    },

    async getNote(id) {
      seed(state, new Date().toISOString().slice(0, 10));
      const note = state.notes.find((n) => n.id === id);
      return note ? withCards(note) : null;
    },

    async noteCounts(from, to) {
      seed(state, to);
      const counts: Record<string, number> = {};
      for (const note of state.notes) {
        if (note.noteDate < from || note.noteDate > to) continue;
        counts[note.noteDate] = (counts[note.noteDate] ?? 0) + 1;
      }
      return counts;
    },

    async createNote(body, noteDate) {
      seed(state, noteDate);
      const note: Note = {
        id: randomUUID(),
        body,
        noteDate,
        createdAt: new Date().toISOString(),
        status: "pending",
        suggestion: null,
        suggestionDismissed: false,
        error: null,
      };
      state.notes.push(note);
      return note;
    },

    async updateNote(id, body) {
      const note = state.notes.find((n) => n.id === id);
      if (note) note.body = body;
    },

    async deleteNote(id) {
      state.notes = state.notes.filter((n) => n.id !== id);
      state.cards = state.cards.filter((c) => c.noteId !== id);
    },

    async setNoteStatus(id, status, suggestion, error) {
      const note = state.notes.find((n) => n.id === id);
      if (note) {
        note.status = status;
        note.suggestion = suggestion;
        note.error = error;
      }
    },

    async dismissSuggestion(id) {
      const note = state.notes.find((n) => n.id === id);
      if (note) note.suggestionDismissed = true;
    },

    async cardsForNote(noteId) {
      return state.cards.filter((c) => c.noteId === noteId);
    },

    async addCards(noteId, noteDate, cards) {
      const created = cards.map((card) => ({
        ...card,
        id: randomUUID(),
        noteId,
        stage: 0,
        dueOn: initialDueOn(noteDate),
        status: "active" as const,
      }));
      state.cards.push(...created);
      return created;
    },

    async clearCards(noteId) {
      state.cards = state.cards.filter((c) => c.noteId !== noteId);
    },

    async dueCards(today) {
      seed(state, today);
      return state.cards
        .filter((c) => c.status === "active" && c.dueOn <= today)
        .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
        .map((card) => {
          const note = state.notes.find((n) => n.id === card.noteId);
          return {
            ...card,
            noteBody: note?.body ?? "",
            noteDate: note?.noteDate ?? today,
            noteSuggestion: note?.suggestion ?? null,
          };
        });
    },

    async getCard(id) {
      const card = state.cards.find((c) => c.id === id);
      if (!card) return null;
      const note = state.notes.find((n) => n.id === card.noteId);
      return {
        ...card,
        noteBody: note?.body ?? "",
        noteDate: note?.noteDate ?? "",
        noteSuggestion: note?.suggestion ?? null,
      };
    },

    async recordReview(cardId, input, next) {
      const card = state.cards.find((c) => c.id === cardId);
      if (card) {
        card.stage = next.stage;
        card.dueOn = next.dueOn;
        card.status = next.status;
      }
      state.reviews.push({
        id: randomUUID(),
        cardId,
        correct: input.correct,
        reviewedAt: new Date().toISOString(),
      });
    },

    async rejectCard(id) {
      const card = state.cards.find((c) => c.id === id);
      if (card) card.status = "rejected";
    },

    async searchNotes(query) {
      seed(state, new Date().toISOString().slice(0, 10));
      const q = query.toLowerCase();
      return state.notes
        .filter((n) => n.body.toLowerCase().includes(q))
        .sort((a, b) => b.noteDate.localeCompare(a.noteDate))
        .map(withCards);
    },

    async counts(today) {
      seed(state, today);
      return {
        notes: state.notes.length,
        due: state.cards.filter((c) => c.status === "active" && c.dueOn <= today).length,
        learned: state.cards.filter((c) => c.status === "learned").length,
      };
    },
  };
}
