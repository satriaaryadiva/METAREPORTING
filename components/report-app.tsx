"use client";

import React, { useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CustomRule, GroupedRow, Mapping, Merge, Row } from "@/types/report";
import {
  getGroupDisplayName,
  getGroupSubtitle,
  getGroupBadgeColor,
  normalize,
} from "@/lib/utils";
import { detectGroup, parseRawExcelFile } from "@/lib/parser";
import { captureHDReportScreenshot, exportExcelReport } from "@/lib/exporter";

import Navbar from "@/components/layout/Navbar";
import AuthScreen from "@/components/auth/AuthScreen";
import RawUploadCard from "@/components/settings/RawUploadCard";
import GeneralSettingsCard from "@/components/settings/GeneralSettingsCard";
import MappingCard from "@/components/settings/MappingCard";
import CustomRulesCard from "@/components/settings/CustomRulesCard";

import SummaryCards from "@/components/report/SummaryCards";
import ReportControls from "@/components/report/ReportControls";
import MergeToolbar from "@/components/report/MergeToolbar";
import SingleReportCard from "@/components/report/SingleReportCard";
import MergeReportCard from "@/components/report/MergeReportCard";
import GrandTotalCard from "@/components/report/GrandTotalCard";
import CampaignReportApp from "@/components/campaign/CampaignReportApp";

const DEFAULT_MAPPING: Mapping[] = [
  { id: "1", pCode: "P9", name: "ROBERT" },
  { id: "2", pCode: "P10", name: "IZAD" },
  { id: "3", pCode: "P6", name: "CHIP" },
  { id: "4", pCode: "P4", name: "VT" },
];

const DEFAULT_CUSTOM_RULES: CustomRule[] = [];

