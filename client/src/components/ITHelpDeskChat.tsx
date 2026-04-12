import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: Date;
  messageType?: "text" | "action" | "reasoning" | "tool_call" | "resolution";
}

export function ITHelpDeskChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"account" | "network" | "security" | "software" | "hardware" | "other">("account");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createTicketMutation = trpc.tickets.create.useMutation();
  const addMessageMutation = trpc.tickets.addMessage.useMutation();
  const getTicketQuery = trpc.tickets.getById.useQuery(ticketId || 0, { enabled: !!ticketId });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (getTicketQuery.data) {
      const { messages: ticketMessages } = getTicketQuery.data;
      const formattedMessages = ticketMessages.map((msg) => ({
        id: msg.id.toString(),
        role: msg.senderRole as "user" | "agent" | "system",
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        messageType: msg.messageType as any,
      }));
      setMessages(formattedMessages);
    }
  }, [getTicketQuery.data]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !input.trim()) return;

    setIsLoading(true);
    try {
      const result = await createTicketMutation.mutateAsync({
        title,
        description: input,
        category,
        priority,
      });

      setTicketId(result.ticketId);
      setShowForm(false);

      // Add initial user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
        timestamp: new Date(),
        messageType: "text",
      };
      setMessages([userMessage]);

      // Add system acknowledgment
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: `Your ticket has been created (ID: ${result.ticketId}). Our AI agent is analyzing your issue...`,
        timestamp: new Date(),
        messageType: "action",
      };
      setMessages((prev) => [...prev, systemMessage]);

      setTitle("");
      setInput("");
    } catch (error) {
      console.error("Error creating ticket:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ticketId) return;

    setIsLoading(true);
    try {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
        timestamp: new Date(),
        messageType: "text",
      };
      setMessages((prev) => [...prev, userMessage]);

      await addMessageMutation.mutateAsync({
        ticketId,
        content: input,
      });

      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border p-6 md:p-8">
        <h1 className="headline mb-2">IT Support</h1>
        <div className="divider-line mb-4"></div>
        <p className="text-muted-foreground">
          Describe your issue in natural language. Our AI agent will analyze, decompose, and resolve your problem.
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {showForm ? (
          <Card className="editorial-card max-w-2xl">
            <form onSubmit={handleSubmitTicket} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Issue Title</label>
                <Input
                  placeholder="Brief summary of your issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Category</label>
                <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account">Account & Access</SelectItem>
                    <SelectItem value="network">Network & Connectivity</SelectItem>
                    <SelectItem value="security">Security & Privacy</SelectItem>
                    <SelectItem value="software">Software & Applications</SelectItem>
                    <SelectItem value="hardware">Hardware & Devices</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <Textarea
                  placeholder="Provide detailed information about your issue..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="font-sans min-h-32"
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Ticket...
                  </>
                ) : (
                  "Submit Issue"
                )}
              </Button>
            </form>
          </Card>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xl px-4 py-3 rounded-sm ${
                    msg.role === "user"
                      ? "bg-accent text-accent-foreground"
                      : msg.role === "system"
                      ? "bg-muted text-muted-foreground border border-border"
                      : "bg-card text-card-foreground border border-border"
                  }`}
                >
                  {msg.messageType === "reasoning" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        Agent Reasoning
                      </div>
                      <Streamdown className="text-sm">{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <Streamdown className="text-sm">{msg.content}</Streamdown>
                  )}
                  <div className="text-xs opacity-50 mt-2">
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      {!showForm && ticketId && (
        <div className="border-t border-border p-6 md:p-8 bg-card">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Input
              placeholder="Add a message to your ticket..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="font-sans"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
