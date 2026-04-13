import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const SYSTEM_PROMPT = `You are a senior document analyst. Produce a comprehensive, detailed analysis of the provided document.

Return ONLY a valid JSON object with this exact shape (no markdown, no code fences):
{
  "overview": "2-3 sentence plain-English summary of what the document is about",
  "executiveSummary": "3-5 sentence in-depth executive-level summary covering purpose, scope, and significance of the document",
  "keyPoints": ["detailed bullet point 1", "detailed bullet point 2", ...],
  "mainTopics": ["topic area 1", "topic area 2", ...],
  "targetAudience": "who this document is intended for",
  "sentiment": "one of: positive | neutral | negative | mixed",
  "criticalDates": ["date and its significance, e.g. 'Jan 1 2025 – Policy effective date'", ...],
  "recommendations": ["key action or recommendation 1", ...],
  "riskFactors": ["risk or concern 1", ...],
  "entities": ["important name/org/term 1", ...],
  "documentType": "one of: contract | policy | report | agreement | article | manual | specification | other",
  "complexity": "one of: basic | intermediate | advanced | expert",
  "wordCount": <estimated word count as integer>,
  "readingTimeMinutes": <estimated reading time in minutes as integer>
}

Rules:
- keyPoints: 8-12 items, each 10-20 words, covering the most important facts/clauses/findings in detail
- mainTopics: 3-6 high-level topic areas or sections covered
- criticalDates: dates/deadlines/timeframes explicitly mentioned; empty array if none
- recommendations: explicit recommendations, required actions, or next steps in the document; empty array if none
- riskFactors: risks, liabilities, obligations, warnings, or concerns; empty array if none
- entities: up to 12 key named entities (people, orgs, products, places, amounts, legal terms)
- targetAudience: specific description, e.g. "Insurance policy holders and corporate travel managers"
- Be specific to THIS document's actual content, never generic
- Output only the JSON object, nothing else`;

router.get("/documents/:id/summary", async (req, res) => {
  const doc = await db
    .select({ id: documentsTable.id, filename: documentsTable.filename, content: documentsTable.content })
    .from(documentsTable)
    .where(eq(documentsTable.id, req.params.id))
    .then(r => r[0]);

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  if (!doc.content || !doc.content.trim()) {
    res.status(422).json({ error: "Document has no extractable text content" });
    return;
  }

  const excerpt = doc.content.slice(0, 12000);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 1500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Document title: "${doc.filename}"\n\nContent:\n${excerpt}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";

  let summary: Record<string, unknown> = {};
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    summary = JSON.parse(cleaned);
  } catch {
    summary = {
      overview: raw, executiveSummary: "", keyPoints: [], mainTopics: [],
      targetAudience: "", sentiment: "neutral", criticalDates: [],
      recommendations: [], riskFactors: [], entities: [],
      documentType: "other", complexity: "intermediate", wordCount: 0, readingTimeMinutes: 0,
    };
  }

  res.json({
    documentId: doc.id,
    filename: doc.filename,
    totalChars: doc.content.length,
    ...summary,
  });
});

export { router as summaryRouter };
