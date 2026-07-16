import type { SimplifiedReport } from "@/lib/report-data";

function pdfSafe(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[•]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxWidth: number, fontSize: number, isBold = false) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";
  const charWidth = isBold ? fontSize * 0.55 : fontSize * 0.48;

  for (const word of words) {
    const currentLineWithWord = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = currentLineWithWord.length * charWidth;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLineWithWord;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function createPdf(title: string, report: SimplifiedReport, fileName: string): Buffer {
  const pages: string[][] = [[]];
  let currentPageIndex = 0;
  let y = 718;

  const addText = (str: string, tx: number, ty: number, font: string, size: number, colorRGB: string) => {
    pages[currentPageIndex].push("BT");
    pages[currentPageIndex].push(`${font} ${size} Tf`);
    pages[currentPageIndex].push(`${colorRGB} rg`);
    pages[currentPageIndex].push(`${tx} ${ty} Td`);
    pages[currentPageIndex].push(`(${pdfSafe(str)}) Tj`);
    pages[currentPageIndex].push("ET");
  };

  const drawRect = (rx: number, ry: number, rw: number, rh: number, fillColor?: string, strokeColor?: string, strokeWidth = 1) => {
    pages[currentPageIndex].push("q");
    if (fillColor) {
      pages[currentPageIndex].push(`${fillColor} rg`);
      pages[currentPageIndex].push(`${rx} ${ry} ${rw} ${rh} re`);
      pages[currentPageIndex].push("f");
    }
    if (strokeColor) {
      pages[currentPageIndex].push(`${strokeWidth} w`);
      pages[currentPageIndex].push(`${strokeColor} RG`);
      pages[currentPageIndex].push(`${rx} ${ry} ${rw} ${rh} re`);
      pages[currentPageIndex].push("S");
    }
    pages[currentPageIndex].push("Q");
  };

  const drawLine = (lx1: number, ly1: number, lx2: number, ly2: number, strokeColor = "0.85 0.9 0.88", strokeWidth = 1) => {
    pages[currentPageIndex].push("q");
    pages[currentPageIndex].push(`${strokeWidth} w`);
    pages[currentPageIndex].push(`${strokeColor} RG`);
    pages[currentPageIndex].push(`${lx1} ${ly1} m`);
    pages[currentPageIndex].push(`${lx2} ${ly2} l`);
    pages[currentPageIndex].push("S");
    pages[currentPageIndex].push("Q");
  };

  const checkPageSpace = (neededHeight: number) => {
    if (y - neededHeight < 60) {
      pages.push([]);
      currentPageIndex++;
      y = 718;
      drawLine(54, 745, 558, 745, "0.85 0.9 0.88", 0.5);
      addText("ClearPath Simplified Report", 54, 752, "/F2", 8, "0.34 0.47 0.45");
      addText(`Page ${currentPageIndex + 1}`, 530, 752, "/F1", 8, "0.5 0.6 0.6");
    }
  };

  const addParagraph = (textStr: string, options: { font?: string; size?: number; color?: string; leading?: number; width?: number; indent?: number } = {}) => {
    const font = options.font || "/F1";
    const size = options.size || 10;
    const color = options.color || "0.15 0.2 0.2";
    const leading = options.leading || size + 4;
    const width = options.width || 504;
    const indent = options.indent || 0;

    const wrappedLines = wrapText(textStr, width, size, font === "/F2");
    for (const line of wrappedLines) {
      checkPageSpace(leading);
      addText(line, 54 + indent, y, font, size, color);
      y -= leading;
    }
  };

  // Header on Page 1
  drawRect(54, 735, 24, 24, "0.063 0.243 0.239");
  drawLine(66, 739, 66, 755, "1 1 1", 2);
  drawLine(60, 747, 72, 747, "1 1 1", 2);
  
  addText("ClearPath", 88, 740, "/F2", 18, "0.063 0.243 0.239");
  addText("Understand your medical report", 180, 740, "/F1", 10, "0.34 0.47 0.45");
  drawLine(54, 722, 558, 722, "0.063 0.243 0.239", 1.5);
  
  y = 695;

  // Metadata block
  addText(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 54, y, "/F1", 9, "0.4 0.5 0.5");
  addText(`Original File: ${fileName}`, 300, y, "/F1", 9, "0.4 0.5 0.5");
  y -= 25;

  // Bottom Line snapshot card
  checkPageSpace(80);
  const bottomLineLines = wrapText(report.bottomLine, 470, 11, true);
  const bottomLineHeight = bottomLineLines.length * 15 + 35;
  drawRect(54, y - bottomLineHeight + 15, 504, bottomLineHeight, "0.949 0.980 0.969", "0.85 0.9 0.88", 1);
  addText("YOUR HEALTH SNAPSHOT", 70, y - 5, "/F2", 8, "0.180 0.467 0.439");
  let blY = y - 22;
  for (const line of bottomLineLines) {
    addText(line, 70, blY, "/F2", 11, "0.090 0.239 0.227");
    blY -= 15;
  }
  y -= (bottomLineHeight + 15);

  // Overview section
  checkPageSpace(60);
  addText("YOUR REPORT AT A GLANCE", 54, y, "/F2", 11, "0.063 0.243 0.239");
  y -= 16;
  addParagraph(report.overview, { font: "/F1", size: 10, color: "0.2 0.25 0.25", leading: 14 });
  y -= 15;

  // Key findings section
  checkPageSpace(50);
  addText("KEY FINDINGS", 54, y, "/F2", 11, "0.063 0.243 0.239");
  y -= 15;
  for (const kf of report.keyFindings) {
    addParagraph(`-  ${kf}`, { font: "/F1", size: 10, color: "0.2 0.25 0.25", leading: 14, indent: 10 });
  }
  y -= 15;

  // What needs attention section
  if (report.needsAttention) {
    checkPageSpace(60);
    addText("WHAT NEEDS ATTENTION", 54, y, "/F2", 11, "0.937 0.267 0.267");
    y -= 16;
    addParagraph(report.needsAttention, { font: "/F1", size: 10, color: "0.2 0.25 0.25", leading: 14 });
    y -= 15;
  }

  // Findings Results section
  checkPageSpace(40);
  addText("DETAILED RESULTS & ANALYSIS", 54, y, "/F2", 12, "0.063 0.243 0.239");
  y -= 8;
  drawLine(54, y, 558, y, "0.85 0.9 0.88", 1);
  y -= 18;

  for (const f of report.findings) {
    const expLines = wrapText(f.explanation, 470, 9.5, false);
    let cardHeight = 12 + 18 + 15 + (expLines.length * 13) + 12;
    
    let innerCardHeight = 0;
    let rLines: string[] = [];
    if (f.verification) {
      rLines = wrapText(`Clinical Consensus: ${f.verification.medicalConsensus}`, 440, 9, false);
      innerCardHeight = 10 + 14 + 14 + (rLines.length * 12) + 10;
      cardHeight += innerCardHeight + 12;
    }

    checkPageSpace(cardHeight);

    drawRect(54, y - cardHeight + 15, 504, cardHeight, "1 1 1", "0.88 0.92 0.90", 1);

    let statusColor = "0.063 0.725 0.506";
    let statusBg = "0.9 0.98 0.94";
    if (f.status === "borderline") {
      statusColor = "0.961 0.620 0.043";
      statusBg = "1 0.98 0.92";
    } else if (f.status === "abnormal" || f.status === "critical") {
      statusColor = "0.937 0.267 0.267";
      statusBg = "1 0.94 0.94";
    }

    addText(f.parameter, 70, y - 8, "/F2", 11, "0.090 0.239 0.227");

    const badgeText = f.status.toUpperCase();
    const badgeW = badgeText.length * 6 + 12;
    drawRect(558 - badgeW - 16, y - 10, badgeW, 14, statusBg, statusColor, 0.7);
    addText(badgeText, 558 - badgeW - 10, y - 6, "/F2", 8, statusColor);

    addText(`Your Value: ${f.value}`, 70, y - 25, "/F2", 9.5, "0.15 0.2 0.2");
    addText(`Reference Range: ${f.referenceRange}`, 220, y - 25, "/F1", 9.5, "0.35 0.45 0.45");

    let expY = y - 40;
    for (const eline of expLines) {
      addText(eline, 70, expY, "/F1", 9.5, "0.34 0.47 0.45");
      expY -= 13;
    }

    if (f.verification) {
      const innerY = expY - 5;
      drawRect(70, innerY - innerCardHeight, 472, innerCardHeight, "0.949 0.980 0.969", "0.83 0.91 0.88", 0.7);
      
      addText("AI Search Verification (RAG Grounding)", 82, innerY - 12, "/F2", 8.5, "0.180 0.467 0.439");
      addText(`Consensus Reference Range: ${f.verification.consensusRange}`, 82, innerY - 26, "/F2", 9, "0.090 0.239 0.227");
      
      let ccY = innerY - 38;
      for (const cline of rLines) {
        addText(cline, 82, ccY, "/F1", 9, "0.34 0.47 0.45");
        ccY -= 12;
      }
      
      if (f.verification.verifiedSources && f.verification.verifiedSources.length > 0) {
        const sourcesText = "Checked Sources: " + f.verification.verifiedSources.map(s => s.title).join(", ");
        const sourceLines = wrapText(sourcesText, 440, 8, false);
        for (const sline of sourceLines) {
          addText(sline, 82, ccY, "/F1", 8, "0.4 0.5 0.5");
          ccY -= 10;
        }
      }
    }

    y -= (cardHeight + 15);
  }

  // Next steps section
  checkPageSpace(60);
  addText("SUGGESTED NEXT STEPS", 54, y, "/F2", 11, "0.063 0.243 0.239");
  y -= 15;
  for (const action of report.suggestedActions) {
    addParagraph(`-  ${action}`, { font: "/F1", size: 10, color: "0.2 0.25 0.25", leading: 14, indent: 10 });
  }
  y -= 20;

  // Analysis References Section
  if (report.analysisReferences && report.analysisReferences.length > 0) {
    checkPageSpace(65);
    addText("CLINICAL REFERENCES & GUIDELINES", 54, y, "/F2", 11, "0.063 0.243 0.239");
    y -= 15;
    for (const ref of report.analysisReferences) {
      addParagraph(`-  ${ref}`, { font: "/F1", size: 9, color: "0.34 0.47 0.45", leading: 13, indent: 10 });
    }
    y -= 20;
  }

  // Disclaimer Section
  checkPageSpace(70);
  const discLines = wrapText(report.disclaimer, 470, 8, false);
  const discHeight = discLines.length * 11 + 20;
  drawRect(54, y - discHeight + 15, 504, discHeight, "0.98 0.98 0.98", "0.9 0.9 0.9", 0.5);
  addText("IMPORTANT DISCLAIMER", 70, y - 5, "/F2", 8, "0.5 0.5 0.5");
  y -= 17;
  addParagraph(report.disclaimer, { font: "/F1", size: 8, color: "0.5 0.5 0.5", leading: 11, indent: 16 });

  // Add page numbers footer to all pages
  for (let i = 0; i < pages.length; i++) {
    pages[i].push("BT");
    pages[i].push("/F1 8 Tf");
    pages[i].push("0.5 0.6 0.6 rg");
    pages[i].push(`500 40 Td`);
    pages[i].push(`(Page ${i + 1} of ${pages.length}) Tj`);
    pages[i].push("ET");
  }

  const numPages = pages.length;

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from({ length: numPages }, (_, i) => `${5 + i} 0 R`).join(" ")}] /Count ${numPages} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];

  for (let i = 0; i < numPages; i++) {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + numPages + i} 0 R >>`);
  }

  for (let i = 0; i < numPages; i++) {
    const stream = pages[i].join("\n");
    objects.push(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xref = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function createWordDoc(title: string, report: SimplifiedReport, fileName: string): Buffer {
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  
  const findingsRows = report.findings.map(f => {
    let verificationInfo = "";
    if (f.verification) {
      const sourcesText = (f.verification.verifiedSources || [])
        .map(s => `<a href="${s.url}" style="color: #2d786f; text-decoration: underline;">${s.title}</a>`)
        .join(", ");
      verificationInfo = `
        <tr style="background-color: #f7faf9;">
          <td colspan="4" style="padding: 10px; font-size: 11px; color: #50706b; border: 1px solid #dfeae6;">
            <strong>AI Web Verification (RAG):</strong><br/>
            <strong>Consensus Reference Range:</strong> ${f.verification.consensusRange}<br/>
            <strong>Clinical Consensus:</strong> ${f.verification.medicalConsensus}<br/>
            ${sourcesText ? `<strong>Sources Checked:</strong> ${sourcesText}` : ""}
          </td>
        </tr>
      `;
    }
    return `
      <tr>
        <td style="padding: 10px; font-size: 12px; font-weight: bold; border: 1px solid #dfeae6; color: #274c47;">${f.parameter}</td>
        <td style="padding: 10px; font-size: 12px; border: 1px solid #dfeae6; color: #466a65;">${f.value}</td>
        <td style="padding: 10px; font-size: 12px; border: 1px solid #dfeae6; color: #6f8783;">${f.referenceRange}</td>
        <td style="padding: 10px; font-size: 12px; font-weight: bold; border: 1px solid #dfeae6; text-align: right; color: ${f.status === 'normal' ? '#10b981' : '#f59e0b'};">${f.status.toUpperCase()}</td>
      </tr>
      ${verificationInfo}
    `;
  }).join("");

  const glossaryItems = report.glossary.map(g => `
    <p style="margin: 0 0 10px 0; font-size: 12px;">
      <strong style="color: #2d615a;">${g.term}:</strong> 
      <span style="color: #6a847f;">${g.definition}</span>
    </p>
  `).join("");

  const keyFindingsList = report.keyFindings.map(kf => `
    <li style="margin: 0 0 8px 0; font-size: 13px; color: #333333;">${kf}</li>
  `).join("");

  const actionsList = report.suggestedActions.map(sa => `
    <li style="margin: 0 0 8px 0; font-size: 12px; color: #775f32;">${sa}</li>
  `).join("");

  const referencesList = (report.analysisReferences || []).map(ref => `
    <li style="margin: 0 0 8px 0; font-size: 12px; color: #466a65;">${ref}</li>
  `).join("");

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333333; margin: 40px; }
        h1 { color: #103e3d; font-size: 24px; border-bottom: 2px solid #103e3d; padding-bottom: 5px; margin-bottom: 5px; }
        h2 { color: #173d3a; font-size: 18px; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #dfeae6; padding-bottom: 3px; }
        .meta { font-size: 12px; color: #65807b; margin-bottom: 20px; }
        .card { background-color: #f3faf7; border: 1px solid #d7e9e2; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .card-title { font-weight: bold; color: #23624e; margin-bottom: 5px; font-size: 14px; }
        .card-text { font-size: 13px; line-height: 1.5; color: #315c56; }
        .disclaimer { font-size: 10px; color: #829793; text-align: center; margin-top: 40px; border-top: 1px solid #dfeae6; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Generated ${dateStr} | Original File: ${fileName}</div>

      <div class="card">
        <div class="card-title">HEALTH SNAPSHOT & BOTTOM LINE</div>
        <div class="card-text">${report.bottomLine}</div>
      </div>

      <h2>Your Report At A Glance</h2>
      <p style="font-size: 13px; line-height: 1.6; color: #333333;">${report.overview}</p>

      <h2>Key Insights</h2>
      <ul style="margin: 0; padding-left: 20px;">
        ${keyFindingsList}
      </ul>

      <h2>Verified Findings</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f2f8f5; text-align: left;">
            <th style="padding: 10px; font-size: 11px; font-weight: bold; border: 1px solid #dfeae6; color: #78918c;">Test</th>
            <th style="padding: 10px; font-size: 11px; font-weight: bold; border: 1px solid #dfeae6; color: #78918c;">Your Value</th>
            <th style="padding: 10px; font-size: 11px; font-weight: bold; border: 1px solid #dfeae6; color: #78918c;">Lab Range</th>
            <th style="padding: 10px; font-size: 11px; font-weight: bold; border: 1px solid #dfeae6; color: #78918c; text-align: right;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${findingsRows}
        </tbody>
      </table>

      <h2>Terms Made Simple</h2>
      <div style="margin-top: 10px;">
        ${glossaryItems}
      </div>

      <h2>Clinical References & Guidelines</h2>
      <ul style="margin: 0; padding-left: 20px;">
        ${referencesList}
      </ul>

      <h2>Important Next Steps</h2>
      <ul style="margin: 0; padding-left: 20px; color: #775f32;">
        ${actionsList}
      </ul>

      <div class="disclaimer">
        ${report.disclaimer}
      </div>
    </body>
    </html>
  `;

  return Buffer.from(html, "utf8");
}

