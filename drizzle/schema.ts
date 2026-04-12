import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tickets table for IT support requests
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["account", "network", "security", "software", "hardware", "other"]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "escalated", "closed"]).default("open").notNull(),
  assignedTo: int("assignedTo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// Ticket messages/conversation history
export const ticketMessages = mysqlTable("ticketMessages", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  senderId: int("senderId").notNull(),
  senderRole: mysqlEnum("senderRole", ["user", "agent", "system"]).notNull(),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", ["text", "action", "reasoning", "tool_call", "resolution"]).default("text").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = typeof ticketMessages.$inferInsert;

// Account creation requests
export const accountRequests = mysqlTable("accountRequests", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requesterId").notNull(),
  requestedUsername: varchar("requestedUsername", { length: 255 }).notNull(),
  requestedEmail: varchar("requestedEmail", { length: 320 }).notNull(),
  identityVerified: boolean("identityVerified").default(false).notNull(),
  adminApproved: boolean("adminApproved").default(false).notNull(),
  approvedBy: int("approvedBy"),
  status: mysqlEnum("status", ["pending", "identity_verification", "awaiting_approval", "approved", "denied"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountRequest = typeof accountRequests.$inferSelect;
export type InsertAccountRequest = typeof accountRequests.$inferInsert;

// Account update requests
export const accountUpdateRequests = mysqlTable("accountUpdateRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fieldName: varchar("fieldName", { length: 255 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue").notNull(),
  mfaVerified: boolean("mfaVerified").default(false).notNull(),
  status: mysqlEnum("status", ["pending", "mfa_required", "approved", "denied"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountUpdateRequest = typeof accountUpdateRequests.$inferSelect;
export type InsertAccountUpdateRequest = typeof accountUpdateRequests.$inferInsert;

// Security issues and diagnostics
export const securityIssues = mysqlTable("securityIssues", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  issueType: mysqlEnum("issueType", ["malware", "phishing", "network_breach", "unauthorized_access", "data_leak", "other"]).notNull(),
  description: text("description").notNull(),
  diagnosticData: json("diagnosticData"),
  hypotheses: json("hypotheses"),
  resolution: text("resolution"),
  status: mysqlEnum("status", ["reported", "investigating", "resolved", "escalated"]).default("reported").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SecurityIssue = typeof securityIssues.$inferSelect;
export type InsertSecurityIssue = typeof securityIssues.$inferInsert;

// Audit logs for all agent actions
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  agentAction: varchar("agentAction", { length: 255 }).notNull(),
  toolName: varchar("toolName", { length: 255 }),
  toolInput: json("toolInput"),
  toolOutput: json("toolOutput"),
  reasoning: text("reasoning"),
  ticketId: int("ticketId"),
  userId: int("userId"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Knowledge base for self-improving resolutions
export const knowledgeBase = mysqlTable("knowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 255 }).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  resolution: text("resolution"),
  sourceTicketId: int("sourceTicketId"),
  embedding: text("embedding"),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;

// Email notifications
export const emailNotifications = mysqlTable("emailNotifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientId: int("recipientId"),
  eventType: mysqlEnum("eventType", ["ticket_created", "ticket_updated", "ticket_escalated", "ticket_resolved", "account_creation_requested", "account_creation_approved", "account_creation_denied", "account_update_requested", "account_update_approved", "account_update_denied"]).notNull(),
  ticketId: int("ticketId"),
  accountRequestId: int("accountRequestId"),
  content: text("content").notNull(),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = typeof emailNotifications.$inferInsert;

// Admin approvals for sensitive operations
export const adminApprovals = mysqlTable("adminApprovals", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  requestType: mysqlEnum("requestType", ["account_creation", "account_update", "ticket_escalation", "security_remediation"]).notNull(),
  requestId: int("requestId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "denied"]).default("pending").notNull(),
  approvedAt: timestamp("approvedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminApproval = typeof adminApprovals.$inferSelect;
export type InsertAdminApproval = typeof adminApprovals.$inferInsert;