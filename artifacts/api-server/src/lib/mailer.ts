import { Resend } from "resend";

const RESEND_API_KEY  = process.env.RESEND_API_KEY ?? "";
const NOTIFY_EMAIL    = process.env.NOTIFY_EMAIL   ?? "ali.aljulwah@gmail.com";

export interface SuggestionEmailData {
  title:       string;
  category:    string;
  description: string;
  email?:      string | null;
  submittedAt: Date;
}

const categoryEmoji: Record<string, string> = {
  "Feature":     "✨",
  "Integration": "🔌",
  "Improvement": "🔥",
  "Bug Report":  "🐛",
};

const badgeBg: Record<string, string> = {
  "Feature":     "#0a3d4f",
  "Integration": "#1a1040",
  "Improvement": "#3d2a00",
  "Bug Report":  "#3d0a0a",
};

const badgeColor: Record<string, string> = {
  "Feature":     "#22d3ee",
  "Integration": "#a78bfa",
  "Improvement": "#fbbf24",
  "Bug Report":  "#f87171",
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendSuggestionEmail(data: SuggestionEmailData): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[mailer] RESEND_API_KEY not set — skipping notification email.");
    return;
  }

  const resend = new Resend(RESEND_API_KEY);
  const emoji  = categoryEmoji[data.category] ?? "💡";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>New Suggestion</title>
  <style>
    body{margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    .wrap{max-width:580px;margin:32px auto;}
    .card{background:#161b22;border:1px solid #21262d;border-radius:14px;overflow:hidden;}
    .hdr{background:linear-gradient(135deg,#0a3d4f,#0d2848);padding:28px 32px;border-bottom:1px solid #21262d;}
    .hdr-label{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#22d3ee;margin:0 0 8px;}
    .hdr-title{font-size:22px;font-weight:700;color:#f0f6fc;margin:0;line-height:1.3;}
    .body{padding:28px 32px;}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:20px;}
    .lbl{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8b949e;margin:0 0 6px;}
    .val{font-size:15px;color:#e6edf3;margin:0 0 22px;line-height:1.6;}
    .desc-box{background:#0d1117;border:1px solid #21262d;border-radius:10px;padding:16px 18px;margin-bottom:24px;}
    .desc-box p{font-size:14px;color:#c9d1d9;line-height:1.7;margin:0;}
    hr{border:none;border-top:1px solid #21262d;margin:0 0 20px;}
    .meta{font-size:12px;color:#6e7681;}
    .ftr{padding:16px 32px;background:#0d1117;border-top:1px solid #21262d;text-align:center;}
    .ftr p{font-size:11px;color:#6e7681;margin:0;}
  </style>
</head>
<body>
<div class="wrap"><div class="card">
  <div class="hdr">
    <p class="hdr-label">RAG Engine · New Suggestion</p>
    <h1 class="hdr-title">${emoji} ${escapeHtml(data.title)}</h1>
  </div>
  <div class="body">
    <span class="badge" style="background:${badgeBg[data.category] ?? "#1a1a2e"};color:${badgeColor[data.category] ?? "#94a3b8"}">
      ${emoji} ${escapeHtml(data.category)}
    </span>
    <p class="lbl">Description</p>
    <div class="desc-box"><p>${escapeHtml(data.description).replace(/\n/g, "<br/>")}</p></div>
    ${data.email ? `<p class="lbl">Submitted by</p><p class="val"><a href="mailto:${escapeHtml(data.email)}" style="color:#22d3ee;text-decoration:none">${escapeHtml(data.email)}</a></p>` : ""}
    <hr/>
    <p class="meta">Submitted on ${data.submittedAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</p>
  </div>
  <div class="ftr"><p>Sent automatically by your RAG Engine system.</p></div>
</div></div>
</body></html>`;

  const text = [
    `New ${data.category} Suggestion: ${data.title}`,
    "",
    `Category: ${data.category}`,
    `\nDescription:\n${data.description}`,
    data.email ? `\nSubmitted by: ${data.email}` : "",
    `\nSubmitted at: ${data.submittedAt.toISOString()}`,
  ].filter(Boolean).join("\n");

  const { error } = await resend.emails.send({
    from:    "RAG Engine <onboarding@resend.dev>",
    to:      [NOTIFY_EMAIL],
    subject: `${emoji} New ${data.category} Suggestion: ${data.title}`,
    text,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`[mailer] Suggestion notification sent to ${NOTIFY_EMAIL}`);
}
