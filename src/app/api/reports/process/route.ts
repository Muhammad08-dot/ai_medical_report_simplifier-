import { createWorker } from "tesseract.js";
import { getAdminDb, REPORTS_COLLECTION, Timestamp } from "@/lib/firebase-admin";
import { simplifyWithGemini, verifyFindingWithRAG } from "@/lib/gemini";
import { createFallbackReport } from "@/lib/report-data";

export const runtime = "nodejs";

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "text/plain",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function normalizeFileType(file: File) {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/jpeg") return "jpeg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/tiff") return "tiff";
  return "text";
}

function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|tiff?)$/i.test(file.name);
}

async function extractTextFromImage(file: File) {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker("eng", 1, { logger: () => undefined });
    const image = Buffer.from(await file.arrayBuffer());
    const { data } = await worker.recognize(image);
    return data.text.trim().slice(0, 50_000);
  } catch {
    return "";
  } finally {
    if (worker) await worker.terminate();
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const suppliedText = formData.get("extractedText");

    if (!(file instanceof File)) {
      return Response.json({ error: "Please choose a report to process." }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.has(file.type) && !/\.(pdf|jpe?g|png|tiff?|txt)$/i.test(file.name)) {
      return Response.json(
        { error: "Please upload a PDF, JPG, PNG, TIFF, or text report." },
        { status: 415 },
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "Reports must be between 1 byte and 10 MB." }, { status: 413 });
    }

    let extractedText = typeof suppliedText === "string" ? suppliedText.slice(0, 50_000) : "";
    if (!extractedText && (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt"))) {
      extractedText = (await file.text()).slice(0, 50_000);
    }
    if (!extractedText && isImage(file)) {
      extractedText = await extractTextFromImage(file);
    }

    const reportText = `${file.name}\n${extractedText}`;
    const report = (extractedText ? await simplifyWithGemini(reportText) : null) ?? createFallbackReport(reportText);

    // RAG verification step: verify each extracted finding in parallel
    if (report && report.findings && report.findings.length > 0) {
      const verifiedFindings = await Promise.all(
        report.findings.map(async (finding) => {
          try {
            const verification = await verifyFindingWithRAG(
              finding.parameter,
              finding.value,
              finding.referenceRange
            );
            return {
              ...finding,
              verification
            };
          } catch (err) {
            console.error(`Failed to verify finding ${finding.parameter}:`, err);
            return finding;
          }
        })
      );
      report.findings = verifiedFindings;
    }

    const processingTimeMs = Date.now() - startedAt;
    const createdAt = Timestamp.now();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

    const docRef = await getAdminDb().collection(REPORTS_COLLECTION).add({
      fileName: file.name.slice(0, 255),
      fileType: normalizeFileType(file),
      extractedText: extractedText || "No machine-readable text was available from the uploaded document.",
      summaryJson: report as unknown as Record<string, unknown>,
      riskLevel: report.riskLevel,
      processingStatus: "completed",
      processingTimeMs,
      createdAt,
      expiresAt,
    });

    return Response.json({
      reportId: docRef.id,
      status: "completed",
      ...report,
      fileName: file.name,
      createdAt: createdAt.toDate().toISOString(),
      downloadUrl: `/api/reports/${docRef.id}/download`,
    });
  } catch (error) {
    console.error("Unable to process report", error);
    return Response.json(
      { error: "We couldn’t process that report right now. Please try again." },
      { status: 500 },
    );
  }
}
