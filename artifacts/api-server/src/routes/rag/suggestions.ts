import { Router } from "express";
import { db, suggestionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sendSuggestionEmail } from "../../lib/mailer.js";

const router = Router();

const VALID_CATEGORIES = ["Feature", "Integration", "Improvement", "Bug Report"];

/* ── GET all suggestions ─────────────────────────────────── */
router.get("/suggestions", async (_req, res) => {
  const rows = await db
    .select()
    .from(suggestionsTable)
    .orderBy(desc(suggestionsTable.votes), desc(suggestionsTable.createdAt));
  res.json(rows);
});

/* ── POST create suggestion ──────────────────────────────── */
router.post("/suggestions", async (req, res) => {
  const { title, category, description, email } = req.body ?? {};
  if (!title?.trim())       { res.status(400).json({ error: "Title is required." }); return; }
  if (!description?.trim()) { res.status(400).json({ error: "Description is required." }); return; }
  if (category && !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: "Invalid category." }); return;
  }

  const saved = await db.insert(suggestionsTable).values({
    id:          randomUUID(),
    title:       title.trim(),
    category:    category || "Feature",
    description: description.trim(),
    email:       email?.trim() || null,
    status:      "pending",
    votes:       0,
  }).returning();

  // Respond immediately — email fires in background
  res.status(201).json(saved[0]);

  sendSuggestionEmail({
    title:       saved[0].title,
    category:    saved[0].category,
    description: saved[0].description,
    email:       saved[0].email,
    submittedAt: saved[0].createdAt,
  }).catch(err => console.error("[mailer] Failed to send suggestion email:", err));
});

/* ── POST upvote ─────────────────────────────────────────── */
router.post("/suggestions/:id/vote", async (req, res) => {
  const { id } = req.params;
  const updated = await db
    .update(suggestionsTable)
    .set({ votes: sql`${suggestionsTable.votes} + 1` })
    .where(eq(suggestionsTable.id, id))
    .returning();
  if (!updated.length) { res.status(404).json({ error: "Suggestion not found." }); return; }
  res.json(updated[0]);
});

export { router as suggestionsRouter };
