import { invokeLLM } from "./_core/llm";
import { logAuditAction } from "./db";
import type { InsertAuditLog } from "../drizzle/schema";

/**
 * LLM Reasoning Engine for IT Help Desk Agent
 * Handles task decomposition, tool selection, and step-by-step reasoning
 */

export interface ReasoningStep {
  step: number;
  thought: string;
  action: string;
  toolName?: string;
  toolInput?: any;
  observation?: string;
}

export interface AgentReasoning {
  goal: string;
  decomposition: string[];
  steps: ReasoningStep[];
  finalResolution: string;
  confidence: number;
}

/**
 * Decompose a complex IT support request into actionable steps
 */
export async function decomposeTicket(
  ticketTitle: string,
  ticketDescription: string,
  category: string,
  ticketId: number,
  userId: number
): Promise<AgentReasoning> {
  const systemPrompt = `You are an intelligent IT support agent. Your task is to analyze IT support tickets and decompose them into clear, actionable steps.

For each ticket, you must:
1. Understand the user's problem
2. Identify the category (account, network, security, software, hardware, other)
3. Decompose the issue into specific steps
4. Suggest which tools/actions to use
5. Provide a clear resolution path

Always be thorough, transparent, and security-conscious. For security issues, prioritize user safety.`;

  const userPrompt = `Analyze this IT support ticket and provide a detailed decomposition:

Title: ${ticketTitle}
Category: ${category}
Description: ${ticketDescription}

Provide your response in the following JSON format:
{
  "goal": "Clear statement of what needs to be accomplished",
  "decomposition": ["Step 1", "Step 2", "Step 3"],
  "reasoning": "Your reasoning about the issue",
  "suggestedTools": ["tool1", "tool2"],
  "confidence": 0.95
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ticket_decomposition",
          strict: true,
          schema: {
            type: "object",
            properties: {
              goal: { type: "string" },
              decomposition: { type: "array", items: { type: "string" } },
              reasoning: { type: "string" },
              suggestedTools: { type: "array", items: { type: "string" } },
              confidence: { type: "number" },
            },
            required: ["goal", "decomposition", "reasoning", "suggestedTools", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') throw new Error("No response from LLM");

    const parsed = JSON.parse(content);

    // Log the reasoning for audit trail
    await logAuditAction({
      agentAction: "ticket_decomposition",
      toolName: "llm_reasoning",
      toolInput: { ticketTitle, category, description: ticketDescription },
      toolOutput: parsed,
      reasoning: parsed.reasoning,
      ticketId,
      userId,
      timestamp: new Date(),
    } as any);

    return {
      goal: parsed.goal,
      decomposition: parsed.decomposition,
      steps: parsed.decomposition.map((step: string, index: number) => ({
        step: index + 1,
        thought: step,
        action: "pending",
      })),
      finalResolution: "",
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error("Error decomposing ticket:", error);
    throw error;
  }
}

/**
 * Generate a resolution for a ticket based on its analysis
 */
export async function generateResolution(
  ticketTitle: string,
  ticketDescription: string,
  category: string,
  decomposition: string[],
  ticketId: number,
  userId: number
): Promise<string> {
  const systemPrompt = `You are an expert IT support agent. Based on the ticket analysis and decomposition, provide a clear, step-by-step resolution.

Your resolution should:
1. Address the root cause
2. Provide clear, actionable steps
3. Include any preventive measures
4. Be written in user-friendly language
5. Include any relevant security warnings if applicable`;

  const userPrompt = `Generate a resolution for this IT support ticket:

Title: ${ticketTitle}
Category: ${category}
Description: ${ticketDescription}

Analysis Steps:
${decomposition.map((step, i) => `${i + 1}. ${step}`).join("\n")}

Provide a clear, step-by-step resolution that the user can follow.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const resolutionContent = response.choices[0]?.message?.content;
    const resolution = typeof resolutionContent === 'string' ? resolutionContent : "";

    // Log the resolution generation
    await logAuditAction({
      agentAction: "resolution_generation",
      toolName: "llm_reasoning",
      toolInput: { ticketTitle, category, decomposition },
      toolOutput: { resolution },
      reasoning: "Generated resolution based on ticket analysis",
      ticketId,
      userId,
      timestamp: new Date(),
    } as any);

    return resolution;
  } catch (error) {
    console.error("Error generating resolution:", error);
    throw error;
  }
}

/**
 * Analyze a security issue and generate hypotheses
 */
export async function analyzeSecurityIssue(
  issueType: string,
  description: string,
  diagnosticData: any,
  userId: number
): Promise<{ hypotheses: string[]; recommendations: string[] }> {
  const systemPrompt = `You are a cybersecurity expert. Analyze security issues and provide hypothesis-based diagnostic reasoning.

For each security issue:
1. Generate multiple hypotheses about the root cause
2. Suggest diagnostic steps to test each hypothesis
3. Provide remediation recommendations
4. Prioritize by severity and likelihood

Always prioritize user safety and data protection.`;

  const userPrompt = `Analyze this security issue:

Type: ${issueType}
Description: ${description}
Diagnostic Data: ${JSON.stringify(diagnosticData, null, 2)}

Provide your analysis in JSON format:
{
  "hypotheses": ["Hypothesis 1", "Hypothesis 2", "Hypothesis 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "severity": "high|medium|low",
  "immediateActions": ["Action 1", "Action 2"]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "security_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hypotheses: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } },
              severity: { type: "string", enum: ["high", "medium", "low"] },
              immediateActions: { type: "array", items: { type: "string" } },
            },
            required: ["hypotheses", "recommendations", "severity", "immediateActions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') throw new Error("No response from LLM");

    const parsed = JSON.parse(content);

    // Log the analysis
    await logAuditAction({
      agentAction: "security_analysis",
      toolName: "llm_reasoning",
      toolInput: { issueType, description, diagnosticData },
      toolOutput: parsed,
      reasoning: `Security analysis for ${issueType} issue`,
      userId,
      timestamp: new Date(),
    } as any);

    return {
      hypotheses: parsed.hypotheses,
      recommendations: parsed.recommendations,
    };
  } catch (error) {
    console.error("Error analyzing security issue:", error);
    throw error;
  }
}

/**
 * Retrieve relevant knowledge base entries for a ticket
 */
export async function retrieveKnowledgeBase(
  query: string,
  category: string,
  userId: number
): Promise<string[]> {
  const systemPrompt = `You are an IT knowledge base retrieval system. Given a query and category, retrieve the most relevant knowledge base entries.

Format your response as a JSON array of relevant knowledge base entries.`;

  const userPrompt = `Find relevant knowledge base entries for:

Query: ${query}
Category: ${category}

Return up to 3 most relevant entries as a JSON array of strings.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const contentStr = typeof content === 'string' ? content : "[]";
    const entries = JSON.parse(contentStr);

    // Log the retrieval
    await logAuditAction({
      agentAction: "knowledge_base_retrieval",
      toolName: "llm_reasoning",
      toolInput: { query, category },
      toolOutput: { entries },
      reasoning: "Retrieved relevant knowledge base entries",
      userId,
      timestamp: new Date(),
    } as any);

    return entries;
  } catch (error) {
    console.error("Error retrieving knowledge base:", error);
    return [];
  }
}
