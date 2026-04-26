import {
  type Document, type InsertDocument, documents,
  type Conversation, type InsertConversation, conversations,
  type Setting, settings,
  type User, type InsertUser, users,
  type Site, type InsertSite, sites,
  type DailyReport, type InsertDailyReport, dailyReports,
  type EquipmentUsage, type InsertEquipmentUsage, equipmentUsage,
  type MaterialUsage, type InsertMaterialUsage, materialUsage,
  type LabourRecord, type InsertLabourRecord, labourRecords,
  type PaymentRecord, type InsertPaymentRecord, paymentRecords,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq, desc, and, like, sql } from "drizzle-orm";

// ─── Database Connection ────────────────────────────────────────────────────
// Uses Turso (cloud) if TURSO_DATABASE_URL is set, otherwise local SQLite file.
// On Vercel, if Turso is not configured, it uses /tmp/data.db (ephemeral) so the app works temporarily.

const isVercel = process.env.VERCEL === "1";
const dbUrl = process.env.TURSO_DATABASE_URL
  ? process.env.TURSO_DATABASE_URL
  : isVercel
  ? "file:/tmp/data.db"
  : "file:data.db";

const client = createClient(
  process.env.TURSO_DATABASE_URL
    ? {
        url: dbUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : {
        url: dbUrl,
      }
);

export const db = drizzle(client);

// ─── Schema Initialization ──────────────────────────────────────────────────

let initialized = false;

async function initializeDatabase() {
  if (initialized) return;

  // Turso HTTP client does NOT support executeMultiple — must execute each statement individually
  const statements = [
    `CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      page_count INTEGER NOT NULL DEFAULT 0,
      extracted_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'processing',
      error_message TEXT,
      uploaded_at TEXT NOT NULL,
      site_id INTEGER,
      report_date TEXT,
      file_type TEXT DEFAULT 'pdf',
      uploaded_by TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      source_docs TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'engineer',
      pin TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      location TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      site_id INTEGER NOT NULL,
      report_date TEXT NOT NULL,
      raw_extraction TEXT,
      structured_data TEXT,
      summary TEXT,
      reported_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (site_id) REFERENCES sites(id)
    )`,
    `CREATE TABLE IF NOT EXISTS equipment_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      equipment TEXT NOT NULL,
      working_hours REAL,
      diesel_used TEXT,
      remarks TEXT,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    )`,
    `CREATE TABLE IF NOT EXISTS material_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      material TEXT NOT NULL,
      quantity_used REAL,
      unit TEXT,
      balance REAL,
      remarks TEXT,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    )`,
    `CREATE TABLE IF NOT EXISTS labour_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      mistri_count INTEGER,
      helper_count INTEGER,
      labour_count INTEGER,
      remarks TEXT,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    )`,
    `CREATE TABLE IF NOT EXISTS payment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      person TEXT,
      amount REAL,
      payment_date TEXT,
      remarks TEXT,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    )`,
  ];

  // Migration: drop tables with old column names to force recreation
  const migrations = [
    `DROP TABLE IF EXISTS equipment_usage`,
  ];

  for (const stmt of migrations) {
    try { await client.execute(stmt); } catch (e: any) { console.warn("Migration warn:", e.message); }
  }

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  initialized = true;
}

// ─── Storage Class (all async) ──────────────────────────────────────────────

export class DatabaseStorage {

  async ensureInit() {
    if (!initialized) await initializeDatabase();
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async createUser(user: InsertUser): Promise<User> {
    await this.ensureInit();
    return (await db.insert(users).values(user).returning().get())!;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInit();
    return await db.select().from(users).where(eq(users.username, username.toLowerCase())).get();
  }

  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInit();
    return await db.select().from(users).where(eq(users.id, id)).get();
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInit();
    return await db.select().from(users).orderBy(desc(users.id)).all();
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    await this.ensureInit();
    return await db.update(users).set(updates).where(eq(users.id, id)).returning().get();
  }

  async deleteUser(id: number): Promise<void> {
    await this.ensureInit();
    await db.delete(users).where(eq(users.id, id)).run();
  }

  // ─── Documents ───────────────────────────────────────────────────────────────

  async createDocument(doc: InsertDocument): Promise<Document> {
    await this.ensureInit();
    return (await db.insert(documents).values(doc).returning().get())!;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    await this.ensureInit();
    return await db.select().from(documents).where(eq(documents.id, id)).get();
  }

  async getAllDocuments(): Promise<Document[]> {
    await this.ensureInit();
    return await db.select().from(documents).orderBy(desc(documents.id)).all();
  }

  async getDocumentsBySite(siteId: number): Promise<Document[]> {
    await this.ensureInit();
    return await db.select().from(documents).where(eq(documents.siteId, siteId)).orderBy(desc(documents.id)).all();
  }

  async updateDocument(id: number, updates: Partial<InsertDocument>): Promise<Document | undefined> {
    await this.ensureInit();
    return await db.update(documents).set(updates).where(eq(documents.id, id)).returning().get();
  }

  async deleteDocument(id: number): Promise<void> {
    await this.ensureInit();
    const reports = await db.select().from(dailyReports).where(eq(dailyReports.documentId, id)).all();
    for (const report of reports) {
      await this.deleteDailyReportCascade(report.id);
    }
    await db.delete(documents).where(eq(documents.id, id)).run();
  }

  // ─── Conversations ──────────────────────────────────────────────────────────

  async createConversation(conv: InsertConversation): Promise<Conversation> {
    await this.ensureInit();
    return (await db.insert(conversations).values(conv).returning().get())!;
  }

  async getAllConversations(): Promise<Conversation[]> {
    await this.ensureInit();
    return await db.select().from(conversations).orderBy(desc(conversations.id)).all();
  }

  async deleteConversation(id: number): Promise<void> {
    await this.ensureInit();
    await db.delete(conversations).where(eq(conversations.id, id)).run();
  }

  async clearConversations(): Promise<void> {
    await this.ensureInit();
    await db.delete(conversations).run();
  }

  // ─── Settings ────────────────────────────────────────────────────────────────

  async getSetting(key: string): Promise<string | undefined> {
    await this.ensureInit();
    const row = await db.select().from(settings).where(eq(settings.key, key)).get();
    return row?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.ensureInit();
    const existing = await db.select().from(settings).where(eq(settings.key, key)).get();
    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.key, key)).run();
    } else {
      await db.insert(settings).values({ key, value }).run();
    }
  }

  // ─── Sites ──────────────────────────────────────────────────────────────────

  async createSite(site: InsertSite): Promise<Site> {
    await this.ensureInit();
    return (await db.insert(sites).values(site).returning().get())!;
  }

  async getSite(id: number): Promise<Site | undefined> {
    await this.ensureInit();
    return await db.select().from(sites).where(eq(sites.id, id)).get();
  }

  async getSiteByCode(code: string): Promise<Site | undefined> {
    await this.ensureInit();
    return await db.select().from(sites).where(eq(sites.code, code.toUpperCase())).get();
  }

  async getAllSites(): Promise<Site[]> {
    await this.ensureInit();
    return await db.select().from(sites).orderBy(desc(sites.id)).all();
  }

  async searchSites(query: string): Promise<Site[]> {
    await this.ensureInit();
    return await db.select().from(sites)
      .where(
        sql`${sites.code} LIKE ${'%' + query.toUpperCase() + '%'} OR UPPER(${sites.name}) LIKE ${'%' + query.toUpperCase() + '%'}`
      )
      .all();
  }

  async updateSite(id: number, updates: Partial<InsertSite>): Promise<Site | undefined> {
    await this.ensureInit();
    return await db.update(sites).set(updates).where(eq(sites.id, id)).returning().get();
  }

  async deleteSite(id: number): Promise<void> {
    await this.ensureInit();
    await db.delete(sites).where(eq(sites.id, id)).run();
  }

  // ─── Daily Reports ──────────────────────────────────────────────────────────

  async createDailyReport(report: InsertDailyReport): Promise<DailyReport> {
    await this.ensureInit();
    return (await db.insert(dailyReports).values(report).returning().get())!;
  }

  async getDailyReport(id: number): Promise<DailyReport | undefined> {
    await this.ensureInit();
    return await db.select().from(dailyReports).where(eq(dailyReports.id, id)).get();
  }

  async getDailyReportsByDocument(documentId: number): Promise<DailyReport[]> {
    await this.ensureInit();
    return await db.select().from(dailyReports).where(eq(dailyReports.documentId, documentId)).all();
  }

  async getDailyReportsBySite(siteId: number): Promise<DailyReport[]> {
    await this.ensureInit();
    return await db.select().from(dailyReports)
      .where(eq(dailyReports.siteId, siteId))
      .orderBy(desc(dailyReports.reportDate))
      .all();
  }

  async getDailyReportsBySiteAndDate(siteId: number, date: string): Promise<DailyReport[]> {
    await this.ensureInit();
    return await db.select().from(dailyReports)
      .where(and(eq(dailyReports.siteId, siteId), eq(dailyReports.reportDate, date)))
      .all();
  }

  async getDailyReportsBySiteDateRange(siteId: number, fromDate: string, toDate: string): Promise<DailyReport[]> {
    await this.ensureInit();
    return await db.select().from(dailyReports)
      .where(and(
        eq(dailyReports.siteId, siteId),
        sql`${dailyReports.reportDate} >= ${fromDate}`,
        sql`${dailyReports.reportDate} <= ${toDate}`
      ))
      .orderBy(dailyReports.reportDate)
      .all();
  }

  async deleteDailyReportCascade(reportId: number): Promise<void> {
    await this.ensureInit();
    await db.delete(equipmentUsage).where(eq(equipmentUsage.reportId, reportId)).run();
    await db.delete(materialUsage).where(eq(materialUsage.reportId, reportId)).run();
    await db.delete(labourRecords).where(eq(labourRecords.reportId, reportId)).run();
    await db.delete(paymentRecords).where(eq(paymentRecords.reportId, reportId)).run();
    await db.delete(dailyReports).where(eq(dailyReports.id, reportId)).run();
  }

  // ─── Equipment Usage ────────────────────────────────────────────────────────

  async createEquipmentUsage(record: InsertEquipmentUsage): Promise<EquipmentUsage> {
    await this.ensureInit();
    return (await db.insert(equipmentUsage).values(record).returning().get())!;
  }

  async getEquipmentByReport(reportId: number): Promise<EquipmentUsage[]> {
    await this.ensureInit();
    return await db.select().from(equipmentUsage).where(eq(equipmentUsage.reportId, reportId)).all();
  }

  // ─── Material Usage ─────────────────────────────────────────────────────────

  async createMaterialUsage(record: InsertMaterialUsage): Promise<MaterialUsage> {
    await this.ensureInit();
    return (await db.insert(materialUsage).values(record).returning().get())!;
  }

  async getMaterialByReport(reportId: number): Promise<MaterialUsage[]> {
    await this.ensureInit();
    return await db.select().from(materialUsage).where(eq(materialUsage.reportId, reportId)).all();
  }

  // ─── Labour Records ─────────────────────────────────────────────────────────

  async createLabourRecord(record: InsertLabourRecord): Promise<LabourRecord> {
    await this.ensureInit();
    return (await db.insert(labourRecords).values(record).returning().get())!;
  }

  async getLabourByReport(reportId: number): Promise<LabourRecord[]> {
    await this.ensureInit();
    return await db.select().from(labourRecords).where(eq(labourRecords.reportId, reportId)).all();
  }

  // ─── Payment Records ────────────────────────────────────────────────────────

  async createPaymentRecord(record: InsertPaymentRecord): Promise<PaymentRecord> {
    await this.ensureInit();
    return (await db.insert(paymentRecords).values(record).returning().get())!;
  }

  async getPaymentsByReport(reportId: number): Promise<PaymentRecord[]> {
    await this.ensureInit();
    return await db.select().from(paymentRecords).where(eq(paymentRecords.reportId, reportId)).all();
  }

  // ─── Aggregation Queries ─────────────────────────────────────────────────────

  async getSiteSummary(siteId: number) {
    await this.ensureInit();
    const reportCount = await db.select({ count: sql<number>`count(*)` })
      .from(dailyReports).where(eq(dailyReports.siteId, siteId)).get();

    const totalCement = await db.select({ total: sql<number>`COALESCE(SUM(${materialUsage.quantityUsed}), 0)` })
      .from(materialUsage)
      .innerJoin(dailyReports, eq(materialUsage.reportId, dailyReports.id))
      .where(and(eq(dailyReports.siteId, siteId), like(materialUsage.material, '%cement%')))
      .get();

    const totalPayments = await db.select({ total: sql<number>`COALESCE(SUM(${paymentRecords.amount}), 0)` })
      .from(paymentRecords)
      .innerJoin(dailyReports, eq(paymentRecords.reportId, dailyReports.id))
      .where(eq(dailyReports.siteId, siteId))
      .get();

    return {
      totalReports: reportCount?.count || 0,
      totalCementBags: totalCement?.total || 0,
      totalPayments: totalPayments?.total || 0,
    };
  }

  // Build a text summary of all structured data for AI context
  async buildSiteContext(siteId: number): Promise<string> {
    const site = await this.getSite(siteId);
    if (!site) return "";

    const reports = await this.getDailyReportsBySite(siteId);
    let context = `Site: ${site.name} (${site.code}), Location: ${site.location || 'N/A'}\n\n`;

    for (const report of reports) {
      try {
        const data = JSON.parse(report.structuredData || "{}");
        context += `--- Date: ${report.reportDate}, Reported by: ${report.reportedBy || 'N/A'} ---\n`;
        context += JSON.stringify(data, null, 2) + "\n\n";
      } catch {
        context += `--- Date: ${report.reportDate} ---\n${report.rawExtraction || ''}\n\n`;
      }
    }

    return context;
  }

  // Build context across all sites
  async buildAllSitesContext(): Promise<string> {
    const allSites = await this.getAllSites();
    let context = "";
    for (const site of allSites) {
      context += await this.buildSiteContext(site.id) + "\n";
    }
    return context || "No data available. Upload some documents first.";
  }
}

export const storage = new DatabaseStorage();
