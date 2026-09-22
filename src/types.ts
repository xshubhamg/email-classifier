export interface EmailInput {
  subject: string;
  from?: string;
  body: string;
}

export type Department = "sales" | "support" | "billing" | "hiring" | "other";

export interface ClassifyResult {
  department: Department;
  departmentProbabilities: Record<string, number>;
  departmentConfidence: number;
  isUrgent: number;
  isSalesPitch: number;
  requestsCredentials: number;
  identityMismatch: number;
  unexpectedReward: number;
  spamRisk: number;
  frustration: number;
  priority: number;
  action: "quarantine" | "notify_urgent" | "auto_label" | "route_human" | "route_team";
  route: Department | "quarantine" | "human_review";
  model: string;
  usage?: { input_tokens: number; output_tokens: number };
  mocked: boolean;
}

/** Demo email with gold labels for eval. */
export interface DemoEmail extends EmailInput {
  id: string;
  gold_department: Department;
  gold_spam: boolean;
  gold_urgent: boolean;
}
