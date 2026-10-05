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
export type RuleMetric = "spend" | "cpr" | "cpc" | "cpm" | "ctr" | "impressions" | "results";
export type RuleAction = "PAUSE_AD" | "PAUSE_ADSET" | "PAUSE_CAMPAIGN" | "SEND_NOTIFICATION";
export type RuleLevel = "AD" | "ADSET" | "CAMPAIGN";
export type RuleTimeWindow = "today" | "last_3d" | "last_7d" | "this_month";

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
