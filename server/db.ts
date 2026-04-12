import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tickets, InsertTicket, ticketMessages, InsertTicketMessage, accountRequests, InsertAccountRequest, accountUpdateRequests, InsertAccountUpdateRequest, securityIssues, InsertSecurityIssue, auditLogs, InsertAuditLog, knowledgeBase, InsertKnowledgeBase, emailNotifications, InsertEmailNotification, adminApprovals, InsertAdminApproval } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Ticket queries
export async function createTicket(ticket: InsertTicket) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tickets).values(ticket);
  return result;
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTicketsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
}

export async function getAllTickets(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(limit).offset(offset);
}

export async function updateTicketStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(tickets).set({ status: status as any, updatedAt: new Date() }).where(eq(tickets.id, id));
}

// Ticket messages
export async function addTicketMessage(message: InsertTicketMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(ticketMessages).values(message);
}

export async function getTicketMessages(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
}

// Account requests
export async function createAccountRequest(request: InsertAccountRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(accountRequests).values(request);
}

export async function getAccountRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountRequests).where(eq(accountRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPendingAccountRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(accountRequests).where(eq(accountRequests.status, 'awaiting_approval')).orderBy(desc(accountRequests.createdAt));
}

export async function updateAccountRequestStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(accountRequests).set({ status: status as any, updatedAt: new Date() }).where(eq(accountRequests.id, id));
}

// Account update requests
export async function createAccountUpdateRequest(request: InsertAccountUpdateRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(accountUpdateRequests).values(request);
}

export async function getAccountUpdateRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountUpdateRequests).where(eq(accountUpdateRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAccountUpdateRequestStatus(id: number, status: string, mfaVerified = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(accountUpdateRequests).set({ status: status as any, mfaVerified, updatedAt: new Date() }).where(eq(accountUpdateRequests.id, id));
}

// Security issues
export async function createSecurityIssue(issue: InsertSecurityIssue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(securityIssues).values(issue);
}

export async function getSecurityIssueById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(securityIssues).where(eq(securityIssues.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSecurityIssueStatus(id: number, status: string, resolution?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status: status as any, updatedAt: new Date() };
  if (resolution) updateData.resolution = resolution;
  return await db.update(securityIssues).set(updateData).where(eq(securityIssues.id, id));
}

// Audit logs
export async function logAuditAction(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(auditLogs).values(log);
}

export async function getAuditLogs(ticketId?: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  if (ticketId) {
    return await db.select().from(auditLogs).where(eq(auditLogs.ticketId, ticketId)).orderBy(desc(auditLogs.timestamp)).limit(limit);
  }
  return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(limit);
}

// Knowledge base
export async function addKnowledgeBaseEntry(entry: InsertKnowledgeBase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(knowledgeBase).values(entry);
}

export async function getKnowledgeBaseByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(knowledgeBase).where(eq(knowledgeBase.category, category)).orderBy(desc(knowledgeBase.usageCount));
}

export async function searchKnowledgeBase(query: string) {
  const db = await getDb();
  if (!db) return [];
  // Simple text search - in production, use full-text search or vector similarity
  return await db.select().from(knowledgeBase).where(
    eq(knowledgeBase.question, query)
  ).limit(5);
}

// Email notifications
export async function createEmailNotification(notification: InsertEmailNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(emailNotifications).values(notification);
}

export async function getPendingEmailNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailNotifications).where(eq(emailNotifications.status, 'pending')).limit(50);
}

export async function updateEmailNotificationStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(emailNotifications).set({ status: status as any, sentAt: new Date() }).where(eq(emailNotifications.id, id));
}

// Admin approvals
export async function createAdminApproval(approval: InsertAdminApproval) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(adminApprovals).values(approval);
}

export async function getAdminApprovalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminApprovals).where(eq(adminApprovals.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAdminApprovalStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(adminApprovals).set({ status: status as any, approvedAt: new Date() }).where(eq(adminApprovals.id, id));
}
