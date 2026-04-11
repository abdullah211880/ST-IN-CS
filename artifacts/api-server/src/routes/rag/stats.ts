import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, chunksTable, sessionsTable, ragMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/stats/overview", async (req, res) => {
  const [docsResult, chunksResult, sessionsResult, messagesResult] = await Promise.all([
    db.select({ id: documentsTable.id }).from(documentsTable),
    db.select({ id: chunksTable.id }).from(chunksTable),
    db.select({ id: sessionsTable.id }).from(sessionsTable),
    db.select({ id: ragMessagesTable.id, role: ragMessagesTable.role, processingTimeMs: ragMessagesTable.processingTimeMs }).from(ragMessagesTable),
  ]);

  const questions = messagesResult.filter(m => m.role === "user");
  const answers = messagesResult.filter(m => m.role === "assistant" && m.processingTimeMs);
  const avgAnswerTimeMs = answers.length > 0
    ? Math.round(answers.reduce((s, m) => s + (m.processingTimeMs ?? 0), 0) / answers.length)
    : 0;

  const allTopics = await db.select({ topics: documentsTable.topics }).from(documentsTable);
  const uniqueTopics = new Set<string>();
  for (const d of allTopics) {
    for (const t of (d.topics as string[])) {
      uniqueTopics.add(t);
    }
  }

  res.json({
    totalDocuments: docsResult.length,
    totalChunks: chunksResult.length,
    totalSessions: sessionsResult.length,
    totalQuestions: questions.length,
    uniqueTopics: uniqueTopics.size,
    avgAnswerTimeMs,
  });
});

router.get("/stats/topics", async (req, res) => {
  const allChunks = await db
    .select({ topic: chunksTable.topic, documentId: chunksTable.documentId })
    .from(chunksTable);

  const topicMap = new Map<string, { chunkCount: number; documentIds: Set<string> }>();
  for (const chunk of allChunks) {
    const topic = chunk.topic ?? "General";
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { chunkCount: 0, documentIds: new Set() });
    }
    const entry = topicMap.get(topic)!;
    entry.chunkCount++;
    entry.documentIds.add(chunk.documentId);
  }

  const stats = Array.from(topicMap.entries()).map(([topic, data]) => ({
    topic,
    chunkCount: data.chunkCount,
    documentCount: data.documentIds.size,
  })).sort((a, b) => b.chunkCount - a.chunkCount);

  res.json(stats);
});

router.get("/stats/recent-activity", async (req, res) => {
  const recentMessages = await db
    .select()
    .from(ragMessagesTable)
    .orderBy(ragMessagesTable.createdAt)
    .limit(50);

  const userMessages = recentMessages.filter(m => m.role === "user");
  const assistantMessages = recentMessages.filter(m => m.role === "assistant");

  const sessions = await db.select({ id: sessionsTable.id, title: sessionsTable.title }).from(sessionsTable);
  const sessionMap = new Map(sessions.map(s => [s.id, s.title]));

  const activities = userMessages.slice(-20).reverse().map(userMsg => {
    const assistantMsg = assistantMessages.find(m => m.sessionId === userMsg.sessionId && m.createdAt > userMsg.createdAt);
    return {
      id: userMsg.id,
      sessionId: userMsg.sessionId,
      sessionTitle: sessionMap.get(userMsg.sessionId) ?? "Unknown Session",
      question: userMsg.content,
      answer: assistantMsg?.content?.slice(0, 200) ?? "Pending...",
      sourceCount: (assistantMsg?.sources as unknown[])?.length ?? 0,
      createdAt: userMsg.createdAt,
    };
  });

  res.json(activities);
});

export { router as statsRouter };
