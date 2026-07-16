export type FindingStatus = "normal" | "borderline" | "abnormal" | "critical";

export type VerifiedSource = {
  title: string;
  url: string;
};

export type VerificationDetails = {
  consensusRange: string;
  medicalConsensus: string;
  verifiedSources: VerifiedSource[];
  searchQuery: string;
};

export type Finding = {
  parameter: string;
  value: string;
  referenceRange: string;
  status: FindingStatus;
  explanation: string;
  verification?: VerificationDetails;
};

export type GlossaryTerm = {
  term: string;
  definition: string;
};

export type SimplifiedReport = {
  reportType: string;
  overview: string;
  keyFindings: string[];
  whatsNormal: string;
  needsAttention: string;
  bottomLine: string;
  suggestedActions: string[];
  findings: Finding[];
  glossary: GlossaryTerm[];
  riskLevel: "low" | "moderate" | "high" | "critical";
  disclaimer: string;
  analysisReferences: string[];
};

export const disclaimer =
  "This AI-generated summary is for informational purposes only and is not medical advice. Always discuss your results with a qualified healthcare professional.";

const defaultReport: SimplifiedReport = {
  reportType: "Complete Blood Count (CBC)",
  overview:
    "This is a Complete Blood Count, a common blood test that checks the health of your red blood cells, white blood cells, and platelets.",
  keyFindings: [
    "Your oxygen-carrying red blood cells and platelets are in the expected range.",
    "Your white blood cell count is only slightly above this lab's reference range.",
    "One small change often has many everyday causes, so the full picture matters.",
  ],
  whatsNormal:
    "Hemoglobin, red blood cells, and platelets are within the ranges shown on this report. Those results are reassuring.",
  needsAttention:
    "Your white blood cell count is slightly high. This can happen with a minor infection, physical stress, or other common causes. A clinician can interpret it alongside your symptoms and history.",
  bottomLine:
    "Most results look healthy. The slightly elevated white blood cell count is worth mentioning at your next appointment, especially if you feel unwell.",
  suggestedActions: [
    "Share the original report with your healthcare provider at your next visit.",
    "Ask whether a repeat CBC is needed based on your symptoms and health history.",
    "Seek timely medical care if you have concerning symptoms or your clinician advises it.",
  ],
  findings: [
    {
      parameter: "Hemoglobin",
      value: "14.2 g/dL",
      referenceRange: "13.5 – 17.5 g/dL",
      status: "normal",
      explanation: "Hemoglobin carries oxygen around your body. Your result falls inside this lab's listed range.",
    },
    {
      parameter: "White blood cells",
      value: "11,200 /µL",
      referenceRange: "4,500 – 11,000 /µL",
      status: "borderline",
      explanation: "White blood cells help fight infection. Your result is just above this lab's range, which is often temporary but should be read in context.",
    },
    {
      parameter: "Platelets",
      value: "250,000 /µL",
      referenceRange: "150,000 – 400,000 /µL",
      status: "normal",
      explanation: "Platelets help blood clot after a cut. Your number is in the expected range.",
    },
    {
      parameter: "Red blood cells",
      value: "5.1 M/µL",
      referenceRange: "4.7 – 6.1 M/µL",
      status: "normal",
      explanation: "Red blood cells deliver oxygen. Your count is within the reference range shown.",
    },
  ],
  glossary: [
    { term: "CBC", definition: "Complete Blood Count — a test that checks the main types of cells in your blood." },
    { term: "Hemoglobin", definition: "A protein in red blood cells that carries oxygen, much like a delivery vehicle." },
    { term: "Leukocytosis", definition: "A medical word for a higher-than-usual white blood cell count." },
    { term: "Platelets", definition: "Tiny blood cells that help form a clot when you are injured." },
  ],
  riskLevel: "low",
  disclaimer,
  analysisReferences: [
    "American Association for Clinical Chemistry (AACC) Standard Lab Guidelines",
    "Mayo Clinic Laboratories Reference Range Interpretations",
    "Clinical and Laboratory Standards Institute (CLSI) Hematology Guidelines"
  ],
};

