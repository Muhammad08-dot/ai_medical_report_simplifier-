import { getAdminDb, REPORTS_COLLECTION } from "@/lib/firebase-admin";
import type { ReportRecord } from "@/lib/report-record";
import type { SimplifiedReport } from "@/lib/report-data";
import { DocumentFormattingAgent } from "@/lib/agents/document-agent";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const snap = await getAdminDb().collection(REPORTS_COLLECTION).doc(id).get();

  if (!snap.exists) {
    return Response.json({ error: "This report is no longer available." }, { status: 404 });
  }

  const record = snap.data() as ReportRecord;
  if (!record.summaryJson || record.expiresAt.toDate() < new Date()) {
    return Response.json({ error: "This report is no longer available." }, { status: 404 });
  }

  const report = record.summaryJson as unknown as SimplifiedReport;
  
  const { searchParams } = new URL(_request.url);
  const format = searchParams.get("format") || "pdf";

  // Call the Document Formatting Subagent to generate the format
  let body: Buffer;
  try {
    body = DocumentFormattingAgent.formatReport(format, report, record.fileName);
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to generate format." }, { status: 400 });
  }

  // Orchestrator "sees his work" (reviews the buffer for structural validity and size)
  const review = DocumentFormattingAgent.reviewDocumentBuffer(body, format);
  if (!review.isValid) {
    console.error(`Orchestrator verification failed for subagent's ${format} work: ${review.reason}`);
    return Response.json({ error: `Internal format validation failed: ${review.reason}` }, { status: 500 });
  }

  console.log(`Orchestrator validated subagent's ${format.toUpperCase()} work successfully: ${review.sizeBytes} bytes.`);

  let contentType = "application/pdf";
  let extension = "pdf";

  if (format === "word" || format === "doc") {
    contentType = "application/msword";
    extension = "doc";
  } else if (format === "ppt" || format === "powerpoint") {
    contentType = "application/vnd.ms-powerpoint";
    extension = "ppt";
  }

  const attachmentName = `${record.fileName.replace(/\.[^.]+$/, "") || "medical-report"}-simplified.${extension}`;

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${attachmentName.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
