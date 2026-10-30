import fs from "node:fs";

// Shared access to the ForeverDB API for the pack import scripts.

export const API = "https://foreverdb.net/api/v1";
export const PAGE_SIZE = 100;
// The API allows 60 requests a minute per key.
const REQUEST_GAP_MS = 1100;

export interface ApiName {
  /** Null for items the client keeps hidden until the game sends them. */
  name: string | null;
  nameEn?: string | null;
}

export function apiKey(): string {
  if (!process.env.FOREVERDB_API_KEY && fs.existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }
  const key = process.env.FOREVERDB_API_KEY;
  if (!key) {
    throw new Error("FOREVERDB_API_KEY fehlt (Umgebung oder .env.local).");
  }
  return key;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJson<T>(key: string, url: string): Promise<T> {
  const response = await fetch(url, { headers: { "X-API-Key": key } });
  if (!response.ok) {
    throw new Error(`${response.status} bei ${url}: ${await response.text()}`);
  }
  await wait(REQUEST_GAP_MS);
  return (await response.json()) as T;
}

const UNKNOWN_ITEM = { de: "Unbekannter Gegenstand", en: "Unknown item" };

/** German name with the English one beside it, as the pack stores names. */
export function localized({ name, nameEn }: ApiName) {
  if (!name) {
    return UNKNOWN_ITEM;
  }
  return { de: name, en: nameEn ?? name };
}
