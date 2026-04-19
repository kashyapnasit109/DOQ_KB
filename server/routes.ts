import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processAndStoreDocument } from "./pdf-processor";
import multer from "multer";
import fs from "fs";
import path from "path";

// Use /tmp on Vercel (read-only filesystem except /tmp)
const uploadDir = process.env.VERCEL ? "/tmp/uploads" : "uploads";

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF and image files (JPEG, PNG, WebP) are allowed"));
  },
});

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function getApiKey(): Promise<string | undefined> {
  return process.env.OPENAI_API_KEY || await storage.getSetting("openai_api_key");
}

async function getAdminPin(): Promise<string> {
  return process.env.ADMIN_PIN || await storage.getSetting("admin_pin") || "1234";
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // Initialize database
  await storage.ensureInit();

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════════

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, displayName, role, pin } = req.body;
      if (!username || !displayName)
        return res.status(400).json({ error: "Username and display name are required" });

      const existing = await storage.getUserByUsername(username.toLowerCase().trim());
      if (existing) return res.status(409).json({ error: "Username already taken" });

      const user = await storage.createUser({
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        role: role || "engineer",
        pin: role === "admin" && pin ? pin : null,
        createdAt: new Date().toISOString(),
      });
      const { pin: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });
    const user = await storage.getUserByUsername(username.toLowerCase().trim());
    if (!user) return res.status(404).json({ error: "User not found. Please register first." });
    const { pin: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.get("/api/auth/users", async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    const safeUsers = allUsers.map(({ pin, ...rest }) => rest);
    res.json(safeUsers);
  });

  app.post("/api/auth/update-pin", async (req, res) => {
    const { userId, oldPin, newPin } = req.body;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "admin") return res.status(403).json({ error: "Only admins can set PINs" });
    if (user.pin && user.pin !== oldPin) return res.status(401).json({ error: "Current PIN is incorrect" });
    await storage.updateUser(userId, { pin: newPin });
    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/system/status", async (_req, res) => {
    const apiKey = await getApiKey();
    const dbKey = await storage.getSetting("openai_api_key");
    res.json({
      apiKeyConfigured: !!apiKey,
      apiKeySource: process.env.OPENAI_API_KEY ? "environment" : (dbKey ? "database" : "none"),
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  app.post("/api/admin/verify", async (req, res) => {
    const { pin } = req.body;
    const correctPin = await getAdminPin();
    if (pin === correctPin) res.json({ verified: true });
    else res.status(401).json({ error: "Invalid admin PIN" });
  });

  app.get("/api/admin/settings", async (req, res) => {
    const pin = req.headers["x-admin-pin"] as string;
    if (pin !== await getAdminPin()) return res.status(401).json({ error: "Admin access required" });
    const dbKey = await storage.getSetting("openai_api_key");
    const envKey = process.env.OPENAI_API_KEY;
    res.json({
      openaiKeySet: !!(envKey || dbKey),
      openaiKeySource: envKey ? "environment" : (dbKey ? "database" : "none"),
      openaiKeyPreview: envKey ? `sk-...${envKey.slice(-4)} (from .env)` : dbKey ? `sk-...${dbKey.slice(-4)} (from database)` : null,
    });
  });

  app.post("/api/admin/settings", async (req, res) => {
    const pin = req.headers["x-admin-pin"] as string;
    if (pin !== await getAdminPin()) return res.status(401).json({ error: "Admin access required" });
    const { openaiApiKey, adminPin } = req.body;
    if (openaiApiKey !== undefined) await storage.setSetting("openai_api_key", openaiApiKey);
    if (adminPin !== undefined) await storage.setSetting("admin_pin", adminPin);
    res.json({ ok: true });
  });

  // Legacy settings
  app.get("/api/settings", async (_req, res) => {
    const apiKey = await getApiKey();
    res.json({ openaiKeySet: !!apiKey, openaiKeyPreview: apiKey ? `sk-...${apiKey.slice(-4)}` : null });
  });

  app.post("/api/settings", async (req, res) => {
    const { openaiApiKey } = req.body;
    if (openaiApiKey !== undefined) await storage.setSetting("openai_api_key", openaiApiKey);
    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SITES
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/sites", async (_req, res) => { res.json(await storage.getAllSites()); });

  app.get("/api/sites/search", async (req, res) => {
    const q = (req.query.q as string) || "";
    if (!q.trim()) return res.json(await storage.getAllSites());
    res.json(await storage.searchSites(q.trim()));
  });

  app.post("/api/sites", async (req, res) => {
    try {
      const { code, name, location } = req.body;
      if (!code || !name) return res.status(400).json({ error: "Site code and name are required" });
      const existing = await storage.getSiteByCode(code.toUpperCase());
      if (existing) return res.status(409).json({ error: "Site code already exists", site: existing });
      const site = await storage.createSite({
        code: code.toUpperCase().trim(), name: name.trim(),
        location: location?.trim() || null, createdAt: new Date().toISOString(),
      });
      res.json(site);
    } catch (err: any) { res.status(500).json({ error: err.message || "Failed to create site" }); }
  });

  app.get("/api/sites/:id", async (req, res) => {
    const site = await storage.getSite(Number(req.params.id));
    if (!site) return res.status(404).json({ error: "Site not found" });
    const summary = await storage.getSiteSummary(site.id);
    const reports = await storage.getDailyReportsBySite(site.id);
    res.json({ ...site, summary, reportCount: reports.length });
  });

  app.get("/api/sites/:id/reports", async (req, res) => {
    const siteId = Number(req.params.id);
    const { date, from, to } = req.query;
    if (date) return res.json(await storage.getDailyReportsBySiteAndDate(siteId, date as string));
    if (from && to) return res.json(await storage.getDailyReportsBySiteDateRange(siteId, from as string, to as string));
    res.json(await storage.getDailyReportsBySite(siteId));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  app.post("/api/documents", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const siteId = req.body.siteId ? Number(req.body.siteId) : null;
      const reportDate = req.body.reportDate || null;
      const uploadedBy = req.body.uploadedBy || "Unknown";

      if (!siteId || !reportDate) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ error: "Site and report date are required" });
      }

      const site = await storage.getSite(siteId);
      if (!site) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ error: "Selected site not found" });
      }

      const fileName = req.file.originalname || "Untitled";
      const isImage = req.file.mimetype.startsWith("image/");

      const doc = await storage.createDocument({
        name: fileName, pageCount: 0, extractedText: "", status: "processing",
        uploadedAt: new Date().toISOString(), siteId, reportDate,
        fileType: isImage ? "image" : "pdf", uploadedBy,
      });

      const apiKey = await getApiKey();
      if (!apiKey) {
        await storage.updateDocument(doc.id, { status: "error", errorMessage: "System not configured. Contact admin to set up the API key." });
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.json(doc);
      }

      processAndStoreDocument(doc.id, req.file.path, req.file.mimetype, siteId, reportDate, apiKey)
        .catch(async (err) => {
          console.error(`Error processing document ${doc.id}:`, err);
          await storage.updateDocument(doc.id, { status: "error", errorMessage: err.message || "Failed to process document" });
          try { fs.unlinkSync(req.file.path); } catch {}
        });

      res.json(doc);
    } catch (err: any) { res.status(500).json({ error: err.message || "Upload failed" }); }
  });

  app.get("/api/documents", async (_req, res) => { res.json(await storage.getAllDocuments()); });

  app.get("/api/documents/:id", async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const reports = await storage.getDailyReportsByDocument(doc.id);
    const site = doc.siteId ? await storage.getSite(doc.siteId) : null;
    res.json({
      ...doc, site,
      reports: reports.map(r => ({ ...r, structuredData: JSON.parse(r.structuredData || "{}") })),
    });
  });

  app.delete("/api/documents/:id", async (req, res) => {
    await storage.deleteDocument(Number(req.params.id));
    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DAILY REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/reports/:id", async (req, res) => {
    const report = await storage.getDailyReport(Number(req.params.id));
    if (!report) return res.status(404).json({ error: "Report not found" });
    const equipment = await storage.getEquipmentByReport(report.id);
    const materials = await storage.getMaterialByReport(report.id);
    const labour = await storage.getLabourByReport(report.id);
    const payments = await storage.getPaymentsByReport(report.id);
    res.json({ ...report, structuredData: JSON.parse(report.structuredData || "{}"), equipment, materials, labour, payments });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHATBOT
  // ═══════════════════════════════════════════════════════════════════════════

  app.post("/api/ask", async (req, res) => {
    try {
      const { question } = req.body;
      if (!question) return res.status(400).json({ error: "Question is required" });

      const apiKey = await getApiKey();
      if (!apiKey) return res.status(400).json({ error: "System not configured. Contact admin to set up the API key." });

      const allContext = await storage.buildAllSitesContext();
      if (allContext === "No data available. Upload some documents first.")
        return res.status(400).json({ error: "No reports available. Upload some daily reports first." });

      const maxChars = 80000;
      const context = allContext.length > maxChars ? allContext.substring(0, maxChars) + "\n[...truncated]" : allContext;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a construction site data analyst assistant for Kashyap Builders, a government construction firm.
You have access to structured daily reports from various construction sites.

The data includes: Equipment usage (hours, diesel), Material usage (cement, steel, sand), Labour records (Mistri/Helper counts), Payment records, Centering/shuttering work, Masonry breakdown.

Rules: 1. Be PRECISE with numbers 2. Always cite date + site name 3. Calculate totals accurately 4. Format amounts with ₹ 5. Use tables/bullets for clarity 6. Flag anomalies`
            },
            { role: "user", content: `Here is the structured data from all construction sites:\n\n${context}\n\nQuestion: ${question}` },
          ],
          temperature: 0.2, max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errBody}`);
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || "No answer generated.";
      const conv = await storage.createConversation({ question, answer, sourceDocs: "[]", createdAt: new Date().toISOString() });
      res.json(conv);
    } catch (err: any) { res.status(500).json({ error: err.message || "Failed to generate answer" }); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/conversations", async (_req, res) => { res.json(await storage.getAllConversations()); });
  app.delete("/api/conversations", async (_req, res) => { await storage.clearConversations(); res.json({ ok: true }); });

  return httpServer;
}
