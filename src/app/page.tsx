"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileText,
  HeartPulse,
  Info,
  LockKeyhole,
  Moon,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  X,
} from "lucide-react";
import type { Finding, FindingStatus, SimplifiedReport } from "@/lib/report-data";
import SiteAgentWidget from "@/components/SiteAgentWidget";

type Screen = "home" | "upload" | "processing" | "results";
type ProcessedResponse = SimplifiedReport & {
  reportId: string;
  fileName: string;
  downloadUrl: string;
  createdAt: string;
};

const acceptedExtensions = ["PDF", "JPG", "PNG", "TIFF"];
const processSteps = [
  { title: "Securing your document", detail: "Your file is protected in transit." },
  { title: "Reading your report", detail: "Finding tests, values, and reference ranges." },
  { title: "Simplifying the language", detail: "Turning clinical terms into clear explanations." },
  { title: "Preparing your insights", detail: "Highlighting what may need attention." },
];

const statusCopy: Record<FindingStatus, { label: string; className: string; dot: string }> = {
  normal: { label: "In range", className: "bg-emerald-50 text-emerald-700 ring-emerald-100", dot: "bg-emerald-500" },
  borderline: { label: "Monitor", className: "bg-amber-50 text-amber-800 ring-amber-100", dot: "bg-amber-500" },
  abnormal: { label: "Review", className: "bg-rose-50 text-rose-700 ring-rose-100", dot: "bg-rose-500" },
  critical: { label: "Urgent", className: "bg-rose-600 text-white ring-rose-200", dot: "bg-rose-600" },
};

function LogoMark({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`grid h-9 w-9 place-items-center rounded-xl ${dark ? "bg-white text-[#103e3d]" : "bg-[#103e3d] text-white"}`}>
      <HeartPulse size={20} strokeWidth={2.4} />
    </span>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#26756f]">{children}</p>;
}

