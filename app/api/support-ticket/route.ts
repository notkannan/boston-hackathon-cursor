import { Inkbox } from "@inkbox/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { createTicket, updateTicketPriority } from "@/lib/tickets";

const AGENT_HANDLE = "agent-hack";
const AGENT_INBOX = "agenthack@inkboxmail.com";
const OWNER_EMAIL = process.env.SUPPORT_ALERT_EMAIL ?? "kannan060200@hotmail.com";

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
  const toneInstruction =
    priority === "high"
      ? "The issue is urgent. Acknowledge the severity and assure them this is being treated as top priority. The team will respond within the hour."
      : "The issue is routine. Acknowledge their concern warmly and let them know the team will look into it soon.";

  const replyCompletion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are Alex, a warm and professional customer support agent. 
Write a short, empathetic email reply to a user who submitted a support ticket.
${toneInstruction}
Keep it under 80 words. Start with "Hi," — do not use emojis or bullet points.`,
      },
      { role: "user", content: `User's issue: ${issue}` },
    ],
  });

  const replyText = replyCompletion.choices[0].message.content?.trim() ?? "";

  // ── 7. Send soothing email to the user ──────────────────────────────────
  await identity.sendEmail({
    to: [userEmail],
    subject:
      priority === "high"
        ? "We're treating your request as urgent"
        : "We received your support request",
    bodyText: replyText,
    bodyHtml: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;">
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
        <p style="margin:0;font-size:12px;color:#aaa;">Support ticket #${ticketId} · Powered by Inkbox</p>
      </div>`,
  });

  // ── 8. If high priority → alert the owner ───────────────────────────────
  if (priority === "high") {
    await identity.sendEmail({
      to: [OWNER_EMAIL],
      subject: `🚨 Urgent ticket #${ticketId} from ${userEmail}`,
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
