export type Row = {
  account: string;
  spent: number;
};

export type GroupedRow = Row & {
  group: string;
};

export type Mapping = {
  id: string;
  pCode: string;
  name: string;
};

export type CustomRule = {
  id: string;
  keyword: string;
  name: string;
};

export type Merge = {
  id: string;
  name: string;
  codes: string[];
};

export type Card =
  | { kind: "single"; code: string }
  | { kind: "merge"; merge: Merge };

export type ReportTotals = {
  totalSpending: number;
  totalFee: number;
  totalWithFee: number;
  totalRP: number;
};
