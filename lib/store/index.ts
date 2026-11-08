import type { Store } from "./types";
import { createMemoryStore } from "./memory";
import { createPostgresStore } from "./postgres";

let cached: Store | null = null;
let cachedUrl: string | undefined;

export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL;
}

export function getStore(): Store {
  const currentUrl = process.env.DATABASE_URL || "";
  if (cached && cachedUrl === currentUrl) return cached;
  cachedUrl = currentUrl;
  cached = currentUrl ? createPostgresStore() : createMemoryStore();
  return cached;
}

export type { Store } from "./types";
