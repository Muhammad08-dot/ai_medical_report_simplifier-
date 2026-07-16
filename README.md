# ClearPath — Medical Report Simplifier & Grounding Agent

ClearPath is an AI-driven Next.js web application designed to translate complex clinical medical reports (such as blood tests and laboratory findings) into patient-friendly, plain language explanations.

## 📖 About

ClearPath serves as an intelligent medical report companion. When a user uploads a clinical lab report, the platform initiates a multi-agent pipeline:
- **Extraction Agent**: Parses clinical parameters, values, and reference ranges using the Gemini API.
- **RAG Grounding Agent**: Verifies laboratory results against web-grounded medical consensus and generates references without training datasets.
- **Document Subagent**: Formats and packages the final report summary into downloadable PDF, Word, and PowerPoint formats.

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

## 📂 Project Structure

```text
clearpath-medical-report-simplifier/
├── db_data/                  # Local JSON files serving as the document storage database (Git ignored)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts  # Endpoint for chat interactions with reports
│   │   │   ├── health/
│   │   │   │   └── route.ts  # Health check endpoint
│   │   │   └── reports/
│   │   │       ├── [id]/
│   │   │       │   └── download/
│   │   │       │       └── route.ts  # Handles PDF, Word, & PPT generation requests
│   │   │       └── process/
│   │   │           └── route.ts      # Main pipeline processing clinical reports
│   │   ├── globals.css        # Global CSS stylesheet & Tailwind setup
│   │   ├── layout.tsx         # Main HTML envelope and font loader
│   │   └── page.tsx           # Premium UI dashboard for uploading & viewing summaries
│   ├── components/
│   │   └── SiteAgentWidget.tsx # Floating support support-agent chat assistant
│   └── lib/
│       ├── agents/
│       │   └── document-agent.ts # Formatting Subagent compiling PDFs, Word, & PPT exports
│       ├── firebase-admin.ts  # Mock collection and document database emulator
│       ├── gemini.ts          # Core Gemini API interaction & RAG orchestration logic
│       ├── report-data.ts     # Schema definitions and mock data fallbacks
│       └── report-record.ts   # Serialized document database record models
├── .env.example               # Example env template
├── .gitignore                 # Excludes build assets, local DBs, and API keys
├── package.json               # Declares dependencies and scripts
└── tsconfig.json              # TypeScript compilation setup
```

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
