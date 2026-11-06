export type NoteStatus = "pending" | "ready" | "failed";
export type CardStatus = "active" | "learned" | "rejected";
export type ReviewMode = "mcq" | "typed";

export interface Note {
  id: string;
  body: string;
  /** YYYY-MM-DD, the day the note belongs to */
  noteDate: string;
  /** ISO timestamp */
  createdAt: string;
  status: NoteStatus;
  suggestion: string | null;
  suggestionDismissed: boolean;
  /** Why question generation failed, when status is "failed". */
  error: string | null;
}

export interface Card {
  id: string;
  noteId: string;
  question: string;
  options: string[];
  correctIndex: number;
  /** index into LADDER_DAYS of the next review */
  stage: number;
  /** YYYY-MM-DD */
  dueOn: string;
  status: CardStatus;
}

export interface NoteWithCards extends Note {
  cards: Card[];
}

export interface CardWithNote extends Card {
  noteBody: string;
  noteDate: string;
  noteSuggestion: string | null;
}

export interface GeneratedCard {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface GeneratedSet {
  cards: GeneratedCard[];
  suggestion: string | null;
}

export interface ReviewInput {
  mode: ReviewMode;
  pickedIndex: number | null;
  typedAnswer: string | null;
  correct: boolean;
}
