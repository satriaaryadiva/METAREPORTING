import { CustomRule, Mapping } from "@/types/report";

export function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function usd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function rupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  })}`;
}

export function getGroupDisplayName(
  group: string,
  mapping: Mapping[],
  customRules: CustomRule[]
): string {
  if (group === "UNMAPPED") return "UNMAPPED";

  if (group.startsWith("CUSTOM::")) {
    const id = group.slice("CUSTOM::".length);
    return customRules.find((item) => item.id === id)?.name || "CUSTOM";
  }

  return mapping.find((item) => item.pCode === group)?.name || "UNMAPPED";
}

export function getGroupSubtitle(
  group: string,
  customRules: CustomRule[]
): string {
  if (group === "UNMAPPED") return "UNMAPPED";

  if (group.startsWith("CUSTOM::")) {
    const id = group.slice("CUSTOM::".length);
    const rule = customRules.find((item) => item.id === id);
    return rule ? `KATA KUNCI: ${rule.keyword.toUpperCase()}` : "CUSTOM";
  }

  return group;
}

export function getGroupBadgeColor(group: string): string {
  if (group === "UNMAPPED") return "bg-slate-700";
  if (group.startsWith("CUSTOM::")) return "bg-emerald-600";
  return "bg-[#4F81BD]";
}
