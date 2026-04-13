import { Inkbox } from "@inkbox/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { createTicket, updateTicketPriority } from "@/lib/tickets";
import companyContextRaw from "@/lib/company-context.json";

const AGENT_HANDLE = "agent-hack";
const AGENT_INBOX = "agenthack@inkboxmail.com";
const OWNER_EMAIL = process.env.SUPPORT_ALERT_EMAIL ?? "kannan060200@hotmail.com";

type ContextPage = { url: string; title: string; description: string; content: string };

// Build a concise knowledge snippet from the crawled site — skip heavy member list pages
const COMPANY_KNOWLEDGE = (companyContextRaw.pages as ContextPage[])
  .filter((p) => !p.title.toLowerCase().includes("member") && p.content.length > 100)
  .slice(0, 8)
  .map((p) => `### ${p.title}\n${p.content.slice(0, 800)}`)
  .join("\n\n---\n\n");

async function getOrCreateIdentity(inkbox: Inkbox) {
  try {
    return await inkbox.getIdentity(AGENT_HANDLE);
  } catch {
    return await inkbox.createIdentity(AGENT_HANDLE, {
      createMailbox: true,
      displayName: "Support Agent",
    });
  }
}

export async function POST(req: NextRequest) {
  const inkboxKey = process.env.INKBOX_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!inkboxKey) {
    return Response.json({ error: "INKBOX_API_KEY is not configured" }, { status: 500 });
  }
  if (!openaiKey) {
    return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }

  let userEmail: string;
  let issue: string;
  try {
    const body = await req.json();
    userEmail = body.userEmail;
    issue = body.issue;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!userEmail || !issue) {
    return Response.json({ error: "userEmail and issue are required" }, { status: 400 });
  }

  // ── 1. Save ticket to Firebase ───────────────────────────────────────────
  const ticketId = await createTicket({ userEmail, issue });

  // ── 2. Set up clients ────────────────────────────────────────────────────
  const inkbox = new Inkbox({ apiKey: inkboxKey });
  const openai = new OpenAI({ apiKey: openaiKey });

  const identity = await getOrCreateIdentity(inkbox);
  if (!identity.mailbox) {
    await identity.createMailbox({ displayName: "Support Agent" });
  }

  // ── 3. Forward raw ticket to Inkbox agent inbox ──────────────────────────
  await identity.sendEmail({
    to: [AGENT_INBOX],
    subject: `[Ticket #${ticketId}] Support request from ${userEmail}`,
    bodyText: `From: ${userEmail}\nTicket ID: ${ticketId}\n\n${issue}`,
    bodyHtml: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <h2 style="margin:0 0 4px;font-size:16px;color:#111;">New Support Ticket</h2>
        <p style="margin:0 0 20px;font-size:12px;color:#999;">Ticket #${ticketId}</p>
        <table style="font-size:14px;color:#444;border-collapse:collapse;width:100%;margin-bottom:20px;">
          <tr><td style="padding:4px 0;width:80px;color:#999;">From</td><td>${userEmail}</td></tr>
        </table>
        <div style="background:#f5f5f5;padding:16px;border-radius:6px;font-size:14px;line-height:1.7;color:#333;">
          ${issue.replace(/\n/g, "<br>")}
        </div>
      </div>`,
  });

  // ── 4. Classify priority with OpenAI ────────────────────────────────────
  const classification = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a customer support triage agent. Classify the support issue as "high" or "low" priority.
Respond with ONLY the single word "high" or "low".

HIGH priority: system outage, data loss, security breach, billing failure, account locked, cannot access product.
LOW priority: general how-to questions, feature requests, minor UI bugs, feedback, account setup help.`,
      },
      { role: "user", content: issue },
    ],
    max_tokens: 5,
  });

  const raw = classification.choices[0].message.content?.trim().toLowerCase() ?? "";
  const priority: "high" | "low" = raw === "high" ? "high" : "low";

  // ── 5. Update priority in Firebase ──────────────────────────────────────
  await updateTicketPriority(ticketId, priority);

  // ── 6. Generate a soothing reply for the user ────────────────────────────
  const systemPrompt =
    priority === "high"
      ? `You are Alex, the Cursor Boston support agent. The user's issue is urgent.
Acknowledge the severity, assure them the team is treating this as top priority, and that someone will reach out very soon.
Keep it under 80 words. Start with "Hi," — do not use emojis or bullet points.`
      : `You are Alex, the Cursor Boston support agent.
Use the following Cursor Boston knowledge base to give an accurate, helpful answer if the information is available.
If you can directly answer the question, do so. Otherwise, let them know the team will follow up.
Keep it under 100 words. Start with "Hi," — do not use emojis or bullet points.

CURSOR BOSTON KNOWLEDGE BASE:
${COMPANY_KNOWLEDGE}`;

  const replyCompletion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `User's issue: ${issue}` },
    ],
  });

  const replyText = replyCompletion.choices[0].message.content?.trim() ?? "";

  // ── 7. Send soothing email to the user ──────────────────────────────────
  await identity.sendEmail({
    to: [userEmail],
    subject:
      priority === "high"
        ? "[Cursor Boston] We're treating your request as urgent"
        : "[Cursor Boston] We received your support request",
    bodyText: replyText,
    bodyHtml: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#fff;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
          <div style="width:28px;height:28px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M13 3L4 14h8l-1 7 9-11h-8l1-7z" fill="white"/></svg>
          </div>
          <span style="font-size:14px;font-weight:600;color:#111;">Cursor Boston Support</span>
        </div>
        ${
          priority === "high"
            ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:4px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#dc2626;">Your issue has been flagged as high priority</p>
               </div>`
            : ""
        }
        <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#333;">
          ${replyText.replace(/\n/g, "<br>")}
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;">
        <p style="margin:0;font-size:12px;color:#aaa;">Ticket #${ticketId} · <a href="https://cursorboston.com" style="color:#4f46e5;text-decoration:none;">cursorboston.com</a></p>
      </div>`,
  });

  // ── 8. If high priority → alert the owner ───────────────────────────────
  if (priority === "high") {
    await identity.sendEmail({
      to: [OWNER_EMAIL],
      subject: `🚨 [Cursor Boston] Urgent ticket #${ticketId} from ${userEmail}`,
      bodyText: `A high-priority support ticket needs your immediate attention.\n\nFrom: ${userEmail}\nTicket ID: ${ticketId}\n\nIssue:\n${issue}`,
      bodyHtml: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;">
          <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:6px;margin-bottom:28px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#dc2626;">🚨 High-Priority Support Ticket</p>
            <p style="margin:0;font-size:13px;color:#ef4444;">Please attend to this immediately.</p>
          </div>
          <table style="font-size:14px;color:#444;border-collapse:collapse;width:100%;margin-bottom:20px;">
            <tr><td style="padding:6px 0;width:90px;color:#999;font-size:13px;">From</td><td style="font-weight:600;">${userEmail}</td></tr>
            <tr><td style="padding:6px 0;color:#999;font-size:13px;">Ticket ID</td><td>#${ticketId}</td></tr>
          </table>
          <div style="background:#f9f9f9;padding:18px;border-radius:6px;font-size:14px;line-height:1.8;color:#333;">
            ${issue.replace(/\n/g, "<br>")}
          </div>
        </div>`,
    });
  }

  return Response.json({ success: true, ticketId, priority });
}
