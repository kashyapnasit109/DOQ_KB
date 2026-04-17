import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processAndStoreDocument } from "./pdf-processor";
import multer from "multer";
import fs from "fs";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files (JPEG, PNG, WebP) are allowed"));
    }
  },
});

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

/**
 * Get the OpenAI API key from environment variable first, then fallback to DB setting.
 * This way admin sets it once — engineers never see or configure it.
 */
function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY || storage.getSetting("openai_api_key");
}

/**
 * Get the admin PIN from environment variable first, then fallback to DB setting.
 */
function getAdminPin(): string {
  return process.env.ADMIN_PIN || storage.getSetting("admin_pin") || "1234";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH — Register & Login (server-side persistent profiles)
  // ═══════════════════════════════════════════════════════════════════════════

  // Register a new user
  app.post("/api/auth/register", (req, res) => {
    try {
      const { username, displayName, role, pin } = req.body;
      if (!username || !displayName) {
        return res.status(400).json({ error: "Username and display name are required" });
      }

      const existing = storage.getUserByUsername(username.toLowerCase().trim());
      if (existing) {
        return res.status(409).json({ error: "Username already taken" });
      }

      const user = storage.createUser({
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        role: role || "engineer",
        pin: role === "admin" && pin ? pin : null,
        createdAt: new Date().toISOString(),
      });

      // Don't send PIN back
      const { pin: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Registration failed" });
    }
  });

  // Login by username
  app.post("/api/auth/login", (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });

    const user = storage.getUserByUsername(username.toLowerCase().trim());
    if (!user) {
      return res.status(404).json({ error: "User not found. Please register first." });
    }

    const { pin: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // List all registered users (for login dropdown)
  app.get("/api/auth/users", (_req, res) => {
    const allUsers = storage.getAllUsers();
    // Strip PINs
    const safeUsers = allUsers.map(({ pin, ...rest }) => rest);
    res.json(safeUsers);
  });

  // Update user PIN (admin only)
  app.post("/api/auth/update-pin", (req, res) => {
    const { userId, oldPin, newPin } = req.body;
    const user = storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "admin") return res.status(403).json({ error: "Only admins can set PINs" });

    // Verify old PIN (or allow first-time setup)
    if (user.pin && user.pin !== oldPin) {
      return res.status(401).json({ error: "Current PIN is incorrect" });
    }

    storage.updateUser(userId, { pin: newPin });
    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM STATUS — For frontend to know if API key is configured
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/system/status", (_req, res) => {
    const apiKey = getApiKey();
    res.json({
      apiKeyConfigured: !!apiKey,
      apiKeySource: process.env.OPENAI_API_KEY ? "environment" : (storage.getSetting("openai_api_key") ? "database" : "none"),
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN SETTINGS — Protected by PIN
  // ═══════════════════════════════════════════════════════════════════════════

  // Verify admin PIN
  app.post("/api/admin/verify", (req, res) => {
    const { pin } = req.body;
    const correctPin = getAdminPin();
    if (pin === correctPin) {
      res.json({ verified: true });
    } else {
      res.status(401).json({ error: "Invalid admin PIN" });
    }
  });

  // Get admin settings (requires PIN in header)
  app.get("/api/admin/settings", (req, res) => {
    const pin = req.headers["x-admin-pin"] as string;
    if (pin !== getAdminPin()) {
      return res.status(401).json({ error: "Admin access required" });
    }

    const dbKey = storage.getSetting("openai_api_key");
    const envKey = process.env.OPENAI_API_KEY;

    res.json({
      openaiKeySet: !!(envKey || dbKey),
      openaiKeySource: envKey ? "environment" : (dbKey ? "database" : "none"),
      openaiKeyPreview: envKey
        ? `sk-...${envKey.slice(-4)} (from .env)`
        : dbKey
          ? `sk-...${dbKey.slice(-4)} (from database)`
          : null,
    });
  });

  // Save admin settings (requires PIN in header)
  app.post("/api/admin/settings", (req, res) => {
    const pin = req.headers["x-admin-pin"] as string;
    if (pin !== getAdminPin()) {
      return res.status(401).json({ error: "Admin access required" });
    }

    const { openaiApiKey, adminPin } = req.body;
    if (openaiApiKey !== undefined) {
      storage.setSetting("openai_api_key", openaiApiKey);
    }
    if (adminPin !== undefined) {
      storage.setSetting("admin_pin", adminPin);
    }
    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY SETTINGS — Keep for backward compatibility but simplified
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/settings", (_req, res) => {
    const apiKey = getApiKey();
    res.json({
      openaiKeySet: !!apiKey,
      openaiKeyPreview: apiKey ? `sk-...${apiKey.slice(-4)}` : null,
    });
  });

  app.post("/api/settings", (req, res) => {
    const { openaiApiKey } = req.body;
    if (openaiApiKey !== undefined) {
      storage.setSetting("openai_api_key", openaiApiKey);
    }
    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SITES
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/sites", (_req, res) => {
    const sites = storage.getAllSites();
    res.json(sites);
  });

  app.get("/api/sites/search", (req, res) => {
    const q = (req.query.q as string) || "";
    if (!q.trim()) return res.json(storage.getAllSites());
    const results = storage.searchSites(q.trim());
    res.json(results);
  });

  app.post("/api/sites", (req, res) => {
    try {
      const { code, name, location } = req.body;
      if (!code || !name) {
        return res.status(400).json({ error: "Site code and name are required" });
      }

      const existing = storage.getSiteByCode(code.toUpperCase());
      if (existing) {
        return res.status(409).json({ error: "Site code already exists", site: existing });
      }

      const site = storage.createSite({
        code: code.toUpperCase().trim(),
        name: name.trim(),
        location: location?.trim() || null,
        createdAt: new Date().toISOString(),
      });
      res.json(site);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create site" });
    }
  });

  app.get("/api/sites/:id", (req, res) => {
    const site = storage.getSite(Number(req.params.id));
    if (!site) return res.status(404).json({ error: "Site not found" });

    const summary = storage.getSiteSummary(site.id);
    const reports = storage.getDailyReportsBySite(site.id);

    res.json({ ...site, summary, reportCount: reports.length });
  });

  app.get("/api/sites/:id/reports", (req, res) => {
    const siteId = Number(req.params.id);
    const { date, from, to } = req.query;

    if (date) {
      return res.json(storage.getDailyReportsBySiteAndDate(siteId, date as string));
    }
    if (from && to) {
      return res.json(storage.getDailyReportsBySiteDateRange(siteId, from as string, to as string));
    }
    res.json(storage.getDailyReportsBySite(siteId));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS — Upload with site + date + uploader name
  // ═══════════════════════════════════════════════════════════════════════════

  app.post("/api/documents", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const siteId = req.body.siteId ? Number(req.body.siteId) : null;
      const reportDate = req.body.reportDate || null;
      const uploadedBy = req.body.uploadedBy || "Unknown";

      if (!siteId || !reportDate) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ error: "Site and report date are required" });
      }

      const site = storage.getSite(siteId);
      if (!site) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ error: "Selected site not found" });
      }

      const fileName = req.file.originalname || "Untitled";
      const isImage = req.file.mimetype.startsWith("image/");

      // Create document record with uploader info
      const doc = storage.createDocument({
        name: fileName,
        pageCount: 0,
        extractedText: "",
        status: "processing",
        uploadedAt: new Date().toISOString(),
        siteId: siteId,
        reportDate: reportDate,
        fileType: isImage ? "image" : "pdf",
        uploadedBy: uploadedBy,
      });

      // Get API key centrally — engineers don't need to configure this
      const apiKey = getApiKey();
      if (!apiKey) {
        storage.updateDocument(doc.id, {
          status: "error",
          errorMessage: "System not configured. Contact admin to set up the API key.",
        });
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.json(doc);
      }

      // Process in background with Vision API
      processAndStoreDocument(
        doc.id,
        req.file.path,
        req.file.mimetype,
        siteId,
        reportDate,
        apiKey
      ).catch((err) => {
        console.error(`Error processing document ${doc.id}:`, err);
        storage.updateDocument(doc.id, {
          status: "error",
          errorMessage: err.message || "Failed to process document",
        });
        try { fs.unlinkSync(req.file.path); } catch {}
      });

      res.json(doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  app.get("/api/documents", (_req, res) => {
    const docs = storage.getAllDocuments();
    res.json(docs);
  });

  app.get("/api/documents/:id", (req, res) => {
    const doc = storage.getDocument(Number(req.params.id));
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const reports = storage.getDailyReportsByDocument(doc.id);
    const site = doc.siteId ? storage.getSite(doc.siteId) : null;

    res.json({
      ...doc,
      site,
      reports: reports.map(r => ({
        ...r,
        structuredData: JSON.parse(r.structuredData || "{}"),
      })),
    });
  });

  app.delete("/api/documents/:id", (req, res) => {
    storage.deleteDocument(Number(req.params.id));
    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DAILY REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/reports/:id", (req, res) => {
    const report = storage.getDailyReport(Number(req.params.id));
    if (!report) return res.status(404).json({ error: "Report not found" });

    const equipment = storage.getEquipmentByReport(report.id);
    const materials = storage.getMaterialByReport(report.id);
    const labour = storage.getLabourByReport(report.id);
    const payments = storage.getPaymentsByReport(report.id);

    res.json({
      ...report,
      structuredData: JSON.parse(report.structuredData || "{}"),
      equipment,
      materials,
      labour,
      payments,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHATBOT — Available to all users
  // ═══════════════════════════════════════════════════════════════════════════

  app.post("/api/ask", async (req, res) => {
    try {
      const { question } = req.body;
      if (!question) return res.status(400).json({ error: "Question is required" });

      const apiKey = getApiKey();
      if (!apiKey) {
        return res.status(400).json({
          error: "System not configured. Contact admin to set up the API key.",
        });
      }

      const allContext = storage.buildAllSitesContext();
      if (allContext === "No data available. Upload some documents first.") {
        return res.status(400).json({
          error: "No reports available. Upload some daily reports first.",
        });
      }

      const maxChars = 80000;
      const context = allContext.length > maxChars
        ? allContext.substring(0, maxChars) + "\n[...truncated]"
        : allContext;

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
              role: "system",
              content: `You are a construction site data analyst assistant for a government construction firm. 
You have access to structured daily reports from various construction sites.

The data includes:
- Equipment usage (hours worked, diesel consumption)
- Material usage (cement bags, steel, sand — quantities and balance)
- Labour records (Mistri = skilled workers, Helper = unskilled workers)
- Payment records (amounts paid for masonry, individual workers, etc.)
- Centering/shuttering work details
- Masonry (Rokdi) work breakdown by location
- Infrastructure measurements

When answering questions:
1. Be PRECISE with numbers — cite exact quantities from the data
2. Always mention the date and site name in your answer
3. If asked about totals across dates, calculate them accurately
4. If data is not available, say so clearly
5. Format monetary amounts with ₹ symbol
6. Use tables or bullet points for clarity when listing multiple items
7. Flag any anomalies you notice (unusually high/low numbers)`,
            },
            {
              role: "user",
              content: `Here is the structured data from all construction sites:\n\n${context}\n\nQuestion: ${question}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errBody}`);
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || "No answer generated.";

      const conv = storage.createConversation({
        question,
        answer,
        sourceDocs: "[]",
        createdAt: new Date().toISOString(),
      });

      res.json(conv);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate answer" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/conversations", (_req, res) => {
    res.json(storage.getAllConversations());
  });

  app.delete("/api/conversations", (_req, res) => {
    storage.clearConversations();
    res.json({ ok: true });
  });

  return httpServer;
}