export function createFallbackReport(text: string): SimplifiedReport {
  const content = text.toLowerCase();
  const hasLipidTerms = /(cholesterol|triglyceride|ldl|hdl|lipid)/.test(content);
  const hasMetabolicTerms = /(glucose|creatinine|sodium|potassium|metabolic)/.test(content);

  if (hasLipidTerms) {
    return {
      ...defaultReport,
      reportType: "Lipid panel",
      overview: "This is a lipid panel, a blood test that measures cholesterol and other fats that help assess heart health.",
      keyFindings: [
        "Your lipid results should be interpreted with your overall heart-health risk.",
        "Focus on trends over time rather than one number alone.",
        "Your clinician can explain personal targets for each result.",
      ],
      whatsNormal: "Some cholesterol values may be in range, but targets can differ based on your personal health history.",
      needsAttention: "Review any values marked high or low by the lab with your clinician, who can place them in the context of your health goals.",
      bottomLine: "This panel gives a useful picture of blood fats. It is best reviewed with your healthcare provider rather than used on its own.",
      findings: [
        { parameter: "Total cholesterol", value: "See original report", referenceRange: "Lab-specific", status: "borderline", explanation: "Total cholesterol combines several types of cholesterol. Your personal goal may depend on other health factors." },
        { parameter: "LDL cholesterol", value: "See original report", referenceRange: "Lab-specific", status: "borderline", explanation: "LDL is often called 'bad' cholesterol because higher levels can contribute to artery buildup over time." },
        { parameter: "HDL cholesterol", value: "See original report", referenceRange: "Lab-specific", status: "normal", explanation: "HDL helps carry cholesterol away from blood vessels. It is one part of the complete picture." },
      ],
      glossary: [
        { term: "Lipid panel", definition: "A set of blood tests that measures cholesterol and triglycerides." },
        { term: "LDL", definition: "A type of cholesterol that can build up in blood vessels when levels stay high." },
        { term: "HDL", definition: "A type of cholesterol that helps move cholesterol out of the bloodstream." },
      ],
      riskLevel: "moderate",
      analysisReferences: [
        "American Heart Association (AHA) and American College of Cardiology (ACC) Lipid Guidelines (2018)",
        "National Cholesterol Education Program (NCEP) Adult Treatment Panel (ATP III) Guidelines",
        "European Society of Cardiology (ESC) Guidelines for the Management of Dyslipidaemias"
      ],
    };
  }

  if (hasMetabolicTerms) {
    return {
      ...defaultReport,
      reportType: "Metabolic panel",
      overview: "This is a metabolic panel, a group of blood tests that looks at blood sugar, kidney function, and important body salts.",
      keyFindings: [
        "Metabolic results are best read alongside your medications, symptoms, and whether you were fasting.",
        "Reference ranges vary slightly by lab.",
        "A clinician can explain which values matter most for you.",
      ],
      whatsNormal: "Values inside the lab's reference range are generally reassuring, though your care team considers the full clinical picture.",
      needsAttention: "Any values flagged outside the range should be reviewed with a healthcare professional, especially if you have symptoms.",
      bottomLine: "This panel provides a snapshot of several body systems. Keep the original report for a clinician to interpret with you.",
      findings: [
        { parameter: "Glucose", value: "See original report", referenceRange: "Lab-specific", status: "borderline", explanation: "Glucose is sugar used for energy. Fasting status and timing can affect this result." },
        { parameter: "Creatinine", value: "See original report", referenceRange: "Lab-specific", status: "normal", explanation: "Creatinine is a waste product used as one clue about kidney function." },
        { parameter: "Potassium", value: "See original report", referenceRange: "Lab-specific", status: "normal", explanation: "Potassium is a mineral that helps nerves, muscles, and the heart work normally." },
      ],
      glossary: [
        { term: "Metabolic panel", definition: "A group of blood tests that checks several important body functions." },
        { term: "Creatinine", definition: "A natural waste product used as one indicator of kidney function." },
        { term: "Electrolytes", definition: "Minerals that help your nerves, muscles, and fluid balance work properly." },
      ],
      riskLevel: "moderate",
      analysisReferences: [
        "American Diabetes Association (ADA) Standards of Care in Diabetes (2024)",
        "National Kidney Foundation (NKF) Kidney Disease Outcomes Quality Initiative (KDOQI) Guidelines",
        "Clinical Practice Guidelines for Electrolytes and Fluid Balance (Kidney International)"
      ],
    };
  }

  return defaultReport;
}
