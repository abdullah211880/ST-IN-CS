import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sessionsTable, ragMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processMCPQuery } from "../../lib/mcp-engine.js";

const router = Router();

router.get("/sessions", async (req, res) => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(sessionsTable.createdAt);

  const sessionIds = sessions.map(s => s.id);
  const messageCounts: Record<string, number> = {};

  for (const sid of sessionIds) {
    const msgs = await db
      .select({ id: ragMessagesTable.id })
      .from(ragMessagesTable)
      .where(eq(ragMessagesTable.sessionId, sid));
    messageCounts[sid] = msgs.length;
  }

  res.json(sessions.map(s => ({
    id: s.id,
    title: s.title,
    documentIds: s.documentIds,
    messageCount: messageCounts[s.id] ?? 0,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  })));
});

router.post("/sessions", async (req, res) => {
  const { title, documentIds } = req.body as { title: string; documentIds?: string[] };

  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const [session] = await db.insert(sessionsTable).values({
    id: randomUUID(),
    title,
    documentIds: documentIds ?? [],
  }).returning();

  res.status(201).json({
    id: session.id,
    title: session.title,
    documentIds: session.documentIds,
    messageCount: 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
});

router.get("/sessions/:id", async (req, res) => {
  const session = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, req.params.id))
    .then(r => r[0]);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const messages = await db
    .select()
    .from(ragMessagesTable)
    .where(eq(ragMessagesTable.sessionId, req.params.id))
    .orderBy(ragMessagesTable.createdAt);

  res.json({
    id: session.id,
    title: session.title,
    documentIds: session.documentIds,
    messages: messages.map(m => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      sources: m.sources,
      agentTrace: m.agentTrace,
      createdAt: m.createdAt,
    })),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
});

router.get("/sessions/:id/messages", async (req, res) => {
  const messages = await db
    .select()
    .from(ragMessagesTable)
    .where(eq(ragMessagesTable.sessionId, req.params.id))
    .orderBy(ragMessagesTable.createdAt);

  res.json(messages.map(m => ({
    id: m.id,
    sessionId: m.sessionId,
    role: m.role,
    content: m.content,
    sources: m.sources,
    agentTrace: m.agentTrace,
    createdAt: m.createdAt,
  })));
});

router.post("/sessions/:id/ask", async (req, res) => {
  const session = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, req.params.id))
    .then(r => r[0]);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { question, documentIds, language } = req.body as { question: string; documentIds?: string[]; language?: string };

  if (!question) {
    res.status(400).json({ error: "Question is required" });
    return;
  }

  const docIds = documentIds ?? (session.documentIds as string[]) ?? [];

  const [userMsg] = await db.insert(ragMessagesTable).values({
    id: randomUUID(),
    sessionId: req.params.id,
    role: "user",
    content: question,
    sources: [],
    agentTrace: [],
  }).returning();

  const mcpResult = await processMCPQuery(question, docIds, req.log, language);

  const [assistantMsg] = await db.insert(ragMessagesTable).values({
    id: randomUUID(),
    sessionId: req.params.id,
    role: "assistant",
    content: mcpResult.answer,
    sources: mcpResult.sources,
    agentTrace: mcpResult.agentTrace,
    processingTimeMs: mcpResult.processingTimeMs,
  }).returning();

  await db.update(sessionsTable)
    .set({ updatedAt: new Date() })
    .where(eq(sessionsTable.id, req.params.id));

  res.json({
    messageId: assistantMsg.id,
    answer: mcpResult.answer,
    sources: mcpResult.sources,
    agentTrace: mcpResult.agentTrace,
    processingTimeMs: mcpResult.processingTimeMs,
  });
});

export { router as sessionsRouter };
