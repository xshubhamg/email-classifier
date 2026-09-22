import type { VercelRequest, VercelResponse } from "@vercel/node";
import { classifyEmail } from "../src/classify.js";
import { parseThresholds } from "../src/policy.js";
import { QUESTION_SET_VERSION } from "../src/questions.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed, use POST" });
    return;
  }
  const { subject, body, from } = req.body ?? {};
  if (typeof subject !== "string" || typeof body !== "string") {
    res.status(422).json({ error: "body must include { subject: string, body: string, from?: string }" });
    return;
  }
  try {
    const result = await classifyEmail({ subject, body, from }, parseThresholds(req.body));
    res.json({ questionSet: QUESTION_SET_VERSION, ...result });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
