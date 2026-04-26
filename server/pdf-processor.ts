/**
 * PDF/Image → GPT-4o Vision API → Structured JSON
 * 
 * This module handles the core AI pipeline:
 * 1. Accept PDF or image files
 * 2. Convert PDF pages to images (or use images directly)
 * 3. Send to GPT-4o Vision API with construction-domain prompt
 * 4. Parse response into structured transaction data
 * 5. Store in respective database tables
 */

import fs from "fs";
import path from "path";
import { storage } from "./storage";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedReport {
  metadata: {
    site_code: string;
    site_name: string;
    date: string;
    reported_by: string;
    page_number: number;
  };
  equipment_usage: Array<{
    equipment: string;
    working_hours: number | null;
    diesel_used: string;
    remarks: string;
  }>;
  material_usage: Array<{
    material: string;
    quantity_used: number | null;
    unit: string;
    balance: number | null;
    remarks: string;
  }>;
  centering_work: Array<{
    work_type: string;
    mistri_count: number;
    helper_count: number;
    remarks: string;
  }>;
  department_labour: {
    tasks: string[];
    total_labour: number;
    curing_labour: number;
    remarks: string;
  };
  infrastructure: Array<{
    type: string;
    measurement: number | null;
    unit: string;
    remarks: string;
  }>;
  masonry_rokdi: {
    total_mistri: number;
    total_helper: number;
    total_payment: number | null;
    payment_for_dates: string;
    breakdown: Array<{
      location: string;
      mistri: number;
      helper: number;
    }>;
  } | null;
  individual_payments: Array<{
    category: string;
    count: number;
    amount: number | null;
    person: string;
    remarks: string;
  }>;
  plumbing: Array<{
    location: string;
    person: string;
    remarks: string;
  }>;
  other_entries: Array<{
    description: string;
    details: string;
    remarks: string;
  }>;
  summary: {
    total_cement_bags: number;
    total_mistri: number;
    total_helpers: number;
    total_labour: number;
    total_payments: number;
    equipment_hours: number;
  };
}

// ─── Vision API Prompt ───────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are an expert at reading handwritten Indian construction site daily reports.
You will receive an image of a handwritten daily report page from a government construction site.

Extract ALL information into a structured JSON format. Read EVERY line carefully.

Return ONLY a valid JSON object with this EXACT structure (no markdown, no code fences, no explanations):

{
  "metadata": {
    "site_code": "string (e.g. SOU, abbreviation if visible)",
    "site_name": "string (full site name if visible)",
    "date": "string (YYYY-MM-DD format, convert from DD-MM-YY or DD/MM/YYYY)",
    "reported_by": "string (name of person who wrote the report)",
    "page_number": 1
  },
  "equipment_usage": [
    {
      "equipment": "string (e.g. Floxy, JCB, Crane, Mixer)",
      "working_hours": number_or_null,
      "diesel_used": "string (amount or Nil)",
      "remarks": "string"
    }
  ],
  "material_usage": [
    {
      "material": "string (e.g. Cement, Steel, Sand, Aggregate)",
      "quantity_used": number_or_null,
      "unit": "string (bags, kg, ton, CFT, brass, etc.)",
      "balance": number_or_null,
      "remarks": "string"
    }
  ],
  "centering_work": [
    {
      "work_type": "string (e.g. Column shuttering, Slab steel cutting)",
      "mistri_count": number,
      "helper_count": number,
      "remarks": "string"
    }
  ],
  "department_labour": {
    "tasks": ["string array of all tasks listed"],
    "total_labour": number,
    "curing_labour": number,
    "remarks": "string"
  },
  "infrastructure": [
    {
      "type": "string (e.g. Inspection road, Boundary wall)",
      "measurement": number_or_null,
      "unit": "string (ft, m, etc.)",
      "remarks": "string"
    }
  ],
  "masonry_rokdi": {
    "total_mistri": number,
    "total_helper": number,
    "total_payment": number_or_null,
    "payment_for_dates": "string",
    "breakdown": [
      { "location": "string", "mistri": number, "helper": number }
    ]
  },
  "individual_payments": [
    {
      "category": "string",
      "count": number,
      "amount": number_or_null,
      "person": "string",
      "remarks": "string"
    }
  ],
  "plumbing": [
    {
      "location": "string",
      "person": "string",
      "remarks": "string"
    }
  ],
  "other_entries": [
    {
      "description": "string (any line item not fitting above categories)",
      "details": "string",
      "remarks": "string"
    }
  ],
  "summary": {
    "total_cement_bags": number,
    "total_mistri": number,
    "total_helpers": number,
    "total_labour": number,
    "total_payments": number,
    "equipment_hours": number
  }
}

