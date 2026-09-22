import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { DemoEmail } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));

// Demo inbox loader shared by local + serverless. On Vercel the JSON is
// bundled via includeFiles (see vercel.json); locally it resolves from cwd.
export function loadDemoEmails(): DemoEmail[] {
  const candidates = [
    join(process.cwd(), "data", "emails.json"),
    join(here, "..", "data", "emails.json"),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, "utf8")) as DemoEmail[];
    } catch {
      // try next candidate
    }
  }
  throw new Error("demo inbox not found (data/emails.json)");
}
