import postgres from "postgres";
import { initialDueOn } from "../schedule";
import type { Card, CardWithNote, Note, NoteWithCards } from "../types";
import type { Store } from "./types";

type NoteRow = {
  id: string;
  body: string;
  note_date: string;
  created_at: Date | string;
  status: Note["status"];
  suggestion: string | null;
  suggestion_dismissed: boolean;
  error: string | null;
};

type CardRow = {
  id: string;
  note_id: string;
  question: string;
  options: string[] | string;
  correct_index: number;
  stage: number;
  due_on: string;
  status: Card["status"];
};

const NOTE_COLUMNS = `id, body, note_date::text as note_date, created_at, status, suggestion, suggestion_dismissed, error`;
const CARD_COLUMNS = `id, note_id, question, options, correct_index, stage, due_on::text as due_on, status`;
const CARD_COLUMNS_QUALIFIED = `c.id, c.note_id, c.question, c.options, c.correct_index, c.stage, c.due_on::text as due_on, c.status`;

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    body: row.body,
    noteDate: row.note_date,
    createdAt: new Date(row.created_at).toISOString(),
    status: row.status,
    suggestion: row.suggestion,
    suggestionDismissed: row.suggestion_dismissed,
    error: row.error,
  };
}

function mapCard(row: CardRow): Card {
  const options = typeof row.options === "string" ? (JSON.parse(row.options) as string[]) : row.options;
  return {
    id: row.id,
    noteId: row.note_id,
    question: row.question,
    options,
    correctIndex: row.correct_index,
    stage: row.stage,
    dueOn: row.due_on,
    status: row.status,
  };
}