export default function ReportApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"account" | "campaign">("account");

  // Raw Data & Error State
  const [rawRows, setRawRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  // Settings State
  const [mapping, setMapping] = useState<Mapping[]>(DEFAULT_MAPPING);
  const [customRules, setCustomRules] = useState<CustomRule[]>(DEFAULT_CUSTOM_RULES);
  const [fee, setFee] = useState(3);
  const [rate, setRate] = useState(18000);
  const [period, setPeriod] = useState("");

  // View & Transformation State
  const [sortBySpent, setSortBySpent] = useState(true);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [merges, setMerges] = useState<Merge[]>([]);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [mergeName, setMergeName] = useState("");
  const [customCardOrder, setCustomCardOrder] = useState<string[]>([]);

  // Inline Editing State
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // Export & Action State
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  /*
  |--------------------------------------------------------------------------
  | GROUPED ROWS
  |--------------------------------------------------------------------------
  */
  const rows: GroupedRow[] = useMemo(() => {
    return rawRows.map((row) => ({
      ...row,
      group: detectGroup(row.account, customRules),
    }));
  }, [rawRows, customRules]);

  /*
  |--------------------------------------------------------------------------
  | GROUPS CALCULATION
  |--------------------------------------------------------------------------
  */
  const groups = useMemo(() => {
    const codes = new Set<string>();
    rows.forEach((row) => codes.add(row.group));

    const codesArray = Array.from(codes);

    const pCodeGroups = codesArray.filter(
      (code) => code !== "UNMAPPED" && !code.startsWith("CUSTOM::")
    );

    const customGroups = codesArray.filter((code) =>
      code.startsWith("CUSTOM::")
    );

    const hasUnmapped = codesArray.includes("UNMAPPED");

    pCodeGroups.sort((a, b) => {
      const aNumber = Number(a.replace("P", "")) || 999999;
      const bNumber = Number(b.replace("P", "")) || 999999;
      return aNumber - bNumber;
    });

    customGroups.sort((a, b) =>
      getGroupDisplayName(a, mapping, customRules).localeCompare(
        getGroupDisplayName(b, mapping, customRules)
      )
    );

    return [
      ...pCodeGroups,
      ...customGroups,
      ...(hasUnmapped ? ["UNMAPPED"] : []),
    ];
  }, [rows, mapping, customRules]);

  /*
  |--------------------------------------------------------------------------
  | CARDS (Flatten single & merged)
  |--------------------------------------------------------------------------
  */
  const cards = useMemo<Card[]>(() => {
    const mergedCodes = new Set(merges.flatMap((m) => m.codes));
    const addedMergeIds = new Set<string>();
    const result: Card[] = [];

    for (const group of groups) {
      if (hiddenGroups.includes(group)) continue;
      if (mergedCodes.has(group)) {
        const merge = merges.find((m) => m.codes.includes(group))!;
        if (!addedMergeIds.has(merge.id)) {
          result.push({ kind: "merge", merge });
          addedMergeIds.add(merge.id);
        }
        continue;
      }
      result.push({ kind: "single", code: group });
    }

    return result;
  }, [groups, hiddenGroups, merges]);

  const orderedCards = useMemo<Card[]>(() => {
    if (!customCardOrder.length) return cards;
    const cardMap = new Map<string, Card>();
    cards.forEach((c) => {
      const key = c.kind === "single" ? c.code : c.merge.id;
      cardMap.set(key, c);
    });
    const ordered: Card[] = [];
    customCardOrder.forEach((key) => {
      if (cardMap.has(key)) {
        ordered.push(cardMap.get(key)!);
        cardMap.delete(key);
      }
    });
    cardMap.forEach((c) => ordered.push(c));
    return ordered;
  }, [cards, customCardOrder]);

  /*
  |--------------------------------------------------------------------------
  | TOTALS
  |--------------------------------------------------------------------------
  */
  const totalSpending = useMemo(() => {
    return rows
      .filter((row) => !hiddenGroups.includes(row.group))
      .reduce((sum, row) => sum + row.spent, 0);
  }, [rows, hiddenGroups]);

  const totalFee = totalSpending * (fee / 100);
  const totalWithFee = totalSpending + totalFee;
  const totalRP = totalWithFee * rate;

  /*
  |--------------------------------------------------------------------------
  | EVENT HANDLERS
  |--------------------------------------------------------------------------
  */

  // Upload handler
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      setFileName(file.name);
      const parsed = await parseRawExcelFile(file);
      setRawRows(parsed);
    } catch (err) {
      console.error(err);
      setRawRows([]);
      setError(err instanceof Error ? err.message : "Gagal membaca file.");
    }
  };

  // Mapping handlers
  const handleAddMapping = (pCode: string, name: string) => {
    const formattedPCode = pCode.toUpperCase().startsWith("P")
      ? pCode.toUpperCase()
      : `P${pCode.toUpperCase()}`;

    if (mapping.some((item) => item.pCode === formattedPCode)) {
      alert(`${formattedPCode} sudah ada.`);
      return;
    }

    setMapping((prev) => [
      ...prev,
      { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), pCode: formattedPCode, name },
    ]);
  };

  const handleUpdateMappingPCode = (id: string, pCode: string) => {
    let value = pCode.toUpperCase().replace(/\s/g, "");
    if (value && !value.startsWith("P")) value = `P${value}`;

    setMapping((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pCode: value } : item))
    );
  };

  const handleUpdateMappingName = (id: string, name: string) => {
    setMapping((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  const handleDeleteMapping = (id: string) => {
    setMapping((prev) => prev.filter((item) => item.id !== id));
  };

  // Custom rules handlers
  const handleAddCustomRule = (keyword: string, name: string) => {
    const exists = customRules.some(
      (item) => normalize(item.keyword) === normalize(keyword)
    );

    if (exists) {
      alert(`Kata kunci "${keyword}" sudah ada.`);
      return;
    }

    setCustomRules((prev) => [
      ...prev,
      { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), keyword, name },
    ]);
  };

  const handleUpdateCustomRuleKeyword = (id: string, keyword: string) => {
    setCustomRules((prev) =>
      prev.map((item) => (item.id === id ? { ...item, keyword } : item))
    );
  };

  const handleUpdateCustomRuleName = (id: string, name: string) => {
    setCustomRules((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  const handleDeleteCustomRule = (id: string) => {
    setCustomRules((prev) => prev.filter((item) => item.id !== id));
  };

  // Hide & Merge handlers
  const handleHideGroup = (code: string) => {
    setHiddenGroups((prev) => [...prev, code]);
    setMerges((prev) =>
      prev
        .map((m) => ({ ...m, codes: m.codes.filter((c) => c !== code) }))
        .filter((m) => m.codes.length >= 2)
    );
  };

  const handleToggleMergeSelect = (code: string) => {
    setSelectedGroups((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleConfirmMerge = () => {
    if (selectedGroups.length < 2) {
      alert("Pilih minimal 2 tabel untuk di-merge.");
      return;
    }
    const name =
      mergeName.trim() ||
      selectedGroups
        .map((c) => getGroupDisplayName(c, mapping, customRules))
        .join(" + ");

    setMerges((prev) => [
      ...prev,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        name,
        codes: [...selectedGroups],
      },
    ]);
    setSelectedGroups([]);
    setMergeName("");
    setMergeMode(false);
  };

  const handleDeleteMerge = (id: string) => {
    setMerges((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCancelMerge = () => {
    setMergeMode(false);
    setSelectedGroups([]);
    setMergeName("");
  };

  // Name inline editing
  const handleStartEditName = (key: string, currentName: string) => {
    setEditingName(key);
    setEditingNameValue(currentName);
  };

  const handleCommitEditName = (key: string) => {
    const newName = editingNameValue.trim();
    setEditingName(null);
    if (!newName) return;

    if (merges.some((m) => m.id === key)) {
      setMerges((prev) =>
        prev.map((m) => (m.id === key ? { ...m, name: newName } : m))
      );
      return;
    }

    if (key.startsWith("CUSTOM::")) {
      const id = key.slice("CUSTOM::".length);
      setCustomRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, name: newName } : r))
      );
      return;
    }

    setMapping((prev) =>
      prev.map((m) => (m.pCode === key ? { ...m, name: newName } : m))
    );
  };

  // Card reordering
  const handleMoveCard = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedCards.length) return;
    const currentKeys = orderedCards.map((c) =>
      c.kind === "single" ? c.code : c.merge.id
    );
    const temp = currentKeys[index];
    currentKeys[index] = currentKeys[targetIndex];
    currentKeys[targetIndex] = temp;
    setCustomCardOrder(currentKeys);
  };

  // Actions
  const handleScreenshot = () => {
    captureHDReportScreenshot(reportRef.current, setIsScreenshotting);
  };

  const handleExportExcel = () => {
    exportExcelReport({
      rows,
      orderedCards,
      mapping,
      customRules,
      fee,
      rate,
      period,
      sortBySpent,
      totalSpending,
      totalFee,
      totalWithFee,
      totalRP,
    });
  };

  // If Campaign Tab is active, render CampaignReportApp
  if (activeTab === "campaign") {
    return (
      <CampaignReportApp
        activeTab="campaign"
        onTabChange={setActiveTab}
      />
    );
  }

  // 4. Authenticated: Render the full Account Dashboard
  return (
    <main className="min-h-screen bg-[#f4f7fb] py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6">
        {/* TOP NAVBAR */}
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onScreenshot={handleScreenshot}
          onExportExcel={handleExportExcel}
          isScreenshotting={isScreenshotting}
          hasData={rows.length > 0}
        />

        {/* SETTINGS CARDS GRID */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <RawUploadCard
            onUpload={handleUpload}
            fileName={fileName}
            rowCount={rows.length}
            error={error}
          />

          <GeneralSettingsCard
            period={period}
            setPeriod={setPeriod}
            fee={fee}
            setFee={setFee}
            rate={rate}
            setRate={setRate}
          />

          <MappingCard
            mapping={mapping}
            onAddMapping={handleAddMapping}
            onUpdatePCode={handleUpdateMappingPCode}
            onUpdateName={handleUpdateMappingName}
            onDeleteMapping={handleDeleteMapping}
          />

          <CustomRulesCard
            customRules={customRules}
            onAddRule={handleAddCustomRule}
            onUpdateKeyword={handleUpdateCustomRuleKeyword}
            onUpdateName={handleUpdateCustomRuleName}
            onDeleteRule={handleDeleteCustomRule}
          />
        </div>

        {/* REPORT SECTION */}
        <div ref={reportRef} className="mt-5 w-full bg-[#f4f7fb] p-1 sm:p-2">
          {/* SUMMARY CARDS */}
          <SummaryCards
            totalSpending={totalSpending}
            totalFee={totalFee}
            totalWithFee={totalWithFee}
            totalRP={totalRP}
            fee={fee}
            rate={rate}
          />

          {/* REPORT CONTROLS HEADER */}
          <ReportControls
            period={period}
            sortBySpent={sortBySpent}
            onToggleSort={() => setSortBySpent((prev) => !prev)}
            tableCount={orderedCards.length}
            mergeMode={mergeMode}
            onEnterMergeMode={() => setMergeMode(true)}
          />

          {/* MERGE SELECTION TOOLBAR */}
          {mergeMode && (
            <MergeToolbar
              selectedCount={selectedGroups.length}
              mergeName={mergeName}
              setMergeName={setMergeName}
              onConfirmMerge={handleConfirmMerge}
              onCancelMerge={handleCancelMerge}
            />
          )}

          {/* REPORT CARDS GRID CONTAINER (Menyamping / Horizontal Grid) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
            {orderedCards.map((card, index) => {
              if (card.kind === "single") {
                const group = card.code;
                const items = rows.filter((row) => row.group === group);
                const tableName = getGroupDisplayName(group, mapping, customRules);
                const subtitle = getGroupSubtitle(group, customRules);
                const badgeColor = getGroupBadgeColor(group);
                const isSelected = selectedGroups.includes(group);

                return (
                  <SingleReportCard
                    key={group}
                    group={group}
                    items={items}
                    sortBySpent={sortBySpent}
                    fee={fee}
                    rate={rate}
                    tableName={tableName}
                    subtitle={subtitle}
                    badgeColor={badgeColor}
                    mergeMode={mergeMode}
                    isSelected={isSelected}
                    index={index}
                    totalCards={orderedCards.length}
                    isEditingName={editingName === group}
                    editingNameValue={editingNameValue}
                    onToggleMergeSelect={handleToggleMergeSelect}
                    onStartEditName={handleStartEditName}
                    onCommitEditName={handleCommitEditName}
                    onSetEditingNameValue={setEditingNameValue}
                    onCancelEditName={() => setEditingName(null)}
                    onMoveCard={handleMoveCard}
                    onHideGroup={handleHideGroup}
                  />
                );
              }

              // MERGE CARD
              const { merge } = card;
              const mergeItems = merge.codes.flatMap((code) =>
                rows.filter((row) => row.group === code)
              );
              const subtitleList = merge.codes
                .map((c) => getGroupDisplayName(c, mapping, customRules))
                .join(" + ");

              return (
                <MergeReportCard
                  key={merge.id}
                  merge={merge}
                  items={mergeItems}
                  sortBySpent={sortBySpent}
                  fee={fee}
                  rate={rate}
                  subtitleList={subtitleList}
                  index={index}
                  totalCards={orderedCards.length}
                  isEditingName={editingName === merge.id}
                  editingNameValue={editingNameValue}
                  onStartEditName={handleStartEditName}
                  onCommitEditName={handleCommitEditName}
                  onSetEditingNameValue={setEditingNameValue}
                  onCancelEditName={() => setEditingName(null)}
                  onMoveCard={handleMoveCard}
                  onDeleteMerge={handleDeleteMerge}
                />
              );
            })}
          </div>

          {/* GRAND TOTAL SUMMARY FOOTER */}
          <GrandTotalCard
            totalSpending={totalSpending}
            totalFee={totalFee}
            totalRP={totalRP}
          />
        </div>
      </div>
    </main>
  );
}