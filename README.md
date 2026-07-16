# ClearPath — Medical Report Simplifier & Grounding Agent

ClearPath is a premium, AI-driven Next.js web application designed to simplify complex clinical medical reports (such as blood tests and laboratory findings) into patient-friendly, plain language explanations. 

The application utilizes an advanced **multi-agent orchestration workflow** backed by the Google Gemini API to extract test parameters, cross-validate findings against web-grounded clinical references, list terms in a glossary, and compile customized, downloadable reports in multiple formats.

---

## 🌟 Key Features

- **Intuitive Plain Language Translation**: Converts dense clinical parameters into a 6th-grade reading level.
- **RAG-based Clinical Grounding**: Cross-verifies lab findings against standard medical consensus through search integrations, checking consensus reference ranges and outputting sources.
- **Subagent-Driven Document Formatting**: Leverages a specialized `DocumentFormattingAgent` to compile beautiful, structured documents for offline reading:
  - 📄 **PDF**: Perfectly formatted coordinate-drawn reports with reference panels and pagination.
  - 📝 **Word (.doc)**: Structured HTML-wrapped Word tables and lists.
  - 📊 **PowerPoint (.ppt)**: Visual slide-by-slide report deck summarizing results, snapshots, and next steps.
- **References & Medical Guidelines**: Outputs dynamic clinical references cited by the analysis agents, ensuring the system remains a transparent, grounding assistant without requiring diagnostic training datasets.
- **Mock Local Storage**: Includes a zero-configuration local storage system under `db_data/` for rapid development and privacy.

---

## 🛠️ Technology Stack

- **Core Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (modern, curated slate/teal color palette)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Integration**: Google Gemini API via official HTTP REST endpoints
- **Document Exporters**: Vanilla Buffer compilation (coordinate PDF assembler & Office HTML/XML templates)

---

## 📂 Project Architecture

- `src/app/page.tsx`: The primary interactive UI dashboard and upload screen.
- `src/app/api/reports/process/route.ts`: Endpoint processing uploaded reports via Gemini extraction and RAG verification.
- `src/app/api/reports/[id]/download/route.ts`: Endpoint serving PDF, Word, and PowerPoint downloads after verification.
- `src/lib/agents/document-agent.ts`: Specialized subagent handling document layout, conversion, and validation.
- `src/lib/gemini.ts`: Core AI functions executing text extraction and formatting prompts.
- `src/lib/firebase-admin.ts`: Local mock database emulator.
- `db_data/`: Ignored folder storing serialized report JSON files locally.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Installation
Install project dependencies:
```bash
npm install
```

### 4. Running Locally
Run the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Production Build
To build and check typescript/SSR optimizations:
```bash
npm run build
```

---

## 🔒 Security & Privacy

ClearPath operates with strict privacy boundaries:
- `.env` files containing secrets are completely excluded from Git via `.gitignore`.
- Uploaded data is stored locally in JSON files under `/db_data/` and is set to auto-expire.
- The system behaves as an informational assistant and includes built-in clinical disclaimer notifications advising consultation with medical professionals.