export function createPostgresStore(): Store {
  const url = process.env.DATABASE_URL!;
  const sql = postgres(url, {
    max: 3,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
  });

  async function attachCards(notes: Note[]): Promise<NoteWithCards[]> {
    if (notes.length === 0) return [];
    const ids = notes.map((n) => n.id);
    const rows = await sql<CardRow[]>`
      select ${sql.unsafe(CARD_COLUMNS)}
      from cards
      where note_id in ${sql(ids)}
      order by created_at asc
    `;
    const byNote = new Map<string, Card[]>();
    for (const row of rows) {
      const card = mapCard(row);
      const list = byNote.get(card.noteId) ?? [];
      list.push(card);
      byNote.set(card.noteId, list);
    }
    return notes.map((note) => ({ ...note, cards: byNote.get(note.id) ?? [] }));
  }

  return {
    async notesForDate(date) {
      const rows = await sql<NoteRow[]>`
        select ${sql.unsafe(NOTE_COLUMNS)}
        from notes where note_date = ${date}
        order by created_at asc
      `;
      return attachCards(rows.map(mapNote));
    },

    async notesBetween(from, to) {
      const rows = await sql<NoteRow[]>`
        select ${sql.unsafe(NOTE_COLUMNS)}
        from notes where note_date between ${from} and ${to}
        order by note_date asc, created_at asc
      `;
      return attachCards(rows.map(mapNote));
    },

    async getNote(id) {
      const rows = await sql<NoteRow[]>`
        select ${sql.unsafe(NOTE_COLUMNS)} from notes where id = ${id}
      `;
      if (rows.length === 0) return null;
      const [note] = await attachCards([mapNote(rows[0])]);
      return note;
    },

    async noteCounts(from, to) {
      const rows = await sql<{ d: string; c: number }[]>`
        select note_date::text as d, count(*)::int as c
        from notes where note_date between ${from} and ${to}
        group by 1
      `;
      const counts: Record<string, number> = {};
      for (const row of rows) counts[row.d] = row.c;
      return counts;
    },

    async createNote(body, noteDate) {
      const rows = await sql<NoteRow[]>`
        insert into notes (body, note_date)
        values (${body}, ${noteDate})
        returning ${sql.unsafe(NOTE_COLUMNS)}
      `;
      return mapNote(rows[0]);
    },

    async deleteNote(id) {
      await sql`delete from notes where id = ${id}`;
    },

    async updateNote(id, body) {
      await sql`update notes set body = ${body} where id = ${id}`;
    },

    async setNoteStatus(id, status, suggestion, error) {
      await sql`update notes set status = ${status}, suggestion = ${suggestion}, error = ${error} where id = ${id}`;
    },

    async dismissSuggestion(id) {
      await sql`update notes set suggestion_dismissed = true where id = ${id}`;
    },

    async cardsForNote(noteId) {
      const rows = await sql<CardRow[]>`
        select ${sql.unsafe(CARD_COLUMNS)} from cards where note_id = ${noteId} order by created_at asc
      `;
      return rows.map(mapCard);
    },

    async addCards(noteId, noteDate, cards) {
      const created: Card[] = [];
      for (const card of cards) {
        const rows = await sql<CardRow[]>`
          insert into cards (note_id, question, options, correct_index, stage, due_on)
          values (${noteId}, ${card.question}, ${sql.json(card.options)}, ${card.correctIndex}, 0,
            ${initialDueOn(noteDate)})
          returning ${sql.unsafe(CARD_COLUMNS)}
        `;
        created.push(mapCard(rows[0]));
      }
      return created;
    },

    async clearCards(noteId) {
      await sql`delete from cards where note_id = ${noteId}`;
    },

    async dueCards(today) {
      const rows = await sql<(CardRow & { note_body: string; note_date: string; note_suggestion: string | null })[]>`
        select ${sql.unsafe(CARD_COLUMNS_QUALIFIED)},
          n.body as note_body,
          n.note_date::text as note_date,
          n.suggestion as note_suggestion
        from cards c
        join notes n on n.id = c.note_id
        where c.status = 'active' and c.due_on <= ${today}
        order by c.due_on asc, c.created_at asc
      `;
      return rows.map(
        (row): CardWithNote => ({
          ...mapCard(row),
          noteBody: row.note_body,
          noteDate: row.note_date,
          noteSuggestion: row.note_suggestion,
        }),
      );
    },

    async getCard(id) {
      const rows = await sql<(CardRow & { note_body: string; note_date: string; note_suggestion: string | null })[]>`
        select ${sql.unsafe(CARD_COLUMNS_QUALIFIED)},
          n.body as note_body,
          n.note_date::text as note_date,
          n.suggestion as note_suggestion
        from cards c join notes n on n.id = c.note_id
        where c.id = ${id}
      `;
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        ...mapCard(row),
        noteBody: row.note_body,
        noteDate: row.note_date,
        noteSuggestion: row.note_suggestion,
      };
    },

    async recordReview(cardId, input, next) {
      await sql.begin(async (tx) => {
        await tx`
          update cards
          set stage = ${next.stage}, due_on = ${next.dueOn}, status = ${next.status}
          where id = ${cardId}
        `;
        await tx`
          insert into reviews (card_id, mode, picked_index, typed_answer, correct)
          values (${cardId}, ${input.mode}, ${input.pickedIndex}, ${input.typedAnswer}, ${input.correct})
        `;
      });
    },

    async rejectCard(id) {
      await sql`update cards set status = 'rejected' where id = ${id}`;
    },

    async searchNotes(query) {
      const rows = await sql<NoteRow[]>`
        select ${sql.unsafe(NOTE_COLUMNS)}
        from notes where body ilike ${"%" + query + "%"}
        order by note_date desc, created_at desc
        limit 100
      `;
      return attachCards(rows.map(mapNote));
    },

    async counts(today) {
      const [row] = await sql<{ notes: number; due: number; learned: number }[]>`
        select
          (select count(*)::int from notes) as notes,
          (select count(*)::int from cards where status = 'active' and due_on <= ${today}) as due,
          (select count(*)::int from cards where status = 'learned') as learned
      `;
      return row ?? { notes: 0, due: 0, learned: 0 };
    },
  };
}
