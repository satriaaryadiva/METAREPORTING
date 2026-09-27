import * as XLSX from "xlsx";
import { CustomRule, Row } from "@/types/report";
import { normalize } from "./utils";

export function detectGroup(account: string, customRules: CustomRule[]): string {
  const match = account.match(/\.P(\d+)-/i);

  if (match) {
    return `P${match[1]}`.toUpperCase();
  }

  const normalizedAccount = normalize(account);

  const rule = customRules.find((item) => {
    const keyword = normalize(item.keyword);
    if (!keyword) return false;
    return normalizedAccount.includes(keyword);
  });

  if (rule) {
    return `CUSTOM::${rule.id}`;
  }

  return "UNMAPPED";
}

export function parseAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let valueString = String(value ?? "")
    .replace(/\[.*?\]/g, "")
    .replace(/\$/g, "")
    .replace(/USD/gi, "")
    .replace(/RP/gi, "")
    .replace(/,/g, "")
    .replace(/—/g, "0")
    .replace(/-/g, "0")
    .trim();

  const number = Number(valueString);

  return Number.isFinite(number) ? number : 0;
}

export function findColumn(headers: string[], names: string[]): number {
  return headers.findIndex((header) => names.includes(normalize(header)));
}

export async function parseRawExcelFile(file: File): Promise<Row[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  if (!data.length) {
    throw new Error("File RAW kosong.");
  }

  const headers = (data[0] as unknown[]).map(normalize);

  const accountIndex = findColumn(headers, [
    "account name",
    "account_name",
    "account",
    "ad account name",
    "nama akun",
  ]);

  const spentIndex = findColumn(headers, [
    "amount spent (usd)",
    "amount spent",
    "amount_spent",
    "amount spent usd",
    "spend",
    "spent",
  ]);

  if (accountIndex === -1) {
    throw new Error("Kolom Account Name tidak ditemukan.");
  }

  if (spentIndex === -1) {
    throw new Error("Kolom Amount Spent tidak ditemukan.");
  }

  const parsed: Row[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const account = String(row[accountIndex] ?? "").trim();

    if (!account) continue;
    if (account.toLowerCase().includes("total")) continue;

    const spent = parseAmount(row[spentIndex]);

    parsed.push({ account, spent });
  }

  return parsed;
}
