"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CampaignAccountGroup,
  CampaignRawRow,
  CampaignReportSettings,
  CampaignStatus,
  CrmRawRow,
  MergedCampaignRow,
} from "@/types/campaign-report";
import { AutoSyncSettings } from "@/types/sync";
import {
  generateSampleCampaignData,
  mergeCampaignAndCrmData,
} from "@/lib/campaign-parser";
import {
  captureCampaignScreenshot,
  exportCampaignExcel,
} from "@/lib/campaign-exporter";

import Navbar from "@/components/layout/Navbar";
import CampaignUploadSection from "./CampaignUploadSection";
import CampaignSettingsCard from "./CampaignSettingsCard";
import CampaignReportTable from "./CampaignReportTable";
import CampaignSyncModal from "./CampaignSyncModal";

interface CampaignReportAppProps {
  activeTab?: "account" | "campaign";
  onTabChange?: (tab: "account" | "campaign") => void;
}

const DEFAULT_SYNC_SETTINGS: AutoSyncSettings = {
  meta: {
    enabled: true,
    accessToken: "",
    adAccountIds: [],
    datePreset: "today",
  },
  irev: {
    enabled: true,
    endpointUrl: "",
    apiKey: "",
    partnerId: "",
  },
  intervalMinutes: 10,
  isAutoSyncActive: false,
  lastSyncedAt: null,
  syncStatus: "idle",
  lastError: null,
  lastMetaCount: 0,
  lastIrevCount: 0,
};

