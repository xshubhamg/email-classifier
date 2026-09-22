import { readFileSync } from "node:fs";
import { classifyEmail } from "./classify.js";
import "dotenv/config";
import type { DemoEmail } from "./types.js";

if (!process.env.TYPESAFE_API_KEY) process.env.MOCK_JEV = "1";

const emails = JSON.parse(readFileSync("data/emails.json", "utf8")) as DemoEmail[];

let deptCorrect = 0;
let spamCorrect = 0;
let urgentCorrect = 0;

for (const e of emails) {
  const r = await classifyEmail(e);
  const deptOk = r.department === e.gold_department || (e.gold_spam && r.action === "quarantine");
  const spamOk = e.gold_spam ? r.action === "quarantine" : r.action !== "quarantine";
  const urgentOk = (r.isUrgent >= 0.8) === e.gold_urgent;
  if (deptOk) deptCorrect++;
  if (spamOk) spamCorrect++;
  if (urgentOk) urgentCorrect++;
  console.log(
    `${deptOk && spamOk ? "PASS" : "FAIL"} [${e.id}] dept=${r.department} (gold=${e.gold_department}) ` +
      `spam_risk=${r.spamRisk.toFixed(2)} (gold_spam=${e.gold_spam}) action=${r.action} conf=${r.departmentConfidence.toFixed(2)}`
  );
}

const n = emails.length;
console.log(`\nAccuracy over ${n} demo emails (mock=${emails.length > 0 ? (await classifyEmail(emails[0])).mocked : "?"}):`);
console.log(`  department: ${deptCorrect}/${n} = ${(100 * deptCorrect / n).toFixed(1)}%`);
console.log(`  spam:       ${spamCorrect}/${n} = ${(100 * spamCorrect / n).toFixed(1)}%`);
console.log(`  urgency:    ${urgentCorrect}/${n} = ${(100 * urgentCorrect / n).toFixed(1)}%`);
console.log("\nRe-run with a real key for calibrated numbers: TYPESAFE_API_KEY=... npm run eval");
