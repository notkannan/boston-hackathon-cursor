"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllTickets, type Ticket } from "@/lib/tickets";

function priorityBadge(priority: Ticket["priority"]) {
  if (priority === "high")
    return <Badge variant="destructive" className="text-xs px-2 py-0.5">High Priority</Badge>;
  if (priority === "low")
    return <Badge variant="secondary" className="text-xs px-2 py-0.5">Low Priority</Badge>;
  return <Badge variant="outline" className="text-xs px-2 py-0.5">Unclassified</Badge>;
}

function statusBadge(status: Ticket["status"]) {
  if (status === "resolved")
    return <Badge variant="default" className="text-xs px-2 py-0.5">Resolved</Badge>;
  if (status === "in_progress")
    return <Badge variant="secondary" className="text-xs px-2 py-0.5">In Progress</Badge>;
  return <Badge variant="outline" className="text-xs px-2 py-0.5">Open</Badge>;
}

function formatDate(ts: Ticket["createdAt"]) {
  if (!ts) return "—";
  return ts.toDate().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SupportTickets() {
  const [activeTab, setActiveTab] = useState("create");

  const [email, setEmail] = useState("");
  const [issue, setIssue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    setTicketsError(null);
    try {
      const data = await getAllTickets();
      setTickets(data);
    } catch (err) {
      setTicketsError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "tickets") {
      loadTickets();
    }
  }, [activeTab, loadTickets]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/support-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: email, issue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitResult({ ok: false, message: data.error ?? "Something went wrong" });
      } else {
        setSubmitResult({
          ok: true,
          message: `Ticket #${data.ticketId} submitted! Check your inbox — we've sent you a confirmation.`,
        });
        setEmail("");
        setIssue("");
      }
    } catch {
      setSubmitResult({ ok: false, message: "Network error — please try again" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs defaultValue="create" onValueChange={setActiveTab}>
        <TabsList className="w-full h-10 text-sm">
          <TabsTrigger value="create" className="flex-1 text-sm">
            Raise a Ticket
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex-1 text-sm">
            All Tickets
          </TabsTrigger>
        </TabsList>

        {/* ── CREATE TAB ── */}
        <TabsContent value="create">
          <Card className="mt-4 rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-xl font-semibold">
                Submit a Support Request
              </CardTitle>
              <CardDescription className="text-sm">
                Describe your issue and we&apos;ll get back to you as quickly as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium">
                    Your email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    className="h-10 text-sm rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="issue" className="text-sm font-medium">
                    Describe your issue
                  </label>
                  <Textarea
                    id="issue"
                    required
                    placeholder="Tell us what's going wrong…"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    disabled={submitting}
                    rows={5}
                    className="text-sm rounded-lg resize-none leading-relaxed"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !email || !issue}
                  className="h-10 text-sm font-semibold rounded-lg"
                >
                  {submitting ? "Submitting…" : "Submit Ticket"}
                </Button>

                {submitResult && (
                  <p
                    className={`text-sm font-medium ${
                      submitResult.ok
                        ? "text-green-600 dark:text-green-400"
                        : "text-destructive"
                    }`}
                  >
                    {submitResult.message}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TICKETS TAB ── */}
        <TabsContent value="tickets">
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTickets}
                disabled={loadingTickets}
                className="rounded-lg text-sm"
              >
                {loadingTickets ? "Refreshing…" : "Refresh"}
              </Button>
            </div>

            {loadingTickets && (
              <p className="text-sm text-muted-foreground text-center py-10">Loading tickets…</p>
            )}

            {ticketsError && (
              <p className="text-sm text-destructive">{ticketsError}</p>
            )}

            {!loadingTickets && !ticketsError && tickets.length === 0 && (
              <div className="text-center py-12 flex flex-col gap-1">
                <p className="text-base font-medium text-foreground">No tickets yet</p>
                <p className="text-sm text-muted-foreground">Be the first to raise one!</p>
              </div>
            )}

            {tickets.map((ticket) => (
              <Card key={ticket.id} className="rounded-xl border shadow-sm">
                <CardContent className="pt-4 pb-4 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold truncate">{ticket.userEmail}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {priorityBadge(ticket.priority)}
                      {statusBadge(ticket.status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {ticket.issue}
                  </p>
                  <p className="text-xs text-muted-foreground/50">
                    {formatDate(ticket.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
