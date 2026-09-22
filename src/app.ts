import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { classifyEmail, JEV_MODEL } from "./classify.js";
import { hasApiKey } from "./jev-client.js";
import { QUESTION_SET_VERSION } from "./questions.js";
import { loadDemoEmails } from "./demo.js";
import { parseThresholds } from "./policy.js";
import "dotenv/config";

const app = express();
app.use(express.json({ limit: "256kb" }));

const __dirname = dirname(fileURLToPath(import.meta.url));

// Local dev: serve the UI from Express. On Vercel, public/ is served by the
// CDN (see vercel.json) and this is a harmless no-op fallback.
app.use(express.static(join(__dirname, "..", "..", "public")));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    model: JEV_MODEL,
    questionSet: QUESTION_SET_VERSION,
    keyConfigured: hasApiKey(),
    mock: !hasApiKey(),
  });
});

// Demo inbox for the UI (bundled JSON import — works on serverless too).
app.get("/demo", (_req, res) => {
  try {
    res.json({ questionSet: QUESTION_SET_VERSION, emails: loadDemoEmails() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /classify { subject, body, from?, thresholds? } → typed Jev decision + routing
// POST /classify/batch { emails: [...], thresholds? } → array of results
app.post("/classify", async (req, res) => {
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
});

app.post("/classify/batch", async (req, res) => {
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
});

export default app;
