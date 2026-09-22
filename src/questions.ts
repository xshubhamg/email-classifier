import { choice, noul, score } from "@typesafe-ai/sdk";

// QUESTION SET VERSION — bump + re-tune thresholds when editing wording.
// Atomic questions composed in code (TypeSafe pattern): one gut-check per
// question, weighted combination in policy.ts instead of one big "is spam?".
export const QUESTION_SET_VERSION = "EMAIL_Q_V1";

export const emailQuestions = {
  department: choice("Which team should handle this email?", {
    sales: "Pricing, demos, or new account questions",
    support: "Bugs, integration problems, or how-to help",
    billing: "Payments, invoices, subscriptions, refunds",
    hiring: "Job applications, recruiting, interviews",
    other: "Anything else, including newsletters and personal mail",
  }),
  is_urgent: noul("The message conveys urgency or time-sensitivity"),
  is_sales_pitch: noul("The message is an unsolicited sales pitch or marketing blast"),
  requests_credentials: noul(
    "The message requests passwords, credentials, payment details, or sensitive account info"
  ),
  identity_mismatch: noul(
    "The sender's claimed identity mismatches their email domain or looks spoofed"
  ),
  unexpected_reward: noul(
    "The message announces an unexpected prize, reward, inheritance, or windfall"
  ),
  frustration: score(
    "How frustrated the sender appears",
    ["Calm, just stating facts", "Frustrated but civil", "Very angry, strong language"] as const
  ),
  priority: score(
    "How quickly this email needs a response",
    ["Low priority, can wait", "Normal priority", "High priority, respond immediately"] as const
  ),
} as const;

export type EmailQuestions = typeof emailQuestions;

export function buildState(input: { subject: string; from?: string; body: string }): string {
  const from = input.from ? `From: ${input.from}\n` : "";
  return `${from}Subject: ${input.subject}\n\n${input.body}`;
}