CRITICAL RULES:
1. Read numbers VERY carefully. Double-check every digit. "92" is not "42" or "97".
2. "Nil" means zero/none for diesel or other quantities.
3. "Mistri" = skilled mason/worker, "Helper" = unskilled assistant.
4. Correctly identify Hindi/Gujarati construction terms:
   - "Senting" = Centering, "Rokdi" = Stone masonry work
   - "Depart labour" = Department labour
   - "Floxy" = Welding/cutting machine
5. If a number is unclear, provide your best reading and note uncertainty in remarks.
6. ALL monetary amounts are in Indian Rupees (₹). Do NOT add currency symbols.
7. Convert dates to YYYY-MM-DD format (e.g., "8-4-26" → "2026-04-08").
8. If a section has no data, use empty array [] or null.
9. In the summary, calculate totals across ALL sections accurately.
10. Return ONLY the JSON object. No markdown formatting, no code blocks.`;

// ─── Core Processing Functions ───────────────────────────────────────────────

/**
 * Convert a file (PDF or image) to base64 image(s) ready for Vision API
 */
export async function fileToBase64Images(filePath: string, mimeType: string): Promise<Array<{ base64: string; mime: string }>> {
  const buffer = fs.readFileSync(filePath);

  // If it's already an image, just base64 encode it
  if (mimeType.startsWith("image/")) {
    return [{
      base64: buffer.toString("base64"),
      mime: mimeType
    }];
  }

  // For PDFs, try to render pages to images
  if (mimeType === "application/pdf") {
    return await pdfToImages(buffer);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Convert PDF buffer to array of base64 PNG images (one per page)
 * Uses pdfjs-dist with canvas rendering
 */
async function pdfToImages(pdfBuffer: Buffer): Promise<Array<{ base64: string; mime: string }>> {
  const images: Array<{ base64: string; mime: string }> = [];

  try {
    // Try using @napi-rs/canvas for PDF rendering
    const { createCanvas } = await import("@napi-rs/canvas");
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const pdf = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // High res for handwriting

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      await page.render({
        canvasContext: context as any,
        viewport,
      }).promise;

      const pngBuffer = canvas.toBuffer("image/png");
      images.push({
        base64: pngBuffer.toString("base64"),
        mime: "image/png"
      });
    }

    return images;
  } catch (canvasError: any) {
    console.warn("Canvas-based PDF rendering failed:", canvasError.message);
    console.log("Falling back to text extraction from PDF...");

    // Fallback: extract text from PDF using pdfjs-dist (works without canvas)
    try {
      const extractedText = await extractTextFromPdf(pdfBuffer);
      if (extractedText && extractedText.trim().length > 50) {
        console.log(`[PDF Processor] Extracted ${extractedText.length} chars of text from PDF`);
        // Return text as a special marker — the Vision API caller will handle this
        return [{
          base64: Buffer.from(extractedText, "utf-8").toString("base64"),
          mime: "text/plain"
        }];
      }
    } catch (textError: any) {
      console.warn("Text extraction also failed:", textError.message);
    }

    // Final fallback: create a placeholder indicating manual processing needed
    throw new Error("PDF processing failed: Canvas rendering and text extraction both unavailable. Please upload images (JPEG/PNG) of the report pages instead.");
  }
}

/**
 * Extract text content from a PDF using pdfjs-dist (no canvas required)
 */
async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += `\n--- Page ${i} ---\n${pageText}\n`;
  }
  
  return fullText;
}

/**
 * Send image(s) to GPT-4o Vision API and extract structured data
 */
export async function extractWithVisionAPI(
  images: Array<{ base64: string; mime: string }>,
  apiKey: string,
  additionalContext?: string
): Promise<ParsedReport> {

  // Check if we have extracted text (fallback mode) instead of images
  const hasTextOnly = images.length === 1 && images[0].mime === "text/plain";

  const userContent: any[] = [
    { type: "text", text: EXTRACTION_PROMPT },
  ];

  if (hasTextOnly) {
    // Text extraction fallback — send extracted text as a text message
    const extractedText = Buffer.from(images[0].base64, "base64").toString("utf-8");
    userContent.push({
      type: "text",
      text: `\n\nHere is the extracted text from the PDF report:\n\n${extractedText}`
    });
  } else {
    // Normal mode — send images to Vision API
    const imageContent = images.map(img => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mime};base64,${img.base64}`,
        detail: "high" as const
      }
    }));
    userContent.push(...imageContent);
  }

  if (additionalContext) {
    userContent.push({
      type: "text",
      text: `\nAdditional context: ${additionalContext}`
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI Vision API error: ${response.status} - ${errBody}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || "";

  // Parse the JSON response - handle potential markdown code fences
  let jsonText = rawText.trim();
  
  // Remove markdown code fences if present
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  try {
    const parsed: ParsedReport = JSON.parse(jsonText);
    return parsed;
  } catch (parseError) {
    console.error("Failed to parse AI response as JSON:", rawText.substring(0, 500));
    throw new Error("AI returned invalid JSON. Raw response saved for debugging.");
  }
}

/**
 * Main processing pipeline: File → Vision API → Database
 */
export async function processAndStoreDocument(
  docId: number,
  filePath: string,
  mimeType: string,
  siteId: number,
  reportDate: string,
  apiKey: string
): Promise<{ report: any; structured: ParsedReport }> {
  console.log(`[PDF Processor] Starting processing for document ${docId}`);
  console.log(`[PDF Processor] File: ${filePath}, Type: ${mimeType}`);

  // Step 1: Convert file to images
  console.log("[PDF Processor] Converting file to images...");
  const images = await fileToBase64Images(filePath, mimeType);
  console.log(`[PDF Processor] Got ${images.length} image(s)`);

  // Step 2: Extract structured data via Vision API
  console.log("[PDF Processor] Sending to GPT-4o Vision API...");
  const site = await storage.getSite(siteId);
  const additionalContext = site 
    ? `This report is from site: ${site.name} (${site.code}), date: ${reportDate}` 
    : undefined;

  const structured = await extractWithVisionAPI(images, apiKey, additionalContext);
  console.log("[PDF Processor] Received structured data from AI");

  // Step 3: Create daily report record
  const report = await storage.createDailyReport({
    documentId: docId,
    siteId: siteId,
    reportDate: reportDate,
    reportedBy: structured.metadata?.reported_by || null,
    structuredData: JSON.stringify(structured),
    rawExtraction: JSON.stringify(structured),
    createdAt: new Date().toISOString(),
  });
  console.log(`[PDF Processor] Created daily report ${report.id}`);

  // Step 4: Store individual records in respective tables
  await storeStructuredData(report.id, structured);
  console.log("[PDF Processor] Stored all structured records");

  // Step 5: Update document status
  const summaryText = buildTextSummary(structured, reportDate);
  await storage.updateDocument(docId, {
    status: "ready",
    pageCount: images.length,
    extractedText: summaryText,
  });

  // Step 6: Clean up uploaded file
  try { fs.unlinkSync(filePath); } catch {}

  console.log(`[PDF Processor] ✅ Document ${docId} processed successfully`);
  return { report, structured };
}

/**
 * Store the parsed structured data into individual database tables
 */
async function storeStructuredData(reportId: number, data: ParsedReport): Promise<void> {
  // Equipment Usage
  if (data.equipment_usage) {
    for (const equip of data.equipment_usage) {
      await storage.createEquipmentUsage({
        reportId, equipment: equip.equipment,
        workingHours: equip.working_hours, dieselUsed: equip.diesel_used || "Nil",
        remarks: equip.remarks || null,
      });
    }
  }

  // Material Usage
  if (data.material_usage) {
    for (const mat of data.material_usage) {
      await storage.createMaterialUsage({
        reportId, material: mat.material,
        quantityUsed: mat.quantity_used, unit: mat.unit || "",
        balance: mat.balance, remarks: mat.remarks || null,
      });
    }
  }

  // Centering Work
  if (data.centering_work) {
    for (const cw of data.centering_work) {
      await storage.createLabourRecord({
        reportId, category: "centering", workDescription: cw.work_type,
        location: null, mistriCount: cw.mistri_count || 0, helperCount: cw.helper_count || 0,
        totalLabour: (cw.mistri_count || 0) + (cw.helper_count || 0), remarks: cw.remarks || null,
      });
    }
  }

  // Department Labour
  if (data.department_labour) {
    for (const task of data.department_labour.tasks || []) {
      await storage.createLabourRecord({
        reportId, category: "department", workDescription: task,
        location: null, mistriCount: 0, helperCount: 0, totalLabour: 0, remarks: null,
      });
    }
    if (data.department_labour.total_labour > 0) {
      await storage.createLabourRecord({
        reportId, category: "department_total",
        workDescription: `Total department labour`, location: null,
        mistriCount: 0, helperCount: 0, totalLabour: data.department_labour.total_labour,
        remarks: data.department_labour.curing_labour > 0 ? `${data.department_labour.curing_labour} for curing` : null,
      });
    }
  }

  // Masonry / Rokdi
  if (data.masonry_rokdi) {
    const rokdi = data.masonry_rokdi;
    for (const loc of rokdi.breakdown || []) {
      await storage.createLabourRecord({
        reportId, category: "masonry", workDescription: "Rokdi",
        location: loc.location, mistriCount: loc.mistri || 0, helperCount: loc.helper || 0,
        totalLabour: (loc.mistri || 0) + (loc.helper || 0), remarks: null,
      });
    }
    if (rokdi.total_payment) {
      await storage.createPaymentRecord({
        reportId, category: "masonry_rokdi",
        description: `Rokdi work - ${rokdi.total_mistri} mistri, ${rokdi.total_helper} helper`,
        person: null, amount: rokdi.total_payment,
        paymentDate: rokdi.payment_for_dates || null, remarks: null,
      });
    }
  }

  // Individual Payments
  if (data.individual_payments) {
    for (const pay of data.individual_payments) {
      await storage.createPaymentRecord({
        reportId, category: pay.category || "individual",
        description: pay.category, person: pay.person || null,
        amount: pay.amount, paymentDate: null, remarks: pay.remarks || null,
      });
    }
  }

  // Plumbing
  if (data.plumbing) {
    for (const plumb of data.plumbing) {
      await storage.createLabourRecord({
        reportId, category: "plumbing", workDescription: "Plumbing work",
        location: plumb.location, mistriCount: 0, helperCount: 0,
        totalLabour: 1, remarks: plumb.person || null,
      });
    }
  }

  // Other entries
  if (data.other_entries) {
    for (const entry of data.other_entries) {
      await storage.createLabourRecord({
        reportId, category: "other", workDescription: entry.description,
        location: null, mistriCount: 0, helperCount: 0,
        totalLabour: 0, remarks: entry.details || null,
      });
    }
  }
}

/**
 * Build a human-readable text summary from structured data (used for AI context)
 */
function buildTextSummary(data: ParsedReport, reportDate: string): string {
  let text = `Daily Report - ${reportDate}\n`;
  text += `Reported by: ${data.metadata?.reported_by || 'N/A'}\n\n`;

  if (data.equipment_usage?.length) {
    text += "EQUIPMENT:\n";
    for (const e of data.equipment_usage) {
      text += `  - ${e.equipment}: ${e.working_hours || 'N/A'} hours, Diesel: ${e.diesel_used}\n`;
    }
    text += "\n";
  }

  if (data.material_usage?.length) {
    text += "MATERIALS:\n";
    for (const m of data.material_usage) {
      text += `  - ${m.material}: ${m.quantity_used || 'N/A'} ${m.unit || ''} used`;
      if (m.balance != null) text += `, balance: ${m.balance}`;
      text += "\n";
    }
    text += "\n";
  }

  if (data.centering_work?.length) {
    text += "CENTERING:\n";
    for (const c of data.centering_work) {
      text += `  - ${c.work_type}: ${c.mistri_count} mistri, ${c.helper_count} helper\n`;
    }
    text += "\n";
  }

  if (data.department_labour?.tasks?.length) {
    text += "DEPARTMENT LABOUR:\n";
    for (const t of data.department_labour.tasks) {
      text += `  - ${t}\n`;
    }
    text += `  Total: ${data.department_labour.total_labour} labour, ${data.department_labour.curing_labour} for curing\n\n`;
  }

  if (data.masonry_rokdi) {
    text += "MASONRY (ROKDI):\n";
    text += `  Total: ${data.masonry_rokdi.total_mistri} mistri, ${data.masonry_rokdi.total_helper} helper\n`;
    if (data.masonry_rokdi.total_payment) {
      text += `  Payment: ₹${data.masonry_rokdi.total_payment} (for ${data.masonry_rokdi.payment_for_dates})\n`;
    }
    for (const b of data.masonry_rokdi.breakdown || []) {
      text += `    - ${b.location}: ${b.mistri} mistri, ${b.helper} helper\n`;
    }
    text += "\n";
  }

  if (data.individual_payments?.length) {
    text += "PAYMENTS:\n";
    for (const p of data.individual_payments) {
      text += `  - ${p.category}: ${p.count} person(s), ₹${p.amount || 'N/A'}\n`;
    }
    text += "\n";
  }

  if (data.summary) {
    text += "SUMMARY:\n";
    text += `  Cement bags: ${data.summary.total_cement_bags}\n`;
    text += `  Total mistri: ${data.summary.total_mistri}\n`;
    text += `  Total helpers: ${data.summary.total_helpers}\n`;
    text += `  Total labour: ${data.summary.total_labour}\n`;
    text += `  Total payments: ₹${data.summary.total_payments}\n`;
    text += `  Equipment hours: ${data.summary.equipment_hours}\n`;
  }

  return text;
}
