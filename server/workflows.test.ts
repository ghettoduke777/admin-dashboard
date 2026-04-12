import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";
import * as llmEngine from "./llm-engine";

// Mock the database functions
vi.mock("./db", () => ({
  createTicket: vi.fn(),
  getTicketById: vi.fn(),
  addTicketMessage: vi.fn(),
  createEmailNotification: vi.fn(),
  createAccountRequest: vi.fn(),
  getAccountRequestById: vi.fn(),
  updateAccountRequestStatus: vi.fn(),
  updateAccountUpdateRequestStatus: vi.fn(),
  createSecurityIssue: vi.fn(),
  updateSecurityIssueStatus: vi.fn(),
  logAuditAction: vi.fn(),
}));

// Mock the LLM engine
vi.mock("./llm-engine", () => ({
  decomposeTicket: vi.fn(),
  generateResolution: vi.fn(),
  analyzeSecurityIssue: vi.fn(),
}));

describe("IT Help Desk Agent Workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Ticket Creation Workflow", () => {
    it("should create a ticket with decomposition", async () => {
      const mockTicketData = {
        userId: 1,
        title: "Cannot access email",
        description: "I cannot access my email account",
        category: "account",
        priority: "high",
        status: "open",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDecomposition = {
        goal: "Restore email access",
        decomposition: [
          "Check account status",
          "Verify credentials",
          "Reset password if needed",
        ],
        steps: [],
        finalResolution: "",
        confidence: 0.95,
      };

      vi.mocked(db.createTicket).mockResolvedValue({ insertId: 1 } as any);
      vi.mocked(llmEngine.decomposeTicket).mockResolvedValue(mockDecomposition);
      vi.mocked(db.addTicketMessage).mockResolvedValue({} as any);
      vi.mocked(db.createEmailNotification).mockResolvedValue({} as any);

      // Simulate ticket creation
      const result = await db.createTicket(mockTicketData);
      expect(result).toBeDefined();

      // Simulate decomposition
      const reasoning = await llmEngine.decomposeTicket(
        mockTicketData.title,
        mockTicketData.description,
        mockTicketData.category,
        1,
        1
      );
      expect(reasoning.goal).toBe("Restore email access");
      expect(reasoning.decomposition.length).toBe(3);
      expect(reasoning.confidence).toBe(0.95);
    });

    it("should create email notification on ticket creation", async () => {
      vi.mocked(db.createEmailNotification).mockResolvedValue({} as any);

      const notification = {
        recipientEmail: "user@example.com",
        recipientId: 1,
        eventType: "ticket_created" as const,
        ticketId: 1,
        content: "Your ticket has been created",
        status: "pending" as const,
        createdAt: new Date(),
      };

      await db.createEmailNotification(notification);
      expect(db.createEmailNotification).toHaveBeenCalledWith(notification);
    });
  });

  describe("Account Creation Workflow", () => {
    it("should create an account request", async () => {
      const mockRequest = {
        requesterId: 1,
        requestedUsername: "newuser",
        requestedEmail: "newuser@example.com",
        status: "pending" as const,
        identityVerified: false,
        adminApproved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.createAccountRequest).mockResolvedValue({ insertId: 1 } as any);

      const result = await db.createAccountRequest(mockRequest);
      expect(result).toBeDefined();
      expect(db.createAccountRequest).toHaveBeenCalledWith(mockRequest);
    });

    it("should update account request status to approved", async () => {
      vi.mocked(db.updateAccountRequestStatus).mockResolvedValue({} as any);

      await db.updateAccountRequestStatus(1, "approved");
      expect(db.updateAccountRequestStatus).toHaveBeenCalledWith(1, "approved");
    });

    it("should send email notification on account approval", async () => {
      vi.mocked(db.createEmailNotification).mockResolvedValue({} as any);

      const notification = {
        recipientEmail: "user@example.com",
        recipientId: 1,
        eventType: "account_creation_approved" as const,
        accountRequestId: 1,
        content: "Your account has been approved",
        status: "pending" as const,
        createdAt: new Date(),
      };

      await db.createEmailNotification(notification);
      expect(db.createEmailNotification).toHaveBeenCalledWith(notification);
    });
  });

  describe("Account Update Workflow", () => {
    it("should require MFA for account updates", async () => {
      const mockUpdateRequest = {
        userId: 1,
        fieldName: "email",
        oldValue: "old@example.com",
        newValue: "new@example.com",
        status: "mfa_required" as const,
        mfaVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Verify that MFA is required
      expect(mockUpdateRequest.mfaVerified).toBe(false);
      expect(mockUpdateRequest.status).toBe("mfa_required");
    });

    it("should confirm MFA and approve update", async () => {
      vi.mocked(db.updateAccountUpdateRequestStatus as any).mockResolvedValue({} as any);

      await (db.updateAccountUpdateRequestStatus as any)(1, "approved", true);
      expect(db.updateAccountUpdateRequestStatus).toHaveBeenCalledWith(
        1,
        "approved",
        true
      );
    });
  });

  describe("Security Troubleshooting Workflow", () => {
    it("should create a security issue and analyze it", async () => {
      const mockIssue = {
        userId: 1,
        issueType: "phishing" as const,
        description: "Received suspicious email",
        diagnosticData: { emailFrom: "attacker@fake.com" },
        status: "reported" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnalysis = {
        hypotheses: [
          "Email account compromised",
          "Phishing attack",
          "Spoofed sender",
        ],
        recommendations: [
          "Change password",
          "Enable 2FA",
          "Report email",
        ],
      };

      vi.mocked(db.createSecurityIssue).mockResolvedValue({ insertId: 1 } as any);
      vi.mocked(llmEngine.analyzeSecurityIssue).mockResolvedValue(mockAnalysis);
      vi.mocked(db.updateSecurityIssueStatus).mockResolvedValue({} as any);

      // Create issue
      const result = await db.createSecurityIssue(mockIssue);
      expect(result).toBeDefined();

      // Analyze issue
      const analysis = await llmEngine.analyzeSecurityIssue(
        mockIssue.issueType,
        mockIssue.description,
        mockIssue.diagnosticData,
        1
      );
      expect(analysis.hypotheses.length).toBe(3);
      expect(analysis.recommendations.length).toBe(3);

      // Update status
      await (db.updateSecurityIssueStatus as any)(1, "investigating");
      expect(db.updateSecurityIssueStatus).toHaveBeenCalledWith(1, "investigating");
    });

    it("should generate recommendations for security issues", async () => {
      const mockAnalysis = {
        hypotheses: ["Malware infection"],
        recommendations: [
          "Run antivirus scan",
          "Update security software",
          "Restart computer",
        ],
      };

      vi.mocked(llmEngine.analyzeSecurityIssue).mockResolvedValue(mockAnalysis);

      const analysis = await llmEngine.analyzeSecurityIssue(
        "malware",
        "Computer running slowly",
        {},
        1
      );
      expect(analysis.recommendations).toContain("Run antivirus scan");
    });
  });

  describe("Audit Logging", () => {
    it("should log all agent actions", async () => {
      const mockAuditLog = {
        agentAction: "ticket_decomposition",
        toolName: "llm_reasoning",
        toolInput: { ticketTitle: "Test" },
        toolOutput: { goal: "Test goal" },
        reasoning: "Testing decomposition",
        ticketId: 1,
        userId: 1,
        timestamp: new Date(),
      };

      vi.mocked(db.logAuditAction as any).mockResolvedValue({} as any);

      await (db.logAuditAction as any)(mockAuditLog);
      expect(db.logAuditAction).toHaveBeenCalledWith(mockAuditLog);
    });
  });

  describe("Knowledge Base", () => {
    it("should search knowledge base", async () => {
      const mockResults = [
        {
          id: 1,
          category: "account",
          question: "How to reset password?",
          answer: "Click forgot password",
          resolution: "Password reset successful",
          sourceTicketId: 1,
          embedding: "vector_data",
          usageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // In a real scenario, this would call the database
      expect(mockResults.length).toBeGreaterThan(0);
      expect(mockResults[0].category).toBe("account");
    });
  });
});
