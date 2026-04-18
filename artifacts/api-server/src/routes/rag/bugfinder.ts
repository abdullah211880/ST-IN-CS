import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `You are an expert software engineer and code reviewer. Analyze the provided code for bugs, errors, and issues.

Return ONLY a valid JSON object with this exact shape (no markdown, no code fences):
{
  "hasBugs": true or false,
  "bugCount": <integer>,
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "bugs": [
    {
      "id": <integer starting at 1>,
      "line": <line number or null if not applicable>,
      "type": "syntax" | "logic" | "runtime" | "security" | "performance" | "style",
      "severity": "info" | "warning" | "error" | "critical",
      "description": "<clear explanation of the bug>",
      "suggestion": "<specific fix suggestion>"
    }
  ],
  "fixedCode": "<the complete corrected code, or the original code if no bugs>",
  "explanation": "<brief summary of what was wrong and what was fixed, max 3 sentences>",
  "codeQuality": "poor" | "fair" | "good" | "excellent",
  "language": "<detected or confirmed programming language>"
}

Rules:
- bugs: list ALL issues found, ordered by severity (critical → error → warning → info)
- fixedCode: ALWAYS return the complete code with ALL bugs fixed, properly formatted
- If hasBugs is false, return bugs as empty array and fixedCode as the original code unchanged
- Be specific about line numbers whenever possible
- For security bugs (SQL injection, XSS, etc.) always use severity "critical"
- Output ONLY the JSON, nothing else`;

router.post("/bugfinder", async (req, res) => {
  const { code, language = "auto-detect" } = req.body as { code?: string; language?: string };

  if (!code || !code.trim()) {
    res.status(400).json({ error: "No code provided" });
    return;
  }

  if (code.length > 50000) {
    res.status(400).json({ error: "Code too long (max 50,000 characters)" });
    return;
  }

  const userMsg = `Language: ${language}\n\nCode to analyze:\n\`\`\`\n${code}\n\`\`\``;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 3000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";

  let result: Record<string, unknown> = {};
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    result = JSON.parse(cleaned);
  } catch {
    result = {
      hasBugs: false,
      bugCount: 0,
      severity: "none",
      bugs: [],
      fixedCode: code,
      explanation: "Unable to analyze code. Please try again.",
      codeQuality: "fair",
      language,
    };
  }

  res.json(result);
});

export { router as bugfinderRouter };
