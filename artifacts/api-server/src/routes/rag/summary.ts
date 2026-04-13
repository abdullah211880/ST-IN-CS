import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const SYSTEM_PROMPT = `You are a document analyst. Summarize the provided document content.

Return ONLY a valid JSON object with this exact shape (no markdown, no code fences):
{
  "overview": "2-3 sentence plain-English summary of what the document is about",
  "keyPoints": ["concise bullet point 1", "concise bullet point 2", ...],
  "entities": ["important name/org/term 1", "important name/org/term 2", ...],
  "documentType": "one of: contract | policy | report | agreement | article | manual | specification | other",
  "wordCount": <estimated word count as integer>,
  "readingTimeMinutes": <estimated reading time in minutes as integer>
}

Rules:
- keyPoints: 5-8 items, each under 15 words, covering the most important facts/clauses/findings
- entities: up to 8 key named entities (people, orgs, products, places, amounts, dates)
- Be specific to THIS document's actual content, not generic
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

  const excerpt = doc.content.slice(0, 8000);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Document title: "${doc.filename}"\n\nContent:\n${excerpt}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";

  let summary: Record<string, unknown> = {};
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    summary = JSON.parse(cleaned);
  } catch {
    summary = { overview: raw, keyPoints: [], entities: [], documentType: "other", wordCount: 0, readingTimeMinutes: 0 };
  }

  res.json({
    documentId: doc.id,
    filename: doc.filename,
    totalChars: doc.content.length,
    ...summary,
  });
});

export { router as summaryRouter };
