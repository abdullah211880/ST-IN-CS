import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { documentsTable, chunksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processDocument } from "../../lib/mcp-engine.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/documents", async (req, res) => {
  const docs = await db
    .select()
    .from(documentsTable)
    .orderBy(documentsTable.createdAt);

  res.json(docs.map(d => ({
    id: d.id,
    filename: d.filename,
    documentType: d.documentType,
    status: d.status,
    chunkCount: d.chunkCount,
    topics: d.topics,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  })));
});

router.post("/documents", upload.single("file"), async (req, res) => {
  const filename = req.body.filename as string || req.file?.originalname || "document.txt";
  const documentType = req.body.documentType as string || "text";
  let content: string;

  if (req.file) {
    content = req.file.buffer.toString("utf-8");
  } else if (req.body.content) {
    content = req.body.content as string;
  } else {
    res.status(400).json({ error: "Either file or content is required" });
    return;
  }

  const docId = randomUUID();
  const [doc] = await db.insert(documentsTable).values({
    id: docId,
    filename,
    documentType,
    status: "processing",
    content,
    chunkCount: 0,
    topics: [],
  }).returning();

  res.status(201).json({
    id: doc.id,
    filename: doc.filename,
    documentType: doc.documentType,
    status: doc.status,
    chunkCount: doc.chunkCount,
    topics: doc.topics,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });

  processDocument(docId, content, filename, req.log).catch(err => {
    req.log.error({ err, docId }, "Document processing failed");
    db.update(documentsTable)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(documentsTable.id, docId))
      .catch(() => {});
  });
});

router.get("/documents/:id", async (req, res) => {
  const doc = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, req.params.id))
    .then(r => r[0]);

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json({
    id: doc.id,
    filename: doc.filename,
    documentType: doc.documentType,
    status: doc.status,
    chunkCount: doc.chunkCount,
    topics: doc.topics,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
});

router.delete("/documents/:id", async (req, res) => {
  await db.delete(chunksTable).where(eq(chunksTable.documentId, req.params.id));
  await db.delete(documentsTable).where(eq(documentsTable.id, req.params.id));
  res.status(204).send();
});

router.get("/documents/:id/chunks", async (req, res) => {
  const chunks = await db
    .select()
    .from(chunksTable)
    .where(eq(chunksTable.documentId, req.params.id))
    .orderBy(chunksTable.chunkIndex);

  res.json(chunks.map(c => ({
    id: c.id,
    documentId: c.documentId,
    content: c.content,
    chunkIndex: c.chunkIndex,
    topic: c.topic,
    pageNumber: c.pageNumber,
    metadata: c.metadata,
  })));
});

export { router as documentsRouter };
