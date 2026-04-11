import { pgTable, text, integer, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chunksTable = pgTable("chunks", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  topic: text("topic"),
  pageNumber: integer("page_number"),
  metadata: jsonb("metadata").default({}),
  embeddingVector: text("embedding_vector"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChunkSchema = createInsertSchema(chunksTable).omit({
  createdAt: true,
});

export type InsertChunk = z.infer<typeof insertChunkSchema>;
export type Chunk = typeof chunksTable.$inferSelect;
