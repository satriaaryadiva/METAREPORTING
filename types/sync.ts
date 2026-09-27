export interface MetaApiConfig {
  enabled: boolean;
  accessToken: string;
  adAccountIds: string[]; // e.g. ["act_123456789", "act_987654321"]
  datePreset?: "today" | "yesterday" | "last_3d" | "last_7d" | "this_month" | "last_month" | "maximum";
  timeIncrement?: string; // e.g. "1" or "all_days"
}

export interface IrevApiConfig {
  enabled: boolean;
  endpointUrl: string; // e.g. "https://api.irev.com/v1/reports/affiliates" or custom CRM endpoint
  apiKey: string;
  partnerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AutoSyncSettings {
  meta: MetaApiConfig;
  irev: IrevApiConfig;
  intervalMinutes: number; // default: 10
  isAutoSyncActive: boolean;
  lastSyncedAt: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  lastError: string | null;
  lastMetaCount: number;
  lastIrevCount: number;
}
