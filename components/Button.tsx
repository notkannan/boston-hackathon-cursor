"use client";

import { useState } from "react";

export function Button() {
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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="rounded-full border px-5 py-2 text-sm font-medium"
      >
        Get API Health
      </button>
      {status !== null && <p className="text-sm">HTTP status: {status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}