import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `You are a cybersecurity expert specializing in fraud and scam detection. Analyze the provided message or email and determine whether it is a scam, suspicious, or safe.

Return ONLY a valid JSON object with this exact shape (no markdown, no code fences):
{
  "verdict": "scam" | "suspicious" | "safe",
  "confidence": "high" | "medium" | "low",
  "riskScore": <integer 0-100, where 0=totally safe, 100=definite scam>,
  "scamType": "phishing" | "lottery" | "romance" | "advance_fee" | "impersonation" | "investment" | "tech_support" | "job_offer" | "charity" | "other" | null,
  "explanation": "<clear 2-3 sentence summary of why this is or isn't a scam>",
  "redFlags": ["<specific red flag found in the message>", ...],
  "safeIndicators": ["<reason it appears legitimate>", ...],
  "recommendation": "<one actionable sentence telling the user what to do>"
}

Rules:
- verdict "scam": strong evidence of fraudulent intent (riskScore 70-100)
- verdict "suspicious": some warning signs but not conclusive (riskScore 35-69)
- verdict "safe": appears legitimate with no significant red flags (riskScore 0-34)
- redFlags: list every specific suspicious element found (urgency tactics, grammar errors, suspicious links, requests for personal info, money requests, too-good-to-be-true offers, etc.)
- safeIndicators: elements that suggest legitimacy (official domain, consistent branding, no money requests, etc.)
- scamType: categorize the type of scam if verdict is scam or suspicious, else null
- Be specific and reference actual content from the message
- Output ONLY the JSON, nothing else`;

router.post("/scam-checker", async (req, res) => {
  const { message } = req.body as { message?: string };

  if (!message || !message.trim()) {
    res.status(400).json({ error: "No message provided" });
    return;
  }

  if (message.length > 20000) {
    res.status(400).json({ error: "Message too long (max 20,000 characters)" });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 1200,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this message:\n\n${message}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";

  let result: Record<string, unknown> = {};
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    result = JSON.parse(cleaned);
  } catch {
    result = {
      verdict: "suspicious",
      confidence: "low",
      riskScore: 50,
      scamType: null,
      explanation: "Unable to fully analyze the message. Please try again.",
      redFlags: [],
      safeIndicators: [],
      recommendation: "Proceed with caution and verify through official channels.",
    };
  }

  res.json(result);
});

export { router as scamCheckerRouter };
