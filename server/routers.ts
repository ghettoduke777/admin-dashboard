import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as llmEngine from "./llm-engine";
import { TRPCError } from "@trpc/server";

// Helper to ensure admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Ticket management
  tickets: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(5),
        description: z.string().min(10),
        category: z.enum(["account", "network", "security", "software", "hardware", "other"]),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create ticket
        const result = await db.createTicket({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          category: input.category as any,
          priority: (input.priority || "medium") as any,
          status: "open" as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Get the created ticket ID
        const ticketId = (result as any).insertId;

        // Decompose the ticket using LLM
        try {
          const reasoning = await llmEngine.decomposeTicket(
            input.title,
            input.description,
            input.category,
            ticketId,
            ctx.user.id
          );

          // Add initial system message with decomposition
          await db.addTicketMessage({
            ticketId,
            senderId: 0,
            senderRole: "system" as any,
            content: `Ticket analyzed. Goal: ${reasoning.goal}\n\nDecomposition:\n${reasoning.decomposition.map((step, i) => `${i + 1}. ${step}`).join("\n")}`,
            messageType: "reasoning" as any,
            createdAt: new Date(),
          });
        } catch (error) {
          console.error("Error in LLM decomposition:", error);
        }

        // Create email notification
        await db.createEmailNotification({
          recipientEmail: ctx.user.email || "",
          recipientId: ctx.user.id,
          eventType: "ticket_created" as any,
          ticketId,
          content: `Your IT support ticket "${input.title}" has been created and is being analyzed.`,
          status: "pending" as any,
          createdAt: new Date(),
        });

        return { ticketId, success: true };
      }),

    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role === "admin") {
          return await db.getAllTickets(input?.limit || 20, input?.offset || 0);
        }
        return await db.getTicketsByUserId(ctx.user.id);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const ticket = await db.getTicketById(input);
        if (!ticket) throw new TRPCError({ code: 'NOT_FOUND' });
        if (ticket.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const messages = await db.getTicketMessages(input);
        return { ticket, messages };
      }),

    addMessage: protectedProcedure
      .input(z.object({
        ticketId: z.number(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ticket = await db.getTicketById(input.ticketId);
        if (!ticket) throw new TRPCError({ code: 'NOT_FOUND' });
        if (ticket.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        await db.addTicketMessage({
          ticketId: input.ticketId,
          senderId: ctx.user.id,
          senderRole: ctx.user.role === 'admin' ? 'agent' : 'user',
          content: input.content,
          messageType: "text" as any,
          createdAt: new Date(),
        });

        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({
        ticketId: z.number(),
        status: z.enum(["open", "in_progress", "resolved", "escalated", "closed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTicketStatus(input.ticketId, input.status);
        return { success: true };
      }),
  }),

  // Account management
  accounts: router({
    requestCreation: protectedProcedure
      .input(z.object({
        requestedUsername: z.string().min(3),
        requestedEmail: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createAccountRequest({
          requesterId: ctx.user.id,
          requestedUsername: input.requestedUsername,
          requestedEmail: input.requestedEmail,
          status: "pending" as any,
          identityVerified: false,
          adminApproved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const requestId = (result as any).insertId;

        // Create email notification
        await db.createEmailNotification({
          recipientEmail: ctx.user.email || "",
          recipientId: ctx.user.id,
          eventType: "account_creation_requested" as any,
          accountRequestId: requestId,
          content: `Your account creation request for ${input.requestedUsername} has been received and is pending identity verification.`,
          status: "pending" as any,
          createdAt: new Date(),
        });

        return { requestId, success: true };
      }),

    getPendingRequests: adminProcedure
      .query(async () => {
        return await db.getPendingAccountRequests();
      }),

    approveRequest: adminProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const request = await db.getAccountRequestById(input);
        if (!request) throw new TRPCError({ code: 'NOT_FOUND' });

        await db.updateAccountRequestStatus(input, "approved");

        // Create email notification
        const requester = await db.getUserById(request.requesterId);
        if (requester?.email) {
          await db.createEmailNotification({
            recipientEmail: requester.email,
            recipientId: requester.id,
            eventType: "account_creation_approved" as any,
            accountRequestId: input,
            content: `Your account creation request for ${request.requestedUsername} has been approved!`,
            status: "pending" as any,
            createdAt: new Date(),
          });
        }

        return { success: true };
      }),

    denyRequest: adminProcedure
      .input(z.object({
        requestId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const request = await db.getAccountRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: 'NOT_FOUND' });

        await db.updateAccountRequestStatus(input.requestId, "denied");

        // Create email notification
        const requester = await db.getUserById(request.requesterId);
        if (requester?.email) {
          await db.createEmailNotification({
            recipientEmail: requester.email,
            recipientId: requester.id,
            eventType: "account_creation_denied" as any,
            accountRequestId: input.requestId,
            content: `Your account creation request for ${request.requestedUsername} has been denied. Reason: ${input.reason}`,
            status: "pending" as any,
            createdAt: new Date(),
          });
        }

        return { success: true };
      }),

    requestUpdate: protectedProcedure
      .input(z.object({
        fieldName: z.string(),
        newValue: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        const oldValue = (user as any)?.[input.fieldName] || "";

        const result = await db.createAccountUpdateRequest({
          userId: ctx.user.id,
          fieldName: input.fieldName,
          oldValue,
          newValue: input.newValue,
          status: "mfa_required" as any,
          mfaVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { updateRequestId: (result as any).insertId, success: true };
      }),

    confirmMFA: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const updateRequest = await db.getAccountUpdateRequestById(input);
        if (!updateRequest) throw new TRPCError({ code: 'NOT_FOUND' });
        if (updateRequest.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

        await db.updateAccountUpdateRequestStatus(input, "approved", true);

        // Create email notification
        await db.createEmailNotification({
          recipientEmail: ctx.user.email || "",
          recipientId: ctx.user.id,
          eventType: "account_update_approved" as any,
          content: `Your account update for ${updateRequest.fieldName} has been confirmed and applied.`,
          status: "pending" as any,
          createdAt: new Date(),
        });

        return { success: true };
      }),
  }),

  // Security troubleshooting
  security: router({
    reportIssue: protectedProcedure
      .input(z.object({
        issueType: z.enum(["malware", "phishing", "network_breach", "unauthorized_access", "data_leak", "other"]),
        description: z.string(),
        diagnosticData: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createSecurityIssue({
          userId: ctx.user.id,
          issueType: input.issueType as any,
          description: input.description,
          diagnosticData: input.diagnosticData,
          status: "reported" as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const issueId = (result as any).insertId;

        // Analyze using LLM
        try {
          const analysis = await llmEngine.analyzeSecurityIssue(
            input.issueType,
            input.description,
            input.diagnosticData,
            ctx.user.id
          );

          await db.updateSecurityIssueStatus(issueId, "investigating");
        } catch (error) {
          console.error("Error analyzing security issue:", error);
        }

        // Create email notification
        await db.createEmailNotification({
          recipientEmail: ctx.user.email || "",
          recipientId: ctx.user.id,
          eventType: "ticket_created" as any,
          content: `Your security issue report has been received and is being investigated.`,
          status: "pending" as any,
          createdAt: new Date(),
        });

        return { issueId, success: true };
      }),

    getIssueById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const issue = await db.getSecurityIssueById(input);
        if (!issue) throw new TRPCError({ code: 'NOT_FOUND' });
        if (issue.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return issue;
      }),
  }),

  // Audit logs
  audit: router({
    getLogs: adminProcedure
      .input(z.object({ ticketId: z.number().optional(), limit: z.number().default(100) }).optional())
      .query(async ({ input }) => {
        return await db.getAuditLogs(input?.ticketId, input?.limit || 100);
      }),
  }),

  // Knowledge base
  knowledge: router({
    search: protectedProcedure
      .input(z.string())
      .query(async ({ ctx, input }) => {
        return await db.searchKnowledgeBase(input);
      }),

    getByCategory: protectedProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return await db.getKnowledgeBaseByCategory(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
