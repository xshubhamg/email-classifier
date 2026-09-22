import { getClient, hasApiKey, JEV_MODEL } from "./jev-client.js";
import { buildState, emailQuestions } from "./questions.js";
import { decideAction, type PolicyThresholds, DEFAULT_THRESHOLDS } from "./policy.js";
import type { ClassifyResult, Department, EmailInput } from "./types.js";

function useMock(): boolean {
  return process.env.MOCK_JEV === "1" || !hasApiKey();
}

// Keyword heuristic fallback so CLI / API / eval work without a key.
// Never used when a real key is present (unless MOCK_JEV=1).
function mockClassify(email: EmailInput): ClassifyResult {
  const text = `${email.subject} ${email.body} ${email.from ?? ""}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w));

  const requestsCredentials = has("password", "verify your account", "credentials", "ssn", "bank details", "confirm your login") ? 0.95 : 0.05;
  const identityMismatch = has("spoof", "mismatch", "tempmail", "lottery-claims", "will be suspended", "verify your password") || (has("paypal", "paypai", "apple", "microsoft") && has("@gmail", "@yahoo", "@tempmail")) ? 0.9 : has("prize", "winner", "inheritance", "lottery") ? 0.7 : 0.1;
  const unexpectedReward = has("prize", "winner", "lottery", "inheritance", "windfall", "congratulations you won") ? 0.95 : 0.05;
  const isUrgent = has("asap", "urgent", "immediately", "down", "failing", "500", "losing sales", "help asap") ? 0.95 : 0.1;
  const isSalesPitch = has("unsubscribe", "discount", "sale ends", "demo", "% off", "marketing blast") ? 0.92 : 0.08;

  let department: Department = "other";
  let confidence = 0.55;
  if (has("invoice", "charged twice", "billing", "subscription", "refund", "payment")) { department = "billing"; confidence = 0.88; }
  else if (has("stripe", "integration", "bug", "failing", "500", "deploy failed", "error")) { department = "support"; confidence = 0.9; }
  else if (has("pricing", "demo", "trial", "sales", "discount")) { department = "sales"; confidence = 0.82; }
  else if (has("resume", "application", "interview", "hiring", "job")) { department = "hiring"; confidence = 0.9; }

  const probs: Record<string, number> = { sales: 0.05, support: 0.05, billing: 0.05, hiring: 0.05, other: 0.05 };
  probs[department] = confidence;
  const rest = (1 - confidence) / 4;
  for (const k of Object.keys(probs)) if (k !== department) probs[k] = rest;

  const partial = {
    department,
    departmentProbabilities: probs,
    departmentConfidence: confidence,
    isUrgent,
    isSalesPitch,
    requestsCredentials,
    identityMismatch,
    unexpectedReward,
    frustration: has("angry", "furious", "unacceptable", "losing sales") ? 1.6 : 0.3,
    priority: isUrgent > 0.8 ? 2.0 : 1.0,
    model: "mock",
    mocked: true as const,
  };
  const decision = decideAction(partial);
  return { ...partial, ...decision };
}

export async function classifyEmail(
  email: EmailInput,
  overrides?: Partial<PolicyThresholds>
): Promise<ClassifyResult> {
  const thresholds: PolicyThresholds = { ...DEFAULT_THRESHOLDS, ...overrides };
  if (useMock()) {
    const mocked = mockClassify(email);
    const decision = decideAction(mocked, thresholds);
    return { ...mocked, ...decision };
  }

  const client = getClient();
  const { answers, model, usage } = await client.systemOne({
    state: buildState(email),
    questions: emailQuestions,
  });

  const department = answers.department.choice as Department;
  const partial = {
    department,
    departmentProbabilities: { ...(answers.department.probabilities as Record<string, number>) },
    departmentConfidence: answers.department.confidence,
    isUrgent: answers.is_urgent.noul,
    isSalesPitch: answers.is_sales_pitch.noul,
    requestsCredentials: answers.requests_credentials.noul,
    identityMismatch: answers.identity_mismatch.noul,
    unexpectedReward: answers.unexpected_reward.noul,
    frustration: answers.frustration.score,
    priority: answers.priority.score,
    model,
    usage: { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens },
    mocked: false as const,
  };
  return { ...partial, ...decideAction(partial, thresholds) };
}

export { JEV_MODEL };
