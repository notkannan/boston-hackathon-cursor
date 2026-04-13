"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "loading" | "success" | "error";

export function SendEmailForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong");
      } else {
        setStatus("success");
        setMessage(`Email sent to ${data.to}`);
        setEmail("");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — please try again");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <label htmlFor="email" className="text-sm font-medium text-foreground">
        Recipient email
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={status === "loading"}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <Button type="submit" disabled={status === "loading" || !email}>
        {status === "loading" ? "Sending…" : "Send template email"}
      </Button>

      {status === "success" && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-destructive">{message}</p>
      )}
    </form>
  );
}
