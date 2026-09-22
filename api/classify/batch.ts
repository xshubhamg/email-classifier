import type { VercelRequest, VercelResponse } from "@vercel/node";
import { classifyEmail } from "../../src/classify.js";
import { parseThresholds } from "../../src/policy.js";
import { QUESTION_SET_VERSION } from "../../src/questions.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed, use POST" });
    return;
  }
  const { emails } = req.body ?? {};
  if (!Array.isArray(emails) || emails.length === 0 || emails.length > 50) {
    res.status(422).json({ error: "body must include { emails: [{subject, body, from?}] } (1-50 items)" });
    return;
  }
  for (const e of emails) {
    if (typeof e?.subject !== "string" || typeof e?.body !== "string") {
      res.status(422).json({ error: "each email must include { subject: string, body: string }" });
      return;
    }
  }
  try {
    const thresholds = parseThresholds(req.body);
    // Parallel: one Jev call per email, all in flight at once.
    const results = await Promise.all(
      emails.map((e) => classifyEmail({ subject: e.subject, body: e.body, from: e.from }, thresholds))
    );
    res.json({ questionSet: QUESTION_SET_VERSION, results });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
