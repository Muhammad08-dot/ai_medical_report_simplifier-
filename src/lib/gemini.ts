import { createFallbackReport, disclaimer, type Finding, type FindingStatus, type GlossaryTerm, type SimplifiedReport, type VerificationDetails, type VerifiedSource } from "@/lib/report-data";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{
        web?: {
          uri?: string;
          title?: string;
        };
      }>;
    };
  }>;
};

const validStatuses = new Set<FindingStatus>(["normal", "borderline", "abnormal", "critical"]);
const validRiskLevels = new Set<SimplifiedReport["riskLevel"]>(["low", "moderate", "high", "critical"]);

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 1600) : fallback;
}

function cleanStringList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const values = value.map((item) => cleanString(item)).filter(Boolean).slice(0, 8);
  return values.length ? values : fallback;
}

function validateReport(value: unknown, fallback: SimplifiedReport): SimplifiedReport | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.findings) || !Array.isArray(raw.glossary)) return null;

  const findings: Finding[] = raw.findings
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      parameter: cleanString(item.parameter),
      value: cleanString(item.value),
      referenceRange: cleanString(item.referenceRange, "Not listed"),
      status: validStatuses.has(item.status as FindingStatus) ? (item.status as FindingStatus) : "borderline",
      explanation: cleanString(item.explanation),
    }))
    .filter((item) => item.parameter && item.value && item.explanation)
    .slice(0, 16);

  const glossary: GlossaryTerm[] = raw.glossary
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ term: cleanString(item.term), definition: cleanString(item.definition) }))
    .filter((item) => item.term && item.definition)
    .slice(0, 18);

  if (!findings.length || !glossary.length) return null;

  return {
    reportType: cleanString(raw.reportType, fallback.reportType),
    overview: cleanString(raw.overview, fallback.overview),
    keyFindings: cleanStringList(raw.keyFindings, fallback.keyFindings),
    whatsNormal: cleanString(raw.whatsNormal, fallback.whatsNormal),
    needsAttention: cleanString(raw.needsAttention, fallback.needsAttention),
    bottomLine: cleanString(raw.bottomLine, fallback.bottomLine),
    suggestedActions: cleanStringList(raw.suggestedActions, fallback.suggestedActions),
    findings,
    glossary,
    riskLevel: validRiskLevels.has(raw.riskLevel as SimplifiedReport["riskLevel"])
      ? (raw.riskLevel as SimplifiedReport["riskLevel"])
      : fallback.riskLevel,
    disclaimer,
    analysisReferences: cleanStringList(raw.analysisReferences, fallback.analysisReferences),
  };
}

function parseJson(text: string) {
  const unwrapped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(unwrapped) as unknown;
}

export async function simplifyWithGemini(extractedText: string): Promise<SimplifiedReport | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !extractedText.trim()) return null;

  const fallback = createFallbackReport(extractedText);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14_000);

  try {
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: `You simplify medical report text into clear informational language. You do not diagnose, give medical advice, infer missing values, or omit uncertainty. Use a calm 6th-grade reading level. State that a clinician should interpret results in context. Return ONLY valid JSON with this exact shape: {"reportType":"string","overview":"string","keyFindings":["string"],"whatsNormal":"string","needsAttention":"string","bottomLine":"string","suggestedActions":["string"],"findings":[{"parameter":"string","value":"string","referenceRange":"string","status":"normal|borderline|abnormal|critical","explanation":"string"}],"glossary":[{"term":"string","definition":"string"}],"riskLevel":"low|moderate|high|critical","analysisReferences":["string"]}. For 'analysisReferences', provide 2-3 reputable clinical guidelines, medical associations, or standard laboratory reference manuals supporting the analysis of this report's tests. Do not call a value critical unless the source explicitly indicates it is urgent or critical.`
          }]
        },
        contents: [{
          role: "user",
          parts: [{
            text: `Medical report text:\n\n${extractedText.slice(0, 30_000)}`
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      }),
    });

    if (!response.ok) {
      console.error("Gemini API Error:", await response.text());
      return null;
    }
    const payload = (await response.json()) as GeminiResponse;
    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;
    return validateReport(parseJson(content), fallback);
  } catch (error) {
    console.error("Fetch Error:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyFindingWithRAG(
  parameter: string,
  value: string,
  referenceRange: string
): Promise<VerificationDetails> {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallback: VerificationDetails = {
    consensusRange: referenceRange || "Not specified",
    medicalConsensus: "No active search confirmation could be retrieved. Standard values may vary depending on the testing laboratory's equipment and methodologies.",
    verifiedSources: [],
    searchQuery: `${parameter} standard reference range`,
  };

  if (!apiKey) return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: `You are a medical researcher verifying lab results. Find the standard medical reference ranges and clinical guidelines for the parameter provided. Respond ONLY in valid JSON format matching this schema: {"consensusRange": "string describing standard consensus range, e.g. 4.0 - 11.0 k/uL", "medicalConsensus": "1-2 sentences of patient-friendly clinical consensus about what this measures and guidelines"}. Do not include markdown formatting or backticks.`
          }]
        },
        contents: [{
          role: "user",
          parts: [{
            text: `Parameter Name: "${parameter}"\nPatient's Lab Value: "${value}"\nLab's Reference Range: "${referenceRange}"`
          }]
        }],
        tools: [{
          googleSearch: {}
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      console.error("Gemini RAG Verification Error:", await response.text());
      return fallback;
    }

    const payload = (await response.json()) as GeminiResponse;
    const candidate = payload.candidates?.[0];
    const contentText = candidate?.content?.parts?.[0]?.text;
    
    if (!contentText) return fallback;

    let parsed: { consensusRange?: string; medicalConsensus?: string } = {};
    try {
      parsed = parseJson(contentText) as any;
    } catch {
      parsed = {
        consensusRange: referenceRange,
        medicalConsensus: contentText.slice(0, 300)
      };
    }

    const grounding = candidate?.groundingMetadata;
    const verifiedSources: VerifiedSource[] = [];
    if (grounding?.groundingChunks) {
      for (const chunk of grounding.groundingChunks) {
        if (chunk.web?.uri) {
          verifiedSources.push({
            title: chunk.web.title || "Medical Resource",
            url: chunk.web.uri
          });
        }
      }
    }

    const searchQuery = grounding?.webSearchQueries?.[0] || `${parameter} standard reference range`;

    return {
      consensusRange: cleanString(parsed.consensusRange, referenceRange || "Not specified"),
      medicalConsensus: cleanString(parsed.medicalConsensus, "Standard reference range verified via Google Search."),
      verifiedSources: verifiedSources.slice(0, 3),
      searchQuery: cleanString(searchQuery, `${parameter} standard reference range`)
    };
  } catch (error) {
    console.error("RAG Verification Fetch Error:", error);
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

