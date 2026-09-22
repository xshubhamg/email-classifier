import { TypeSafeClient } from "@typesafe-ai/sdk";
import "dotenv/config";

export const JEV_MODEL = process.env.JEV_MODEL || "jev-1.13.0";

let cached: TypeSafeClient | null = null;

export function hasApiKey(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY?.trim());
}

export function getClient(): TypeSafeClient {
  if (!hasApiKey()) {
    throw new Error(
      "TYPESAFE_API_KEY is not set. Copy .env.example to .env and add your key, or run with MOCK_JEV=1."
    );
  }
  if (!cached) {
    cached = new TypeSafeClient({
      defaultModel: JEV_MODEL,
      timeout: 10_000,
      // SDK defaults already retry 408/429/5xx with backoff + Retry-After.
      // 422/401 surface immediately (no retry) — correct.
      retry: { maxRetries: 3, backoffInitialMs: 500, backoffMaxMs: 5000 },
    });
  }
  return cached;
}
