import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function buildPrompt(difficulty: string, count: number, types: string): string {
  const typeGuide =
    types === "mcq"
      ? "All questions must be multiple-choice (type: 'mcq') with exactly 4 options."
      : types === "true_false"
      ? "All questions must be true/false (type: 'true_false') with options ['True','False']."
      : `Mix of multiple-choice (type: 'mcq') and true/false (type: 'true_false'). Aim for roughly 70% MCQ, 30% true/false.`;

  const diffGuide =
    difficulty === "easy"
      ? "Questions should test basic recall and comprehension of explicit facts."
      : difficulty === "hard"
      ? "Questions should require deep analysis, inference, and application of complex concepts from the document."
      : "Questions should test understanding, not just recall. Include some inference and interpretation.";

  return `You are an expert exam author. Generate a quiz based on the provided document content.

Difficulty: ${difficulty.toUpperCase()} — ${diffGuide}
Question types: ${typeGuide}
Total questions: ${count}

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "title": "A short quiz title relevant to this document",
  "questions": [
    {
      "id": <integer starting at 1>,
      "type": "mcq" | "true_false",
      "question": "Clear, specific question text",
      "options": ["A. option text", "B. option text", "C. option text", "D. option text"],
      "correctAnswer": "A" | "B" | "C" | "D" | "True" | "False",
      "explanation": "1-2 sentence explanation of why this is the correct answer, with reference to document content"
    }
  ]
}

Rules:
- For true_false, options must be exactly ["True", "False"] and correctAnswer must be "True" or "False"
- For mcq, options must be exactly 4 strings starting with "A. ", "B. ", "C. ", "D. "
- All questions must be grounded in the actual document content — no generic questions
- Distractors (wrong options) must be plausible but clearly incorrect to someone who read the document
- Do not repeat similar questions
- Output only the JSON object`;
}

router.get("/documents/:id/quiz", async (req, res) => {
  const { count = "10", difficulty = "medium", types = "mixed" } = req.query as Record<string, string>;
  const questionCount = Math.min(Math.max(parseInt(count, 10) || 10, 3), 20);

  const doc = await db
    .select({ id: documentsTable.id, filename: documentsTable.filename, content: documentsTable.content })
    .from(documentsTable)
    .where(eq(documentsTable.id, req.params.id))
    .then(r => r[0]);

  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  if (!doc.content?.trim()) { res.status(422).json({ error: "Document has no extractable text content" }); return; }

  const excerpt = doc.content.slice(0, 12000);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 3000,
    messages: [
      { role: "system", content: buildPrompt(difficulty, questionCount, types) },
      { role: "user", content: `Document title: "${doc.filename}"\n\nContent:\n${excerpt}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let quiz: Record<string, unknown> = {};
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    quiz = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse quiz response from AI" });
    return;
  }

  res.json({
    documentId: doc.id,
    filename: doc.filename,
    difficulty,
    types,
    ...quiz,
  });
});

export { router as quizRouter };
