import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const SYSTEM_PROMPT = `You are a document analyst. Given document content, generate 7 important, diverse, and insightful questions that a user would find valuable to ask about it.

Rules:
- Cover different angles: facts, implications, comparisons, risks, definitions, processes
- Make questions specific to THIS document's content, not generic
- Questions should be answerable from the document
- Vary length and complexity — mix quick-fact questions with deeper analytical ones
- Output ONLY a valid JSON array of strings. No markdown, no explanation.

Example output: ["What is the total coverage amount specified?", "Which exclusions apply to pre-existing conditions?"]`;

router.get("/documents/:id/suggest-questions", async (req, res) => {
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

  const excerpt = doc.content.slice(0, 6000);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Document title: "${doc.filename}"\n\nContent:\n${excerpt}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";

  let questions: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      questions = parsed.filter((q): q is string => typeof q === "string").slice(0, 8);
    }
  } catch {
    const matches = raw.match(/"([^"]+\?)"/g);
    if (matches) questions = matches.map(m => m.replace(/^"|"$/g, "")).slice(0, 8);
  }

  res.json({ documentId: doc.id, filename: doc.filename, questions });
});

export { router as questionsRouter };
