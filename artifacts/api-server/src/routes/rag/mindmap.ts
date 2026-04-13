import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const SYSTEM_PROMPT = `You are a knowledge-mapping expert. Analyse the provided document and extract its core concepts as a hierarchical mind map.

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "centralTopic": "Short central theme of the document (max 6 words)",
  "branches": [
    {
      "id": "b1",
      "topic": "Branch topic (2-5 words)",
      "subtopics": [
        { "label": "Subtopic (2-5 words)", "detail": "1 sentence elaboration" },
        ...
      ]
    },
    ...
  ]
}

Rules:
- Produce 5-8 branches representing the main sections, themes, or categories of the document
- Each branch must have 2-5 subtopics that are specific facts, terms, clauses, or findings
- Central topic: the single most important theme or title concept
- Branch topics: major groupings (e.g. "Coverage Types", "Key Parties", "Obligations", "Timelines")
- Subtopic labels: concise, specific phrases extracted from the document content
- detail: optional 1-sentence note providing context or a key fact; omit if not meaningful
- All content must come from the actual document — no generic or invented information
- Output only the JSON object, nothing else`;

router.get("/documents/:id/mindmap", async (req, res) => {
  const doc = await db
    .select({ id: documentsTable.id, filename: documentsTable.filename, content: documentsTable.content })
    .from(documentsTable)
    .where(eq(documentsTable.id, req.params.id))
    .then(r => r[0]);

  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  if (!doc.content?.trim()) { res.status(422).json({ error: "Document has no extractable text content" }); return; }

  const excerpt = doc.content.slice(0, 10000);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 2000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Document title: "${doc.filename}"\n\nContent:\n${excerpt}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let mindmap: Record<string, unknown> = {};
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    mindmap = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse mind map from AI" });
    return;
  }

  res.json({ documentId: doc.id, filename: doc.filename, ...mindmap });
});

export { router as mindmapRouter };
