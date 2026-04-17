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
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, like, between, sql } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      page_count INTEGER NOT NULL DEFAULT 0,
      extracted_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'processing',
      error_message TEXT,
      uploaded_at TEXT NOT NULL,
      site_id INTEGER,
      report_date TEXT,
      file_type TEXT DEFAULT 'pdf'
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      source_docs TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      location TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      site_id INTEGER NOT NULL,
      report_date TEXT NOT NULL,
      reported_by TEXT,
      structured_data TEXT NOT NULL,
      raw_extraction TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (site_id) REFERENCES sites(id)
    );

    CREATE TABLE IF NOT EXISTS equipment_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      equipment TEXT NOT NULL,
      working_hours REAL,
      diesel_used TEXT,
      remarks TEXT,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    );

    CREATE TABLE IF NOT EXISTS material_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      material TEXT NOT NULL,
      quantity_used REAL,
      unit TEXT,
      balance REAL,
      remarks TEXT,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    );

    CREATE TABLE IF NOT EXISTS labour_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      work_description TEXT,
      location TEXT,
      mistri_count INTEGER DEFAULT 0,
      helper_count INTEGER DEFAULT 0,
      total_labour INTEGER DEFAULT 0,
      remarks TEXT,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      person TEXT,
      amount REAL,
      payment_date TEXT,
      remarks TEXT,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    );
  `);

  // Add new columns to existing documents table if they don't exist
  try { sqlite.exec("ALTER TABLE documents ADD COLUMN site_id INTEGER;"); } catch {}
  try { sqlite.exec("ALTER TABLE documents ADD COLUMN report_date TEXT;"); } catch {}
  try { sqlite.exec("ALTER TABLE documents ADD COLUMN file_type TEXT DEFAULT 'pdf';"); } catch {}
  try { sqlite.exec("ALTER TABLE documents ADD COLUMN uploaded_by TEXT;"); } catch {}

  // Users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'engineer',
      pin TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

initializeDatabase();

export const db = drizzle(sqlite);

export class DatabaseStorage {

  // ─── Users ──────────────────────────────────────────────────────────────────

  createUser(user: InsertUser): User {
    return db.insert(users).values(user).returning().get();
  }

  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username.toLowerCase())).get();
  }

  getUser(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getAllUsers(): User[] {
    return db.select().from(users).orderBy(desc(users.id)).all();
  }

  updateUser(id: number, updates: Partial<InsertUser>): User | undefined {
    return db.update(users).set(updates).where(eq(users.id, id)).returning().get();
  }

  deleteUser(id: number): void {
    db.delete(users).where(eq(users.id, id)).run();
  }

  // ─── Documents ───────────────────────────────────────────────────────────────

  createDocument(doc: InsertDocument): Document {
    return db.insert(documents).values(doc).returning().get();
  }

  getDocument(id: number): Document | undefined {
    return db.select().from(documents).where(eq(documents.id, id)).get();
  }

  getAllDocuments(): Document[] {
    return db.select().from(documents).orderBy(desc(documents.id)).all();
  }

  getDocumentsBySite(siteId: number): Document[] {
    return db.select().from(documents).where(eq(documents.siteId, siteId)).orderBy(desc(documents.id)).all();
  }

  updateDocument(id: number, updates: Partial<InsertDocument>): Document | undefined {
    return db.update(documents).set(updates).where(eq(documents.id, id)).returning().get();
  }

  deleteDocument(id: number): void {
    // Also delete associated daily reports and their child records
    const reports = db.select().from(dailyReports).where(eq(dailyReports.documentId, id)).all();
    for (const report of reports) {
      this.deleteDailyReportCascade(report.id);
    }
    db.delete(documents).where(eq(documents.id, id)).run();
  }

  // ─── Conversations ──────────────────────────────────────────────────────────

  createConversation(conv: InsertConversation): Conversation {
    return db.insert(conversations).values(conv).returning().get();
  }

  getAllConversations(): Conversation[] {
    return db.select().from(conversations).orderBy(desc(conversations.id)).all();
  }

  deleteConversation(id: number): void {
    db.delete(conversations).where(eq(conversations.id, id)).run();
  }

  clearConversations(): void {
    db.delete(conversations).run();
  }

  // ─── Settings ────────────────────────────────────────────────────────────────

  getSetting(key: string): string | undefined {
    const row = db.select().from(settings).where(eq(settings.key, key)).get();
    return row?.value;
  }

  setSetting(key: string, value: string): void {
    const existing = db.select().from(settings).where(eq(settings.key, key)).get();
    if (existing) {
      db.update(settings).set({ value }).where(eq(settings.key, key)).run();
    } else {
      db.insert(settings).values({ key, value }).run();
    }
  }

  // ─── Sites ──────────────────────────────────────────────────────────────────

  createSite(site: InsertSite): Site {
    return db.insert(sites).values(site).returning().get();
  }

  getSite(id: number): Site | undefined {
    return db.select().from(sites).where(eq(sites.id, id)).get();
  }

  getSiteByCode(code: string): Site | undefined {
    return db.select().from(sites).where(eq(sites.code, code.toUpperCase())).get();
  }

  getAllSites(): Site[] {
    return db.select().from(sites).orderBy(desc(sites.id)).all();
  }

  searchSites(query: string): Site[] {
    return db.select().from(sites)
      .where(
        sql`${sites.code} LIKE ${'%' + query.toUpperCase() + '%'} OR UPPER(${sites.name}) LIKE ${'%' + query.toUpperCase() + '%'}`
      )
      .all();
  }

  updateSite(id: number, updates: Partial<InsertSite>): Site | undefined {
    return db.update(sites).set(updates).where(eq(sites.id, id)).returning().get();
  }

  deleteSite(id: number): void {
    db.delete(sites).where(eq(sites.id, id)).run();
  }

  // ─── Daily Reports ──────────────────────────────────────────────────────────

  createDailyReport(report: InsertDailyReport): DailyReport {
    return db.insert(dailyReports).values(report).returning().get();
  }

  getDailyReport(id: number): DailyReport | undefined {
    return db.select().from(dailyReports).where(eq(dailyReports.id, id)).get();
  }

  getDailyReportsByDocument(documentId: number): DailyReport[] {
    return db.select().from(dailyReports).where(eq(dailyReports.documentId, documentId)).all();
  }

  getDailyReportsBySite(siteId: number): DailyReport[] {
    return db.select().from(dailyReports)
      .where(eq(dailyReports.siteId, siteId))
      .orderBy(desc(dailyReports.reportDate))
      .all();
  }

  getDailyReportsBySiteAndDate(siteId: number, date: string): DailyReport[] {
    return db.select().from(dailyReports)
      .where(and(eq(dailyReports.siteId, siteId), eq(dailyReports.reportDate, date)))
      .all();
  }

  getDailyReportsBySiteDateRange(siteId: number, fromDate: string, toDate: string): DailyReport[] {
    return db.select().from(dailyReports)
      .where(and(
        eq(dailyReports.siteId, siteId),
        sql`${dailyReports.reportDate} >= ${fromDate}`,
        sql`${dailyReports.reportDate} <= ${toDate}`
      ))
      .orderBy(dailyReports.reportDate)
      .all();
  }

  deleteDailyReportCascade(reportId: number): void {
    db.delete(equipmentUsage).where(eq(equipmentUsage.reportId, reportId)).run();
    db.delete(materialUsage).where(eq(materialUsage.reportId, reportId)).run();
    db.delete(labourRecords).where(eq(labourRecords.reportId, reportId)).run();
    db.delete(paymentRecords).where(eq(paymentRecords.reportId, reportId)).run();
    db.delete(dailyReports).where(eq(dailyReports.id, reportId)).run();
  }

  // ─── Equipment Usage ────────────────────────────────────────────────────────

  createEquipmentUsage(record: InsertEquipmentUsage): EquipmentUsage {
    return db.insert(equipmentUsage).values(record).returning().get();
  }

  getEquipmentByReport(reportId: number): EquipmentUsage[] {
    return db.select().from(equipmentUsage).where(eq(equipmentUsage.reportId, reportId)).all();
  }

  getEquipmentBySite(siteId: number): EquipmentUsage[] {
    const reportIds = db.select({ id: dailyReports.id }).from(dailyReports).where(eq(dailyReports.siteId, siteId)).all();
    if (reportIds.length === 0) return [];
    return db.select().from(equipmentUsage)
      .where(sql`${equipmentUsage.reportId} IN (${sql.join(reportIds.map(r => sql`${r.id}`), sql`,`)})`)
      .all();
  }

  // ─── Material Usage ─────────────────────────────────────────────────────────

  createMaterialUsage(record: InsertMaterialUsage): MaterialUsage {
    return db.insert(materialUsage).values(record).returning().get();
  }

  getMaterialByReport(reportId: number): MaterialUsage[] {
    return db.select().from(materialUsage).where(eq(materialUsage.reportId, reportId)).all();
  }

  getMaterialBySite(siteId: number): MaterialUsage[] {
    const reportIds = db.select({ id: dailyReports.id }).from(dailyReports).where(eq(dailyReports.siteId, siteId)).all();
    if (reportIds.length === 0) return [];
    return db.select().from(materialUsage)
      .where(sql`${materialUsage.reportId} IN (${sql.join(reportIds.map(r => sql`${r.id}`), sql`,`)})`)
      .all();
  }

  // ─── Labour Records ─────────────────────────────────────────────────────────

  createLabourRecord(record: InsertLabourRecord): LabourRecord {
    return db.insert(labourRecords).values(record).returning().get();
  }

  getLabourByReport(reportId: number): LabourRecord[] {
    return db.select().from(labourRecords).where(eq(labourRecords.reportId, reportId)).all();
  }

  // ─── Payment Records ────────────────────────────────────────────────────────

  createPaymentRecord(record: InsertPaymentRecord): PaymentRecord {
    return db.insert(paymentRecords).values(record).returning().get();
  }

  getPaymentsByReport(reportId: number): PaymentRecord[] {
    return db.select().from(paymentRecords).where(eq(paymentRecords.reportId, reportId)).all();
  }

  getPaymentsBySite(siteId: number): PaymentRecord[] {
    const reportIds = db.select({ id: dailyReports.id }).from(dailyReports).where(eq(dailyReports.siteId, siteId)).all();
    if (reportIds.length === 0) return [];
    return db.select().from(paymentRecords)
      .where(sql`${paymentRecords.reportId} IN (${sql.join(reportIds.map(r => sql`${r.id}`), sql`,`)})`)
      .all();
  }

  // ─── Aggregation Queries ─────────────────────────────────────────────────────

  getSiteSummary(siteId: number) {
    const reportCount = db.select({ count: sql<number>`count(*)` })
      .from(dailyReports).where(eq(dailyReports.siteId, siteId)).get();

    const totalCement = db.select({ total: sql<number>`COALESCE(SUM(${materialUsage.quantityUsed}), 0)` })
      .from(materialUsage)
      .innerJoin(dailyReports, eq(materialUsage.reportId, dailyReports.id))
      .where(and(eq(dailyReports.siteId, siteId), like(materialUsage.material, '%cement%')))
      .get();

    const totalPayments = db.select({ total: sql<number>`COALESCE(SUM(${paymentRecords.amount}), 0)` })
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
  buildSiteContext(siteId: number): string {
    const site = this.getSite(siteId);
    if (!site) return "";

    const reports = this.getDailyReportsBySite(siteId);
    let context = `Site: ${site.name} (${site.code}), Location: ${site.location || 'N/A'}\n\n`;

    for (const report of reports) {
      try {
        const data = JSON.parse(report.structuredData);
        context += `--- Date: ${report.reportDate}, Reported by: ${report.reportedBy || 'N/A'} ---\n`;
        context += JSON.stringify(data, null, 2) + "\n\n";
      } catch {
        context += `--- Date: ${report.reportDate} ---\n${report.rawExtraction || ''}\n\n`;
      }
    }

    return context;
  }

  // Build context across all sites
  buildAllSitesContext(): string {
    const allSites = this.getAllSites();
    let context = "";
    for (const site of allSites) {
      context += this.buildSiteContext(site.id) + "\n";
    }
    return context || "No data available. Upload some documents first.";
  }
}

export const storage = new DatabaseStorage();
