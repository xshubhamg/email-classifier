import type { VercelRequest, VercelResponse } from "@vercel/node";
import { JEV_MODEL } from "../src/classify.js";
import { hasApiKey } from "../src/jev-client.js";
import { QUESTION_SET_VERSION } from "../src/questions.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({
    ok: true,
    model: JEV_MODEL,
    questionSet: QUESTION_SET_VERSION,
    keyConfigured: hasApiKey(),
    mock: !hasApiKey(),
  });
}
