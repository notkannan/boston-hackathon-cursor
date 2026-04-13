import { Inkbox } from "@inkbox/sdk";
import { NextRequest } from "next/server";

const AGENT_HANDLE = "agent-hack";

async function getOrCreateIdentity(inkbox: Inkbox) {
  try {
    return await inkbox.getIdentity(AGENT_HANDLE);
  } catch {
    return await inkbox.createIdentity(AGENT_HANDLE, { createMailbox: true, displayName: "Hackathon Agent" });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.INKBOX_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "INKBOX_API_KEY is not configured" }, { status: 500 });
  }

  let to: string;
  try {
    const body = await req.json();
    to = body.to;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!to || typeof to !== "string" || !to.includes("@")) {
    return Response.json({ error: "A valid 'to' email address is required" }, { status: 400 });
  }

  try {
    const inkbox = new Inkbox({ apiKey });
    const identity = await getOrCreateIdentity(inkbox);

    if (!identity.mailbox) {
      await identity.createMailbox({ displayName: "Hackathon Agent" });
    }

    await identity.sendEmail({
      to: [to],
      subject: "Hello from your Hackathon Agent!",
      bodyHtml: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9f9f9; border-radius: 8px;">
          <h2 style="margin: 0 0 16px; color: #111;">Hey there! 👋</h2>
          <p style="margin: 0 0 12px; color: #444; line-height: 1.6;">
            This is a test message from your <strong>Hackathon Agent</strong> powered by Inkbox.
          </p>
          <p style="margin: 0 0 12px; color: #444; line-height: 1.6;">
            Your agent is set up and ready to send emails programmatically. You can customise this template to fit any workflow — notifications, confirmations, alerts, and more.
          </p>
          <div style="margin: 24px 0; padding: 16px; background: #fff; border-left: 4px solid #6366f1; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Sent via <strong>Inkbox SDK</strong> · Hackathon Demo</p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #999;">You received this because your email was submitted in the demo form.</p>
        </div>
      `,
      bodyText: `Hey there!\n\nThis is a test message from your Hackathon Agent powered by Inkbox.\n\nYour agent is set up and ready to send emails programmatically.\n\nSent via Inkbox SDK · Hackathon Demo`,
    });

    return Response.json({ success: true, to });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