export default function CampaignReportApp({
  activeTab = "campaign",
  onTabChange,
}: CampaignReportAppProps) {
  // Raw Data State
  const [metaRows, setMetaRows] = useState<CampaignRawRow[]>([]);
  const [metaFileNames, setMetaFileNames] = useState<string[]>([]);
  const [crmRows, setCrmRows] = useState<CrmRawRow[]>([]);
  const [crmFileName, setCrmFileName] = useState("");
  const [error, setError] = useState("");

  // Settings State
  const [settings, setSettings] = useState<CampaignReportSettings>({
    reportTitle: "REPORT HWGASPOL",
    reportDate: "3 september 2026",
    rate: 18000,
    taxFeePercent: 4,
    defaultBudget: 1000,
  });

  // Manual Overrides State
  const [rowOverrides, setRowOverrides] = useState<
    Record<string, Partial<MergedCampaignRow>>
  >({});

  // Auto-Sync Modal & Config State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [autoSyncSettings, setAutoSyncSettings] = useState<AutoSyncSettings>(DEFAULT_SYNC_SETTINGS);

  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load AutoSync Settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("meta_report_autosync_settings");
      if (saved) {
        setAutoSyncSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load auto-sync settings", e);
    }
  }, []);

  const handleUpdateSyncSettings = (updated: Partial<AutoSyncSettings>) => {
    setAutoSyncSettings((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem("meta_report_autosync_settings", JSON.stringify(next));
      } catch (e) {
        console.error("Failed to persist auto-sync settings", e);
      }
      return next;
    });
  };

  // Data Synced via API callback
  const handleDataSynced = (
    newMetaRows: CampaignRawRow[],
    newCrmRows: CrmRawRow[],
    sourceInfo: string
  ) => {
    if (newMetaRows.length > 0) {
      setMetaRows(newMetaRows);
      setMetaFileNames([`[API Live] Meta Ads (${newMetaRows.length} Campaign)`]);
    }
    if (newCrmRows.length > 0) {
      setCrmRows(newCrmRows);
      setCrmFileName(`[API Live] iRev CRM (${newCrmRows.length} Ref Codes)`);
    }
    setError("");
  };

  // Merge Data whenever metaRows, crmRows, settings, or rowOverrides change
  const groups = useMemo<CampaignAccountGroup[]>(() => {
    if (!metaRows.length) return [];
    return mergeCampaignAndCrmData(metaRows, crmRows, settings, rowOverrides);
  }, [metaRows, crmRows, settings, rowOverrides]);

  const handleUpdateRow = (
    rowId: string,
    updates: Partial<MergedCampaignRow>
  ) => {
    setRowOverrides((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        ...updates,
      },
    }));
  };

  const handleLoadSample = () => {
    const { campaigns, crmData } = generateSampleCampaignData();
    setMetaRows(campaigns);
    setMetaFileNames(["SAMPLE_META_ADS_CAMPAIGN.xlsx"]);
    setCrmRows(crmData);
    setCrmFileName("SAMPLE_CRM_REF_DEPOSIT.xlsx");
    setRowOverrides({});
    setError("");
  };

  const handleClearData = () => {
    setMetaRows([]);
    setMetaFileNames([]);
    setCrmRows([]);
    setCrmFileName("");
    setRowOverrides({});
    setError("");
  };

  const handleMetaAppend = (rows: CampaignRawRow[], fileName: string) => {
    setMetaRows((prev) => [...prev, ...rows]);
    setMetaFileNames((prev) =>
      prev.includes(fileName) ? prev : [...prev, fileName]
    );
  };

  const handleMetaReplace = (rows: CampaignRawRow[], fileName: string) => {
    setMetaRows(rows);
    setMetaFileNames([fileName]);
  };

  const handleScreenshot = async () => {
    if (!reportRef.current) return;
    setIsScreenshotting(true);
    try {
      await captureCampaignScreenshot(reportRef.current, settings);
    } finally {
      setIsScreenshotting(false);
    }
  };

  const handleExportExcel = () => {
    exportCampaignExcel(groups, settings);
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] pb-16 font-sans">
      <div className="mx-auto w-full max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          onTabChange={onTabChange}
          onScreenshot={handleScreenshot}
          onExportExcel={handleExportExcel}
          isScreenshotting={isScreenshotting}
          hasData={groups.length > 0}
        />

        {/* Live Auto-Sync Notification / Quick Trigger Strip */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-2.5 w-2.5 rounded-full ${
                autoSyncSettings.isAutoSyncActive
                  ? "bg-emerald-500 animate-ping"
                  : "bg-slate-300"
              }`}
            />
            <div>
              <span className="text-xs font-black text-slate-800">
                {autoSyncSettings.isAutoSyncActive
                  ? `🟢 Auto-Sync Aktif (Tarik data tiap ${autoSyncSettings.intervalMinutes} menit)`
                  : "⚪ Auto-Sync Nonaktif"}
              </span>
              {autoSyncSettings.lastSyncedAt && (
                <span className="ml-2 text-[11px] text-slate-400 font-medium">
                  Terakhir:{" "}
                  {new Date(autoSyncSettings.lastSyncedAt).toLocaleTimeString(
                    "id-ID",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
            >
              <span>⚙️ Pengaturan API Meta & iRev</span>
            </button>
          </div>
        </div>

        {/* Configuration & Upload Grid */}
        <div className="mb-6 space-y-4">
          <CampaignUploadSection
            metaFileNames={metaFileNames}
            crmFileName={crmFileName}
            metaRows={metaRows}
            crmRows={crmRows}
            onMetaAppend={handleMetaAppend}
            onMetaReplace={handleMetaReplace}
            onCrmLoaded={(rows, name) => {
              setCrmRows(rows);
              setCrmFileName(name);
            }}
            onClearData={handleClearData}
            onLoadSample={handleLoadSample}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            error={error}
            setError={setError}
          />

          <CampaignSettingsCard
            settings={settings}
            onChange={(updated) =>
              setSettings((prev) => ({ ...prev, ...updated }))
            }
          />
        </div>

        {/* Campaign Report Table */}
        <CampaignReportTable
          groups={groups}
          settings={settings}
          onUpdateRow={handleUpdateRow}
          reportRef={reportRef}
        />

        {/* Auto-Sync Configuration Modal */}
        <CampaignSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          onDataSynced={handleDataSynced}
          autoSyncSettings={autoSyncSettings}
          onUpdateSettings={handleUpdateSyncSettings}
        />
      </div>
    </main>
  );
}
