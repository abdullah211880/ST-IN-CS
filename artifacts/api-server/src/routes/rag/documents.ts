import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import pdfParse from "pdf-parse";
import { db } from "@workspace/db";
import { documentsTable, chunksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processDocument } from "../../lib/mcp-engine.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

async function extractTextFromBuffer(buffer: Buffer, filename: string, mimetype?: string): Promise<string> {
  const isPdf =
    mimetype === "application/pdf" ||
    filename.toLowerCase().endsWith(".pdf") ||
    (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);

  if (isPdf) {
    try {
      const data = await pdfParse(buffer);
      const text = (data.text ?? "").trim();
      if (!text) {
        throw new Error("PDF appears to contain no extractable text (may be a scanned image)");
      }
      return text;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`PDF text extraction failed: ${msg}`);
    }
  }

  const text = buffer.toString("utf-8");
  if (text.includes("\uFFFD") && text.includes("\u0000")) {
    throw new Error("This file appears to be binary. Please upload a text or PDF document.");
  }
  return text;
}

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
  const documentType = req.body.documentType as string || detectDocumentType(filename);
  let content: string;

  if (req.file) {
    try {
      content = await extractTextFromBuffer(req.file.buffer, filename, req.file.mimetype);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not read file";
      res.status(422).json({ error: msg });
      return;
    }
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

function detectDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "table";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image";
  return "text";
}

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
