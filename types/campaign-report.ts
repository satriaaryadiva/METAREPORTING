export type CampaignRawRow = {
  id: string;
  account: string;
  accountId?: string; // ID Ad Account dari Meta Ads
  campaignName: string;
  spent: number;
  results: number;
  extractedRef: string;
  deliveryStatus?: CampaignStatus;
};

export type CrmRawRow = {
  id: string;
  groupCode: string;
  registrations: number;
  ndp: number;
  ftdDepositSum?: number;
  depositsCount?: number;
  depositAmount?: number;
};

// Status delivery sesuai Meta Ads Manager (Campaign Delivery column)
export type CampaignStatus =
  | "Active"
  | "Not delivering"
  | "Not approved"
  | "Inactive"
  | "Deleted"
  | "Completed"
  | "Scheduled"
  | "In draft"
  | "DISABLE"
  | "OFF"
  | string;

export type MergedCampaignRow = {
  id: string;
  account: string;
  accountId?: string; // ID Ad Account
  campaignName: string;
  budget: number;
  spent: number;
  spentTaxRp: number;
  results: number;
  cphUsd: number | null; // CPH (Rp) / CPR ($): spent / results
  cphTaxRp: number | null; // CPH + TAX (Rp): spentTaxRp / results
  regis: number;
  ndp: number;
  cprRefRp: number | null; // CPR REF: spentTaxRp / regis
  cpdRefRp: number | null; // CPD REF: spentTaxRp / ndp
  status: CampaignStatus;
  refCode: string;
};

export type CampaignAccountGroup = {
  account: string;
  accountId?: string; // ID Ad Account
  items: MergedCampaignRow[];
  totalSpent: number;
  totalSpentTaxRp: number;
  totalResults: number;
  totalRegis: number;
  totalNdp: number;
};

export type CampaignReportSettings = {
  reportTitle: string;
  reportDate: string;
  rate: number; // Kurs USD -> IDR, default 18000
  taxFeePercent: number; // Tax/Fee %, default 4% (so 18000 * 1.04 = 18720)
  defaultBudget: number; // Default budget in USD, default 1000
};
