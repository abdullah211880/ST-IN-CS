import nodemailer from "nodemailer";

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL ?? "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? "";

function createTransport() {
  if (!GMAIL_APP_PASSWORD || !NOTIFY_EMAIL) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: NOTIFY_EMAIL, pass: GMAIL_APP_PASSWORD },
  });
}

export interface SuggestionEmailData {
  title:       string;
  category:    string;
  description: string;
  email?:      string | null;
  submittedAt: Date;
}

export async function sendSuggestionEmail(data: SuggestionEmailData): Promise<void> {
  const transport = createTransport();
  if (!transport) {
    console.warn("[mailer] GMAIL_APP_PASSWORD or NOTIFY_EMAIL not set — skipping notification email.");
    return;
  }

  const categoryEmoji: Record<string, string> = {
    "Feature":     "✨",
    "Integration": "🔌",
    "Improvement": "🔥",
    "Bug Report":  "🐛",
  };
  const emoji = categoryEmoji[data.category] ?? "💡";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Feature Suggestion</title>
  <style>
    body { margin: 0; padding: 0; background: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 580px; margin: 32px auto; }
    .card { background: #161b22; border: 1px solid #21262d; border-radius: 14px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0a3d4f, #0d2848); padding: 28px 32px; border-bottom: 1px solid #21262d; }
    .header-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #22d3ee; margin: 0 0 8px; }
    .header-title { font-size: 22px; font-weight: 700; color: #f0f6fc; margin: 0; line-height: 1.3; }
    .body { padding: 28px 32px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
    .label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8b949e; margin: 0 0 6px; }
    .value { font-size: 15px; color: #e6edf3; margin: 0 0 22px; line-height: 1.6; }
    .description-box { background: #0d1117; border: 1px solid #21262d; border-radius: 10px; padding: 16px 18px; margin-bottom: 24px; }
    .description-box p { font-size: 14px; color: #c9d1d9; line-height: 1.7; margin: 0; }
    .divider { border: none; border-top: 1px solid #21262d; margin: 0 0 20px; }
    .meta { font-size: 12px; color: #6e7681; }
    .footer { padding: 16px 32px; background: #0d1117; border-top: 1px solid #21262d; text-align: center; }
    .footer p { font-size: 11px; color: #6e7681; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="header-label">RAG Engine · Feature Suggestion</p>
        <h1 class="header-title">${emoji} ${escapeHtml(data.title)}</h1>
      </div>
      <div class="body">
        <span class="badge" style="background:${badgeBg(data.category)};color:${badgeColor(data.category)}">
          ${emoji} ${escapeHtml(data.category)}
        </span>

        <p class="label">Description</p>
        <div class="description-box">
          <p>${escapeHtml(data.description).replace(/\n/g, "<br/>")}</p>
        </div>

        ${data.email ? `
        <p class="label">Submitted by</p>
        <p class="value"><a href="mailto:${escapeHtml(data.email)}" style="color:#22d3ee;text-decoration:none">${escapeHtml(data.email)}</a></p>
        ` : ""}

        <hr class="divider" />
        <p class="meta">Submitted on ${data.submittedAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</p>
      </div>
      <div class="footer">
        <p>This notification was sent automatically by your RAG Engine system.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = [
    `New ${data.category} Suggestion: ${data.title}`,
    "",
    `Category: ${data.category}`,
    `Description:\n${data.description}`,
    data.email ? `Submitted by: ${data.email}` : "",
    `Submitted at: ${data.submittedAt.toISOString()}`,
  ].filter(Boolean).join("\n");

  await transport.sendMail({
    from:    `"RAG Engine" <${NOTIFY_EMAIL}>`,
    to:      NOTIFY_EMAIL,
    subject: `${emoji} New ${data.category} Suggestion: ${data.title}`,
    text,
    html,
  });
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function badgeBg(category: string) {
  const map: Record<string, string> = {
    "Feature":     "#0a3d4f",
    "Integration": "#1a1040",
    "Improvement": "#3d2a00",
    "Bug Report":  "#3d0a0a",
  };
  return map[category] ?? "#1a1a2e";
}

function badgeColor(category: string) {
  const map: Record<string, string> = {
    "Feature":     "#22d3ee",
    "Integration": "#a78bfa",
    "Improvement": "#fbbf24",
    "Bug Report":  "#f87171",
  };
  return map[category] ?? "#94a3b8";
}
