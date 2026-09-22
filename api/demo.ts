import type { VercelRequest, VercelResponse } from "@vercel/node";
import { QUESTION_SET_VERSION } from "../src/questions.js";
import { loadDemoEmails } from "../src/demo.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    res.json({ questionSet: QUESTION_SET_VERSION, emails: loadDemoEmails() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
