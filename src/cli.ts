import { readFileSync } from "node:fs";
import { classifyEmail } from "./classify.js";
import { hasApiKey } from "./jev-client.js";
import { QUESTION_SET_VERSION } from "./questions.js";
import "dotenv/config";

const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const file = fileIdx >= 0 ? args[fileIdx + 1] : "data/emails.json";
const json = args.includes("--json");

const raw = readFileSync(file, "utf8");
const emails = JSON.parse(raw) as Array<{
  id?: string;
  subject: string;
  from?: string;
  body: string;
}>;

if (!hasApiKey() && process.env.MOCK_JEV !== "1") {
  console.error("Note: TYPESAFE_API_KEY not set — running with mock heuristic (MOCK_JEV=1).");
  process.env.MOCK_JEV = "1";
}

const results = [];
for (const e of emails) {
  const r = await classifyEmail({ subject: e.subject, from: e.from, body: e.body });
  results.push({ id: e.id ?? e.subject, ...r });
}

if (json) {
  console.log(JSON.stringify({ questionSet: QUESTION_SET_VERSION, results }, null, 2));
} else {
  console.log(`\nEmail classification (${QUESTION_SET_VERSION}, model=${results[0]?.model ?? "?"}${results[0]?.mocked ? " MOCK" : ""})\n`);
  for (const r of results) {
    console.log(
      `• [${r.id}] dept=${r.department} (${r.departmentConfidence.toFixed(2)}) ` +
        `spam_risk=${r.spamRisk.toFixed(2)} urgent=${r.isUrgent.toFixed(2)} → ${r.action}/${r.route}`
    );
  }
  console.log("");
}
