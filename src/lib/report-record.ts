import type { Timestamp } from "@/lib/firebase-admin";
import type { SimplifiedReport } from "@/lib/report-data";

export type RiskLevel = SimplifiedReport["riskLevel"];
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export type ReportRecord = {
  fileName: string;
  fileType: string;
  extractedText: string;
  summaryJson: Record<string, unknown>;
  riskLevel: RiskLevel;
  processingStatus: ProcessingStatus;
  processingTimeMs: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
};
