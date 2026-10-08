// ─── Ad Account ─────────────────────────────────────────────────────────────
export interface AdAccount {
  id: string;        // e.g. "act_123456789"
  accountId: string;
  name: string;
  currency: string;
  status: "ACTIVE" | "DISABLED";
}

// ─── Rule Types ──────────────────────────────────────────────────────────────
export type RuleConditionOperator = "GREATER_THAN" | "LESS_THAN" | "EQUALS" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN_OR_EQUAL";
export type RuleMetric = "spent" | "cpr" | "cpc" | "cpm" | "ctr" | "impressions" | "results";
export type RuleAction = "PAUSE_AD" | "PAUSE_ADSET" | "PAUSE_CAMPAIGN" | "SEND_NOTIFICATION";
export type RuleLevel = "AD" | "ADSET" | "CAMPAIGN";
export type RuleTimeWindow = "today" | "last_3d" | "last_7d" | "this_month";

// Matches Meta's native "Edit rule" Schedule section.
// "continuous" = "Continuously" (runs ~every 30-60 min).
// "daily" = "Daily between X and Y" (dailyFromHour/dailyToHour, 0-23, Jakarta Time).
export type RuleSchedule = "continuous" | "daily";

export interface RuleCondition {
  metric: RuleMetric;
  operator: RuleConditionOperator;
  value: number;
}

export type RulePreset = "content_test" | "cpr_guard" | "custom";

export interface AdRule {
  id: string;
  name: string;
  preset: RulePreset;
  enabled: boolean;
  accountIds: string[];      // which ad accounts this rule applies to
  conditions: RuleCondition[];
  action: RuleAction;
  level: RuleLevel;
  timeWindow: RuleTimeWindow;
  // Matches Meta's native "Schedule" section. Defaults to "continuous" when absent
  // (keeps old persisted rules, which predate this field, working unchanged).
  schedule?: RuleSchedule;
  dailyFromHour?: number; // 0-23, only used when schedule === "daily"
  dailyToHour?: number;   // 0-23, only used when schedule === "daily"
  // Matches Meta's native "Notification → On Facebook" checkbox.
  notifyOnFacebook?: boolean;
  createdAt: string;
  updatedAt: string;
  // Result tracking
  lastRunAt?: string | null;
  lastResult?: string | null;
  triggeredCount?: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApplyRuleResult {
  ruleId: string;
  ruleName: string;
  affectedItems: {
    id: string;
    name: string;
    accountId: string;
    metric: string;
    metricValue: number;
    action: string;
    success: boolean;
    error?: string;
  }[];
  triggeredCount: number;
  runAt: string;
}