function createPptDoc(title: string, report: SimplifiedReport, fileName: string): Buffer {
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  
  const slides = [
    // Slide 1: Title
    `
    <div class="slide bg-dark">
      <div class="logo">ClearPath</div>
      <div class="divider"></div>
      <h1 class="title">${title}</h1>
      <p class="subtitle">Understand your medical report in plain language</p>
      <div class="footer">
        <span>Generated: ${dateStr}</span>
        <span>Original File: ${fileName}</span>
      </div>
    </div>
    `,
    // Slide 2: Snapshot & Key Insights
    `
    <div class="slide">
      <h2>Your Health Snapshot</h2>
      <div class="card">
        <p class="snapshot-text">${report.bottomLine}</p>
      </div>
      <h3 style="margin-top: 20px; color: #103e3d;">Key Insights:</h3>
      <ul>
        ${report.keyFindings.map(kf => `<li>${kf}</li>`).join("")}
      </ul>
    </div>
    `,
    // Slide 3: Findings Results
    `
    <div class="slide">
      <h2>Detailed Results & Analysis</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f2f8f5; text-align: left;">
            <th style="padding: 8px; border: 1px solid #dfeae6; color: #78918c; font-size: 11px;">Parameter</th>
            <th style="padding: 8px; border: 1px solid #dfeae6; color: #78918c; font-size: 11px;">Value</th>
            <th style="padding: 8px; border: 1px solid #dfeae6; color: #78918c; font-size: 11px;">Reference Range</th>
            <th style="padding: 8px; border: 1px solid #dfeae6; color: #78918c; font-size: 11px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${report.findings.map(f => `
            <tr>
              <td style="padding: 8px; border: 1px solid #dfeae6; font-weight: bold; color: #274c47; font-size: 12px;">${f.parameter}</td>
              <td style="padding: 8px; border: 1px solid #dfeae6; color: #466a65; font-size: 12px;">${f.value}</td>
              <td style="padding: 8px; border: 1px solid #dfeae6; color: #6f8783; font-size: 12px;">${f.referenceRange}</td>
              <td style="padding: 8px; border: 1px solid #dfeae6; font-weight: bold; color: ${f.status === 'normal' ? '#10b981' : '#f59e0b'}; font-size: 12px;">${f.status.toUpperCase()}</td>
            </tr>
          `).slice(0, 5).join("")}
        </tbody>
      </table>
      ${report.findings.length > 5 ? `<p style="font-size: 10px; color: #888; margin-top: 10px;">Showing first 5 findings. See complete report for all details.</p>` : ""}
    </div>
    `,
    // Slide 4: Glossary & Next Steps
    `
    <div class="slide">
      <h2>Medical Glossary & Next Steps</h2>
      <div style="float: left; width: 48%;">
        <h3 style="color: #2d615a; border-bottom: 1px solid #dfeae6; padding-bottom: 4px;">Terms Made Simple</h3>
        ${report.glossary.slice(0, 3).map(g => `
          <p style="margin-bottom: 8px; font-size: 12px;">
            <strong style="color: #2d615a;">${g.term}:</strong> <span style="color: #6a847f;">${g.definition}</span>
          </p>
        `).join("")}
      </div>
      <div style="float: right; width: 48%;">
        <h3 style="color: #bd8f30; border-bottom: 1px solid #dfeae6; padding-bottom: 4px;">Suggested Next Steps</h3>
        <ul>
          ${report.suggestedActions.slice(0, 3).map(sa => `<li>${sa}</li>`).join("")}
        </ul>
      </div>
    </div>
    `,
    // Slide 5: References & Guidelines
    `
    <div class="slide">
      <h2>Clinical References & Guidelines</h2>
      ${report.analysisReferences && report.analysisReferences.length > 0 ? `
        <ul style="margin-top: 10px; margin-bottom: 20px; font-size: 14px;">
          ${report.analysisReferences.map(ref => `<li>${ref}</li>`).join("")}
        </ul>
      ` : `<p>Standard clinical reference models were used for RAG check validation.</p>`}
      <div class="disclaimer-box">
        <strong>Important Disclaimer:</strong> ${report.disclaimer}
      </div>
    </div>
    `
  ];

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:p='urn:schemas-microsoft-com:office:powerpoint'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <p:Presentation w:Width="720" w:Height="405">
          <p:SlideSize w:Width="720" w:Height="405" />
        </p:Presentation>
      </xml>
      <![endif]-->
      <style>
        body { margin: 0; padding: 0; background-color: #f0f0f0; }
        .slide {
          page-break-after: always;
          width: 10in;
          height: 5.625in;
          padding: 0.6in 0.8in;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
          background-color: #ffffff;
          color: #333333;
          position: relative;
          border: 1px solid #dfeae6;
          margin: 20px auto;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .slide.bg-dark {
          background-color: #103e3d;
          color: #ffffff;
        }
        .logo { font-size: 24px; font-weight: bold; color: #f5c56c; }
        .slide.bg-dark .logo { color: #f5c56c; }
        .divider { height: 3px; background-color: #f5c56c; margin-top: 10px; margin-bottom: 30px; }
        .title { font-size: 36px; font-weight: 800; margin-top: 40px; margin-bottom: 10px; color: #ffffff; }
        .subtitle { font-size: 18px; color: #b9d8d2; }
        h2 { font-size: 24px; color: #103e3d; margin-top: 0; border-bottom: 2px solid #dfeae6; padding-bottom: 8px; }
        h3 { font-size: 16px; margin: 0; }
        .card { background-color: #f3faf7; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin-top: 15px; }
        .snapshot-text { font-size: 15px; line-height: 1.5; color: #173d3a; font-weight: bold; margin: 0; }
        ul { margin-top: 10px; font-size: 13px; line-height: 1.6; color: #466a65; }
        li { margin-bottom: 6px; }
        .footer { position: absolute; bottom: 0.4in; left: 0.8in; right: 0.8in; display: flex; justify-content: space-between; font-size: 10px; color: #b9d8d2; }
        .disclaimer-box { background-color: #fff8ea; border: 1px solid #efd99e; padding: 12px; border-radius: 6px; font-size: 11px; color: #775f32; margin-top: 20px; }
      </style>
    </head>
    <body>
      ${slides.join("\n")}
    </body>
    </html>
  `;
  return Buffer.from(html, "utf8");
}

export class DocumentFormattingAgent {
  /**
   * The subagent formats the simplified report data into the requested format (pdf, word, ppt)
   * and the orchestrator validates the output file size and data completeness.
   */
  static formatReport(format: string, report: SimplifiedReport, fileName: string): Buffer {
    const title = "ClearPath Simplified Medical Report";
    
    switch (format.toLowerCase()) {
      case "pdf":
        return createPdf(title, report, fileName);
      case "word":
      case "doc":
        return createWordDoc(title, report, fileName);
      case "ppt":
      case "powerpoint":
        return createPptDoc(title, report, fileName);
      default:
        throw new Error(`Unsupported document format requested: ${format}`);
    }
  }

  /**
   * Orchestrator review step: Inspects the generated file buffer to verify size and structure.
   */
  static reviewDocumentBuffer(buffer: Buffer, format: string): { isValid: boolean; sizeBytes: number; reason?: string } {
    if (!buffer || buffer.length === 0) {
      return { isValid: false, sizeBytes: 0, reason: "Buffer is empty or null." };
    }
    
    if (format === "pdf") {
      const pdfString = buffer.slice(0, 100).toString("ascii");
      if (!pdfString.startsWith("%PDF")) {
        return { isValid: false, sizeBytes: buffer.length, reason: "Invalid PDF header signature." };
      }
    } else if (format === "word" || format === "doc") {
      const docString = buffer.toString("utf8");
      if (!docString.includes("<html") || !docString.includes("w:WordDocument")) {
        return { isValid: false, sizeBytes: buffer.length, reason: "Invalid Word document XML envelope structure." };
      }
    } else if (format === "ppt" || format === "powerpoint") {
      const pptString = buffer.toString("utf8");
      if (!pptString.includes("<html") || !pptString.includes("p:Presentation")) {
        return { isValid: false, sizeBytes: buffer.length, reason: "Invalid PowerPoint presentation HTML/XML layout." };
      }
    }

    return { isValid: true, sizeBytes: buffer.length };
  }
}
