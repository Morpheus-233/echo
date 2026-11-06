-- Echo schema. Safe to run more than once.
-- Works on Supabase and on a plain Postgres.

create extension if not exists "pgcrypto";

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  body text not null check (length(trim(body)) > 0),
  note_date date not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  suggestion text,
  suggestion_dismissed boolean not null default false,
  error text
);

create index if not exists notes_note_date_idx on notes (note_date);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes (id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index int not null check (correct_index between 0 and 3),
  stage int not null default 0 check (stage >= 0),
  due_on date not null,
  status text not null default 'active' check (status in ('active', 'learned', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists cards_due_idx on cards (status, due_on);
create index if not exists cards_note_idx on cards (note_id);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards (id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  mode text not null check (mode in ('mcq', 'typed')),
  picked_index int,
  typed_answer text,
  correct boolean not null
);

create index if not exists reviews_card_idx on reviews (card_id);