function StatusBadge({ status }: { status: FindingStatus }) {
  const display = statusCopy[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${display.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${display.dot}`} />
      {display.label}
    </span>
  );
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(7);
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<ProcessedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFinding, setOpenFinding] = useState<string | null>("White blood cells");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("clearpath-theme") as any;
    if (savedTheme && ["light", "dark"].includes(savedTheme)) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("clearpath-theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  useEffect(() => {
    if (screen !== "processing") return;
    setProgress(8);
    setActiveStep(0);
    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + Math.max(2, Math.round((92 - current) / 5)), 92);
        setActiveStep(Math.min(3, Math.floor(next / 25)));
        return next;
      });
    }, 620);
    return () => window.clearInterval(interval);
  }, [screen]);

  const validateAndSetFile = (file: File | undefined) => {
    if (!file) return;
    const valid = /\.(pdf|jpe?g|png|tiff?|txt)$/i.test(file.name);
    if (!valid) {
      setError("Choose a PDF, JPG, PNG, TIFF, or text report.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("This report is larger than 10 MB. Please choose a smaller file.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const useSample = () => {
    const sampleText = "Complete Blood Count: Hemoglobin 14.2 g/dL (ref: 13.5-17.5), WBC 11,200/uL (ref: 4,500-11,000), Platelets 250,000/uL (ref: 150,000-400,000), RBC 5.1 M/uL (ref: 4.7-6.1). Impression: Mild leukocytosis.";
    validateAndSetFile(new File([sampleText], "sample-cbc-report.txt", { type: "text/plain" }));
    setScreen("upload");
  };

  const processReport = async () => {
    if (!selectedFile) return;
    setError(null);
    setScreen("processing");
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/reports/process", { method: "POST", body: formData });
      const data = (await response.json()) as ProcessedResponse | { error: string };
      if (!response.ok || !("reportId" in data)) {
        throw new Error("error" in data ? data.error : "We couldn’t process this report.");
      }
      setProgress(100);
      setActiveStep(3);
      window.setTimeout(() => {
        setResult(data);
        setScreen("results");
      }, 420);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We couldn’t process this report.");
      setScreen("upload");
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setOpenFinding("White blood cells");
    setScreen("upload");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfbf8] text-[#123331]">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <button onClick={() => setScreen("home")} className="flex items-center gap-2.5" aria-label="Go to ClearPath home">
          <LogoMark />
          <span className="text-lg font-extrabold tracking-[-0.04em] text-[#103e3d]">ClearPath</span>
        </button>
        <div className="hidden items-center gap-7 text-sm font-semibold text-[#41615e] md:flex">
          <a href="#how-it-works" className="transition hover:text-[#103e3d]">How it works</a>
          <a href="#privacy" className="transition hover:text-[#103e3d]">Our promise</a>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d5e5df] bg-white text-[#3f6862] transition hover:bg-[#f1f7f4] focus:outline-none cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button onClick={() => setScreen("upload")} className="rounded-full bg-[#103e3d] px-4 py-2.5 text-sm font-bold text-white shadow-[0_5px_15px_rgba(16,62,61,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0a302f] cursor-pointer">
            Upload report
          </button>
        </div>
      </header>

      {screen === "home" && (
        <>
          <section className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-28 lg:pt-20">
            <div className="relative z-10 max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d8e9e4] bg-[#f3fbf8] px-3 py-1.5 text-xs font-bold text-[#28766f]">
                <Sparkles size={14} /> Clear, human-first health information
              </div>
              <h1 className="max-w-[650px] text-[clamp(3rem,6.2vw,5.5rem)] font-extrabold leading-[0.96] tracking-[-0.07em] text-[#103e3d]">
                Your results.<br />
                <span className="text-[#377f78]">Made clear.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#52716d] sm:text-xl">
                Upload a medical report and get a calm, plain-language guide to the numbers, terms, and questions worth bringing to your care team.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button onClick={() => setScreen("upload")} className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#f4b75a] px-6 py-3.5 text-sm font-extrabold text-[#513300] shadow-[0_8px_18px_rgba(227,163,56,0.23)] transition hover:-translate-y-0.5 hover:bg-[#f8c46f]">
                  Simplify my report <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                </button>
                <button onClick={useSample} className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-[#316d67] transition hover:bg-[#edf5f2]">
                  <FileText size={17} /> View a sample
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[#5c7773]">
                <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-[#298278]" /> Private by design</span>
                <span className="flex items-center gap-1.5"><LockKeyhole size={14} className="text-[#298278]" /> Deleted after 24 hours</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-[#298278]" /> No account needed</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[515px] lg:ml-auto">
              <div className="absolute -right-16 -top-14 h-56 w-56 rounded-full bg-[#e6f4ed] blur-3xl" />
              <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-[#ffedcd] blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_24px_70px_rgba(31,76,70,0.16)] sm:p-6">
                <div className="flex items-center justify-between border-b border-[#e8efec] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e2f3ec] text-[#26756f]"><Activity size={20} /></div>
                    <div><p className="text-sm font-extrabold text-[#153b38]">Your health snapshot</p><p className="mt-0.5 text-xs text-[#6b8782]">CBC report · Simplified</p></div>
                  </div>
                  <span className="rounded-full bg-[#e6f6ef] px-2.5 py-1 text-[11px] font-extrabold text-[#24734d]">Low concern</span>
                </div>
                <div className="py-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#72908b]">The bottom line</p>
                  <p className="mt-2 text-lg font-bold leading-7 tracking-[-0.025em] text-[#204b47]">Most of your results look healthy. One value is worth checking in on.</p>
                </div>
                <div className="space-y-2.5">
                  {[
                    ["Hemoglobin", "14.2 g/dL", "bg-emerald-500"],
                    ["White blood cells", "11,200 /µL", "bg-amber-400"],
                    ["Platelets", "250,000 /µL", "bg-emerald-500"],
                  ].map(([name, value, color]) => (
                    <div key={name} className="flex items-center justify-between rounded-xl bg-[#f7faf8] px-3.5 py-3">
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-[#456662]"><span className={`h-2 w-2 rounded-full ${color}`} />{name}</span>
                      <span className="text-xs font-bold text-[#264d49]">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#c6dfd8] bg-[#f7fcfa] p-3 text-xs font-bold text-[#2c766f]"><Sparkles size={14} /> Clear explanations, not diagnoses</div>
              </div>
            </div>
          </section>

          <section id="how-it-works" className="border-y border-[#e1ece8] bg-[#f2f8f5]">
            <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
              <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
                <div><SectionEyebrow>Simple by design</SectionEyebrow><h2 className="max-w-sm text-4xl font-extrabold leading-[1.02] tracking-[-0.055em] text-[#103e3d]">From report to reassurance in three steps.</h2></div>
                <p className="max-w-lg text-base leading-7 text-[#587671]">We organize medical language into an easier starting point for a thoughtful conversation with your clinician.</p>
              </div>
              <div className="mt-12 grid gap-4 md:grid-cols-3">
                {[
                  ["01", "Upload securely", "Drop in a PDF or a clear photo of your report. No login required.", Upload],
                  ["02", "We make it clear", "We identify key results, explain terms, and flag the context to discuss.", Sparkles],
                  ["03", "Feel more prepared", "Save your summary and bring better questions to your next visit.", CheckCircle2],
                ].map(([number, title, copy, Icon]) => {
                  const StepIcon = Icon as typeof Upload;
                  return <article key={number as string} className="rounded-2xl border border-[#dfece7] bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(31,76,70,.08)]"><div className="flex items-start justify-between"><span className="text-sm font-extrabold text-[#5f928b]">{number as string}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f4ef] text-[#24766e]"><StepIcon size={20} /></span></div><h3 className="mt-7 text-lg font-extrabold tracking-[-0.025em] text-[#173d3a]">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#64807b]">{copy as string}</p></article>;
                })}
              </div>
            </div>
          </section>

          <section id="privacy" className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:px-10 lg:py-28">
            <div className="rounded-[1.75rem] bg-[#123f3d] p-8 text-white sm:p-11">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-[#f6c873]"><LockKeyhole size={22} /></div>
              <h2 className="mt-7 max-w-md text-4xl font-extrabold leading-[1.04] tracking-[-0.055em]">Your report is personal. Our approach should be, too.</h2>
              <p className="mt-5 max-w-lg leading-7 text-[#c8ded9]">Your upload is used only to create your summary. It is automatically deleted after 24 hours, and we do not sell or share health data.</p>
              <div className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#f5c56c]"><ShieldCheck size={18} /> Designed for privacy from the start</div>
            </div>
            <div className="flex flex-col justify-center px-2"><SectionEyebrow>A gentle reminder</SectionEyebrow><h2 className="text-3xl font-extrabold leading-tight tracking-[-0.045em] text-[#173d3a]">Clearer information is not a replacement for care.</h2><p className="mt-4 leading-7 text-[#64807b]">ClearPath helps you understand your report in everyday language. It never replaces your doctor, diagnoses a condition, or tells you what treatment to choose.</p><button onClick={() => setScreen("upload")} className="mt-7 inline-flex w-fit items-center gap-2 text-sm font-extrabold text-[#26756f]">Start with your report <ArrowRight size={16} /></button></div>
          </section>
          <footer className="border-t border-[#e7efec] px-5 py-7 text-center text-xs font-medium text-[#78918d]">© 2025 ClearPath · An informational tool, not medical advice.</footer>
        </>
      )}

      {screen === "upload" && (
        <section className="mx-auto min-h-[calc(100vh-75px)] max-w-[880px] px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
          <button onClick={() => setScreen("home")} className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#53746f] transition hover:text-[#123f3d]"><ArrowRight size={16} className="rotate-180" /> Back to home</button>
          <div className="text-center"><SectionEyebrow>Your report, in plain language</SectionEyebrow><h1 className="text-4xl font-extrabold tracking-[-0.06em] text-[#103e3d] sm:text-5xl">Let’s take a look together.</h1><p className="mx-auto mt-4 max-w-xl leading-7 text-[#607d78]">Upload a medical report and we’ll turn its clinical language into a simple, supportive guide.</p></div>
          <div className="mt-10 rounded-[1.75rem] border border-[#dbeae5] bg-white p-5 shadow-[0_18px_50px_rgba(30,81,73,.08)] sm:p-7">
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.txt,application/pdf,image/jpeg,image/png,image/tiff,text/plain" className="sr-only" onChange={(event) => validateAndSetFile(event.target.files?.[0])} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); validateAndSetFile(event.dataTransfer.files?.[0]); }}
              className={`flex min-h-[270px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${dragging ? "border-[#2d8279] bg-[#effaf6]" : "border-[#c9dfd8] bg-[#fbfdfc] hover:border-[#5ea79e] hover:bg-[#f6fbf9]"}`}
            >
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#e4f3ed] text-[#24776f]"><Upload size={29} /></span>
              <span className="mt-5 text-lg font-extrabold tracking-[-0.025em] text-[#18413d]">Drop your report here</span>
              <span className="mt-2 text-sm text-[#66817c]">or click to browse your files</span>
              <span className="mt-6 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#5e7974] shadow-sm">{acceptedExtensions.join("  ·  ")} &nbsp;·&nbsp; up to 10 MB</span>
            </button>
            {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"><AlertTriangle className="mt-0.5 shrink-0" size={17} />{error}</div>}
            {selectedFile && <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#d7e9e2] bg-[#f3faf7] p-3.5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[#327a72]"><FileText size={20} /></span><div className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-extrabold text-[#214843]">{selectedFile.name}</p><p className="mt-0.5 text-xs text-[#65807b]">{selectedFile.size < 1024 * 1024 ? `${Math.max(1, Math.round(selectedFile.size / 1024))} KB` : `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`} · Ready to simplify</p></div><button onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = ""; }} className="rounded-lg p-1.5 text-[#6d8782] transition hover:bg-white hover:text-[#214843]" aria-label="Remove selected report"><X size={18} /></button></div>}
            <button onClick={processReport} disabled={!selectedFile} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#103e3d] px-5 py-4 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(16,62,61,.16)] transition hover:bg-[#0c3331] disabled:cursor-not-allowed disabled:opacity-40">Simplify my report <ArrowRight size={17} /></button>
          </div>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-7"><span className="flex items-center gap-1.5 text-xs font-bold text-[#68827d]"><LockKeyhole size={14} className="text-[#2b8076]" /> Encrypted in transit</span><span className="flex items-center gap-1.5 text-xs font-bold text-[#68827d]"><RotateCcw size={14} className="text-[#2b8076]" /> Automatically deleted in 24 hours</span><button onClick={useSample} className="text-xs font-extrabold text-[#2d786f] underline underline-offset-4">Try with a sample report</button></div>
          <p className="mx-auto mt-9 max-w-2xl text-center text-xs leading-5 text-[#829894]">By uploading, you confirm you have the right to use this report. ClearPath provides informational summaries only — it is not a diagnosis or a substitute for professional medical advice.</p>
        </section>
      )}

      {screen === "processing" && (
        <section className="mx-auto flex min-h-[calc(100vh-75px)] max-w-[650px] flex-col justify-center px-5 pb-24 sm:px-8">
          <div className="rounded-[2rem] border border-[#dcebe6] bg-white p-7 shadow-[0_18px_55px_rgba(30,81,73,.09)] sm:p-10">
            <div className="flex justify-center"><div className="relative grid h-20 w-20 place-items-center rounded-[1.6rem] bg-[#e6f5ef] text-[#23756d]"><div className="absolute inset-0 animate-ping rounded-[1.6rem] bg-[#bfe5d9] opacity-35" /><Sparkles className="relative" size={32} /></div></div>
            <div className="mt-7 text-center"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#358077]">Making it easier to understand</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-[#133d39] sm:text-4xl">We’re reading this with care.</h1><p className="mt-3 text-sm leading-6 text-[#66817c]">This usually takes less than a minute. We’re organizing the important details into simple language.</p></div>
            <div className="mt-9"><div className="flex items-center justify-between text-xs font-bold text-[#5d7c76]"><span>{processSteps[activeStep].title}</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7f0ed]"><div className="h-full rounded-full bg-[#3f968a] transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>
            <div className="mt-8 space-y-4">{processSteps.map((step, index) => <div key={step.title} className="flex items-center gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${index < activeStep ? "bg-[#d7f0e5] text-[#267661]" : index === activeStep ? "bg-[#103e3d] text-white" : "bg-[#eef3f1] text-[#9aacA8]"}`}>{index < activeStep ? <Check size={14} /> : index + 1}</span><div><p className={`text-sm font-bold ${index <= activeStep ? "text-[#244944]" : "text-[#9aacA8]"}`}>{step.title}</p>{index === activeStep && <p className="mt-0.5 text-xs text-[#6e8984]">{step.detail}</p>}</div></div>)}</div>
            <div className="mt-8 flex items-start gap-2 rounded-xl bg-[#fff8ea] p-3 text-xs leading-5 text-[#87621d]"><Info className="mt-0.5 shrink-0" size={16} />ClearPath explains information from your report. It does not diagnose a condition or replace medical care.</div>
          </div>
        </section>
      )}

      {screen === "results" && result && (
        <section className="mx-auto max-w-[1240px] px-5 pb-20 pt-8 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-5 border-b border-[#dfeae6] pb-6 sm:flex-row sm:items-center"><div><button onClick={reset} className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-[#558079] transition hover:text-[#173f3c]"><ArrowRight size={14} className="rotate-180" /> Simplify another report</button><h1 className="text-3xl font-extrabold tracking-[-0.055em] text-[#103e3d] sm:text-4xl">Your clear-path summary</h1><p className="mt-2 text-sm text-[#65807b]">{result.fileName} · Generated just now</p></div><div className="flex flex-wrap gap-3"><a href={result.downloadUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#103e3d] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#0b3330]"><FileText size={17} /> Download PDF</a><a href={`${result.downloadUrl}?format=word`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5e5df] bg-white px-4 py-3 text-sm font-extrabold text-[#3f6862] transition hover:bg-[#f1f7f4]"><FileText size={17} /> Download Word</a><a href={`${result.downloadUrl}?format=ppt`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5e5df] bg-white px-4 py-3 text-sm font-extrabold text-[#3f6862] transition hover:bg-[#f1f7f4]"><FileText size={17} /> Download PPT</a><button onClick={reset} className="grid h-11 w-11 place-items-center rounded-xl border border-[#d5e5df] bg-white text-[#3f6862] transition hover:bg-[#f1f7f4]" aria-label="Upload another report"><Upload size={18} /></button></div></div>
          <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,.72fr)]">
            <div className="space-y-7">
              <article className="relative overflow-hidden rounded-[1.5rem] bg-[#123f3d] p-7 text-white sm:p-8"><div className="absolute -right-7 -top-7 h-36 w-36 rounded-full bg-[#2e7770] opacity-50" /><div className="relative"><div className="flex flex-wrap items-center justify-between gap-3"><div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#b9d8d2]"><Sparkles size={15} /> Your health snapshot</div><span className="rounded-full bg-[#d9f4e7] px-3 py-1.5 text-xs font-extrabold text-[#23624e]">Low concern</span></div><h2 className="mt-6 max-w-2xl text-2xl font-extrabold leading-8 tracking-[-.04em] sm:text-3xl">{result.bottomLine}</h2><div className="mt-7 grid gap-2.5 sm:grid-cols-3">{result.keyFindings.map((finding, index) => <div key={finding} className="rounded-xl border border-white/10 bg-white/[.08] p-3.5"><span className="text-xs font-extrabold text-[#f5c56c]">0{index + 1}</span><p className="mt-2 text-sm leading-5 text-[#e5f0ed]">{finding}</p></div>)}</div></div></article>
              <article className="rounded-[1.5rem] border border-[#dce9e5] bg-white p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><SectionEyebrow>At a glance</SectionEyebrow><h2 className="text-2xl font-extrabold tracking-[-.04em] text-[#173d3a]">Your results</h2></div><button className="rounded-lg p-1 text-[#718b86] hover:bg-[#f0f6f3]" aria-label="More options"><MoreHorizontal size={20} /></button></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[550px] text-left"><thead><tr className="border-b border-[#e2ece8] text-[11px] font-extrabold uppercase tracking-[.12em] text-[#78918c]"><th className="pb-3 pr-3">Test</th><th className="pb-3 pr-3">Your value</th><th className="pb-3 pr-3">Reference range</th><th className="pb-3 text-right">Status</th></tr></thead><tbody>{result.findings.map((finding) => <tr key={finding.parameter} className="border-b border-[#edf2f0] last:border-none"><td className="py-4 pr-3 text-sm font-extrabold text-[#274c47]">{finding.parameter}</td><td className="py-4 pr-3 text-sm font-semibold text-[#466a65]">{finding.value}</td><td className="py-4 pr-3 text-xs font-semibold text-[#6f8783]">{finding.referenceRange}</td><td className="py-4 text-right"><StatusBadge status={finding.status} /></td></tr>)}</tbody></table></div><div className="mt-5 flex items-start gap-2 rounded-xl bg-[#fff9eb] p-3 text-xs leading-5 text-[#87631e]"><AlertTriangle className="mt-0.5 shrink-0" size={15} /> “Monitor” does not mean something is wrong. It means this value is worth discussing in the context of your health.</div></article>
              <article className="rounded-[1.5rem] border border-[#dce9e5] bg-white p-6 sm:p-7"><SectionEyebrow>In plain language</SectionEyebrow><h2 className="text-2xl font-extrabold tracking-[-.04em] text-[#173d3a]">What your report is saying</h2><div className="mt-6 space-y-3">{result.findings.map((finding) => { const isOpen = openFinding === finding.parameter; return <div key={finding.parameter} className={`rounded-xl border transition ${isOpen ? "border-[#9fcfc4] bg-[#f6fcf9]" : "border-[#e2ece8] bg-white"}`}><button onClick={() => setOpenFinding(isOpen ? null : finding.parameter)} className="flex w-full items-center gap-3 p-4 text-left"><span className={`h-2.5 w-2.5 rounded-full ${statusCopy[finding.status].dot}`} /><span className="flex-1 text-sm font-extrabold text-[#254a45]">{finding.parameter}</span><StatusBadge status={finding.status} /><ChevronDown size={18} className={`ml-1 text-[#6b8782] transition ${isOpen ? "rotate-180" : ""}`} /></button>{isOpen && <div className="border-t border-[#dcebe6] px-4 pb-4 pt-3"><p className="text-sm leading-6 text-[#587872]">{finding.explanation}</p><p className="mt-2 text-xs font-bold text-[#6b8984]">Your value: <span className="text-[#315c56]">{finding.value}</span> <span className="ml-2">Lab range: {finding.referenceRange}</span></p>{finding.verification && <div className="mt-4 rounded-xl border border-[#d4eae2] bg-[#f2faf7] p-3.5"><div className="flex items-center gap-2 text-xs font-extrabold text-[#236653]"><Sparkles size={14} className="text-[#2b886d]" /> AI Medical Verification (RAG Search)</div><div className="mt-2 text-xs text-[#41665a] leading-5"><div className="font-semibold text-[#1e4a3d] mb-1">Consensus Range: <span className="font-normal text-[#3b6055]">{finding.verification.consensusRange}</span></div><div><strong>Clinical Consensus:</strong> {finding.verification.medicalConsensus}</div>{finding.verification.verifiedSources && finding.verification.verifiedSources.length > 0 && <div className="mt-2 pt-2 border-t border-[#e2efe9]"><span className="font-bold text-[#236653]">Sources checked:</span><div className="flex flex-wrap gap-2 mt-1">{finding.verification.verifiedSources.map((source, sIdx) => <a key={sIdx} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-[#e3f4ee] px-2 py-0.5 text-[10px] font-bold text-[#236653] transition hover:bg-[#d5eeec] hover:underline">{source.title.length > 25 ? `${source.title.slice(0, 25)}...` : source.title}</a>)}</div></div>}</div></div>}</div>}</div>; })}</div></article>
              {result.analysisReferences && result.analysisReferences.length > 0 && (
                <article className="rounded-[1.5rem] border border-[#dce9e5] bg-white p-6 sm:p-7">
                  <SectionEyebrow>Medical consensus</SectionEyebrow>
                  <h2 className="text-2xl font-extrabold tracking-[-.04em] text-[#173d3a]">Clinical References & Guidelines</h2>
                  <p className="mt-2 text-sm leading-6 text-[#587872]">
                    The analysis performed by our agent is grounded in standard, reputable medical resources. Because we utilize dynamic in-context reasoning rather than pre-trained diagnostic datasets, these references serve as general clinical guides:
                  </p>
                  <ul className="mt-4 space-y-3">
                    {result.analysisReferences.map((ref, idx) => (
                      <li key={idx} className="flex gap-3 text-sm leading-6 text-[#456a64] font-medium bg-[#f3faf7] border border-[#dbece6] p-3 rounded-xl">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#e3f4ee] text-xs font-extrabold text-[#236653]">
                          {idx + 1}
                        </span>
                        <span>{ref}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              )}
            </div>
            <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
              <article className="rounded-[1.5rem] border border-[#dce9e5] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5f4ee] text-[#287b72]"><FileText size={20} /></span><div><p className="text-sm font-extrabold text-[#224640]">{result.reportType}</p><p className="mt-0.5 text-xs text-[#708984]">Overview of your report</p></div></div><p className="mt-5 text-sm leading-6 text-[#587872]">{result.overview}</p><div className="mt-5 border-t border-[#e6efec] pt-4"><p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#73908a]">What’s reassuring</p><p className="mt-2 text-sm leading-6 text-[#456a64]">{result.whatsNormal}</p></div></article>
              <article className="rounded-[1.5rem] border border-[#dce9e5] bg-white p-6"><div className="flex items-center gap-2"><CircleHelp size={19} className="text-[#37857c]" /><h2 className="text-lg font-extrabold tracking-[-.03em] text-[#214640]">Terms made simple</h2></div><div className="mt-4 space-y-4">{result.glossary.map((term) => <div key={term.term}><p className="text-sm font-extrabold text-[#2d615a]">{term.term}</p><p className="mt-1 text-xs leading-5 text-[#6a847f]">{term.definition}</p></div>)}</div></article>
              <article className="rounded-[1.5rem] border border-[#efd99e] bg-[#fffaf0] p-6"><div className="flex items-center gap-2 text-[#8a6521]"><AlertTriangle size={18} /><h2 className="text-sm font-extrabold">Important next steps</h2></div><ul className="mt-4 space-y-3">{result.suggestedActions.map((action) => <li key={action} className="flex gap-2 text-xs leading-5 text-[#775f32]"><CheckCircle2 className="mt-0.5 shrink-0 text-[#bd8f30]" size={14} />{action}</li>)}</ul></article>
              <p className="px-2 text-center text-[11px] leading-5 text-[#829793]">{result.disclaimer}</p>
            </aside>
          </div>
        </section>
      )}
      <SiteAgentWidget />
    </main>
  );
}
