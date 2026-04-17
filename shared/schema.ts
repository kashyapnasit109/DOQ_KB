import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Existing Tables ─────────────────────────────────────────────────────────

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  pageCount: integer("page_count").notNull().default(0),
  extractedText: text("extracted_text").notNull().default(""),
  status: text("status").notNull().default("processing"), // processing | ready | error
  errorMessage: text("error_message"),
  uploadedAt: text("uploaded_at").notNull(),
  // New fields for site association
  siteId: integer("site_id"),
  reportDate: text("report_date"),
  fileType: text("file_type").default("pdf"), // pdf | image
  uploadedBy: text("uploaded_by"), // Name of the person who uploaded
});

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sourceDocs: text("source_docs").notNull().default("[]"), // JSON array of doc IDs
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// ─── Users Table ─────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("engineer"), // engineer | supervisor | admin
  pin: text("pin"),  // Only for admins
  createdAt: text("created_at").notNull(),
});

// ─── New Tables: Sites & Structured Data ─────────────────────────────────────

export const sites = sqliteTable("sites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),         // "SOU"
  name: text("name").notNull(),                  // "Statue of Unity"
  location: text("location"),                    // "Gujarat"
  createdAt: text("created_at").notNull(),
});

export const dailyReports = sqliteTable("daily_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").notNull(),  // FK to documents
  siteId: integer("site_id").notNull(),          // FK to sites
  reportDate: text("report_date").notNull(),     // "2026-04-08"
  reportedBy: text("reported_by"),               // "Vhaj"
  structuredData: text("structured_data").notNull(), // Full JSON blob
  rawExtraction: text("raw_extraction"),         // Raw AI text output
  createdAt: text("created_at").notNull(),
});

export const equipmentUsage = sqliteTable("equipment_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: integer("report_id").notNull(),
  equipment: text("equipment").notNull(),        // "JCB", "Floxy"
  workingHours: real("working_hours"),
  dieselUsed: text("diesel_used"),
  remarks: text("remarks"),
});

export const materialUsage = sqliteTable("material_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: integer("report_id").notNull(),
  material: text("material").notNull(),          // "Cement"
  quantityUsed: real("quantity_used"),
  unit: text("unit"),                            // "bags"
  balance: real("balance"),
  remarks: text("remarks"),
});

export const labourRecords = sqliteTable("labour_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: integer("report_id").notNull(),
  category: text("category").notNull(),          // "centering", "department", "masonry", "plumbing"
  workDescription: text("work_description"),
  location: text("location"),                    // "Toilet block"
  mistriCount: integer("mistri_count").default(0),
  helperCount: integer("helper_count").default(0),
  totalLabour: integer("total_labour").default(0),
  remarks: text("remarks"),
});

export const paymentRecords = sqliteTable("payment_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: integer("report_id").notNull(),
  category: text("category").notNull(),          // "masonry_rokdi", "individual", "plumbing"
  description: text("description"),
  person: text("person"),
  amount: real("amount"),
  paymentDate: text("payment_date"),
  remarks: text("remarks"),
});

// ─── Insert Schemas ──────────────────────────────────────────────────────────

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertSiteSchema = createInsertSchema(sites).omit({ id: true });
export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({ id: true });
export const insertEquipmentUsageSchema = createInsertSchema(equipmentUsage).omit({ id: true });
export const insertMaterialUsageSchema = createInsertSchema(materialUsage).omit({ id: true });
export const insertLabourRecordSchema = createInsertSchema(labourRecords).omit({ id: true });
export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({ id: true });

// ─── Types ───────────────────────────────────────────────────────────────────

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Site = typeof sites.$inferSelect;
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertEquipmentUsage = z.infer<typeof insertEquipmentUsageSchema>;
export type EquipmentUsage = typeof equipmentUsage.$inferSelect;
export type InsertMaterialUsage = z.infer<typeof insertMaterialUsageSchema>;
export type MaterialUsage = typeof materialUsage.$inferSelect;
export type InsertLabourRecord = z.infer<typeof insertLabourRecordSchema>;
export type LabourRecord = typeof labourRecords.$inferSelect;
export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
