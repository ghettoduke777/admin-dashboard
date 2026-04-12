import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface Ticket {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export function AdminDashboard() {
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const ticketsQuery = trpc.tickets.list.useQuery({ limit: 50 });
  const updateStatusMutation = trpc.tickets.updateStatus.useMutation();
  const auditLogsQuery = trpc.audit.getLogs.useQuery({ limit: 100 });

  const selectedTicket = ticketsQuery.data?.find((t) => t.id === selectedTicketId);

  const filteredTickets = ticketsQuery.data?.filter((ticket) => {
    if (statusFilter === "all") return true;
    return ticket.status === statusFilter;
  });

  const handleStatusUpdate = async (ticketId: number, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        ticketId,
        status: newStatus as any,
      });
      ticketsQuery.refetch();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "escalated":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-6 md:p-8">
        <h1 className="headline mb-2">Admin Dashboard</h1>
        <div className="divider-line mb-4"></div>
        <p className="text-muted-foreground">
          Manage IT support tickets, approvals, and audit logs
        </p>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tickets List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="subheadline">Tickets</h2>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ticketsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTickets?.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedTicketId === ticket.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(ticket.status)}
                          <h3 className="font-semibold">{ticket.title}</h3>
                        </div>
                        <p className="text-sm opacity-75 mb-3">{ticket.description.substring(0, 100)}...</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant="outline">{ticket.category}</Badge>
                          <Badge variant="outline">{ticket.status}</Badge>
                        </div>
                      </div>
                      <div className="text-xs opacity-50 ml-4">
                        #{ticket.id}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Details */}
          <div className="space-y-6">
            {selectedTicket ? (
              <>
                <Card className="editorial-card">
                  <h3 className="font-semibold mb-4">Ticket Details</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="opacity-75">ID:</span>
                      <p className="font-semibold">#{selectedTicket.id}</p>
                    </div>
                    <div>
                      <span className="opacity-75">Status:</span>
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(newStatus) =>
                          handleStatusUpdate(selectedTicket.id, newStatus)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="escalated">Escalated</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="opacity-75">Priority:</span>
                      <p className="font-semibold">{selectedTicket.priority}</p>
                    </div>
                    <div>
                      <span className="opacity-75">Category:</span>
                      <p className="font-semibold">{selectedTicket.category}</p>
                    </div>
                    <div>
                      <span className="opacity-75">Created:</span>
                      <p className="font-semibold text-xs">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Audit Logs */}
                <Card className="editorial-card">
                  <h3 className="font-semibold mb-4">Agent Actions</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {auditLogsQuery.data?.filter((log) => log.ticketId === selectedTicket.id).map((log) => (
                      <div key={log.id} className="text-xs border-l-2 border-border pl-3 py-2">
                        <p className="font-semibold">{log.agentAction}</p>
                        {log.reasoning && (
                          <p className="opacity-75 mt-1">{log.reasoning}</p>
                        )}
                        <p className="opacity-50 text-xs mt-1">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="editorial-card text-center py-8">
                <p className="text-muted-foreground">Select a ticket to view details</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
