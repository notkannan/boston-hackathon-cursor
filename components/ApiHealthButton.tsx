"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ApiHealthButton() {
  const [status, setStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/health");
      setStatus(res.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleClick}>Get API Health</Button>
      {status !== null && (
        <p className="text-sm text-foreground">HTTP status: {status}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
