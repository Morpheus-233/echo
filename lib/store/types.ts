import type {
  Card,
  CardWithNote,
  GeneratedCard,
  Note,
  NoteStatus,
  NoteWithCards,
  ReviewInput,
} from "../types";
import type { ScheduleState } from "../schedule";

export interface Store {
  /** Notes for one day, with their cards, oldest first. */
  notesForDate(date: string): Promise<NoteWithCards[]>;
  /** Notes between two YYYY-MM-DD dates inclusive. */
  notesBetween(from: string, to: string): Promise<NoteWithCards[]>;
  getNote(id: string): Promise<NoteWithCards | null>;
  /** date -> note count, for the calendar. */
  noteCounts(from: string, to: string): Promise<Record<string, number>>;

  createNote(body: string, noteDate: string): Promise<Note>;
  updateNote(id: string, body: string): Promise<void>;
  deleteNote(id: string): Promise<void>;
  setNoteStatus(id: string, status: NoteStatus, suggestion: string | null, error: string | null): Promise<void>;
  dismissSuggestion(id: string): Promise<void>;

  cardsForNote(noteId: string): Promise<Card[]>;
  addCards(noteId: string, noteDate: string, cards: GeneratedCard[]): Promise<Card[]>;
  clearCards(noteId: string): Promise<void>;

  dueCards(today: string): Promise<CardWithNote[]>;
  getCard(id: string): Promise<CardWithNote | null>;
  recordReview(cardId: string, input: ReviewInput, next: ScheduleState): Promise<void>;
  rejectCard(id: string): Promise<void>;

  searchNotes(query: string): Promise<NoteWithCards[]>;
  counts(today: string): Promise<{ notes: number; due: number; learned: number }>;
}
