import type { Store } from "./types";
import { createMemoryStore } from "./memory";
import { createPostgresStore } from "./postgres";

let cached: Store | null = null;

export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL;
}

export function getStore(): Store {
  if (cached) return cached;
  cached = process.env.DATABASE_URL ? createPostgresStore() : createMemoryStore();
  return cached;
}

export type { Store } from "./types";
