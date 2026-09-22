import type { ClassifyResult, Department } from "./types.js";

export interface PolicyThresholds {
  reviewConfidence: number;
  spamQuarantine: number;
  urgentNoul: number;
  salesPitchNoul: number;
}

export const DEFAULT_THRESHOLDS: PolicyThresholds = {
  reviewConfidence: Number(process.env.CONFIDENCE_REVIEW_THRESHOLD ?? 0.6),
  spamQuarantine: Number(process.env.SPAM_QUARANTINE_THRESHOLD ?? 0.8),
  urgentNoul: 0.8,
  salesPitchNoul: 0.9,
};

// Pure function — unit-testable without any API call.
// Weighted spam formula follows TypeSafe's recommended decomposition:
// don't ask "is this spam?", combine atomic signals in code.
export function spamRisk(args: {
  requestsCredentials: number;
  identityMismatch: number;
  unexpectedReward: number;
}): number {
  return (
    0.45 * args.requestsCredentials +
    0.3 * args.identityMismatch +
    0.25 * args.unexpectedReward
  );
}

export function decideAction(
  partial: Omit<ClassifyResult, "action" | "route" | "spamRisk">,
  t: PolicyThresholds = DEFAULT_THRESHOLDS
): Pick<ClassifyResult, "action" | "route" | "spamRisk"> {
  const risk = spamRisk({
    requestsCredentials: partial.requestsCredentials,
    identityMismatch: partial.identityMismatch,
    unexpectedReward: partial.unexpectedReward,
  });

  // High-confidence phish: two strong atomic signals agree even when the
  // weighted sum lands just under the quarantine line (e.g. credential
  // phish with no prize element caps at ~0.78 under default weights).
  const highConfidencePhish =
    partial.requestsCredentials >= 0.9 && partial.identityMismatch >= 0.7;

  if (risk >= t.spamQuarantine || highConfidencePhish) {
    return { spamRisk: risk, action: "quarantine", route: "quarantine" };
  }
  if (partial.isUrgent >= t.urgentNoul) {
    return { spamRisk: risk, action: "notify_urgent", route: partial.department };
  }
  if (partial.isSalesPitch >= t.salesPitchNoul) {
    return { spamRisk: risk, action: "auto_label", route: partial.department };
  }
  if (partial.departmentConfidence < t.reviewConfidence) {
    return { spamRisk: risk, action: "route_human", route: "human_review" };
  }
  return { spamRisk: risk, action: "route_team", route: partial.department as Department };
}
