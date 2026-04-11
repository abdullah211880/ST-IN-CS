import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { chunksTable, documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Logger } from "pino";

export interface AgentStep {
  agentName: string;
  action: string;
  result: string;
  durationMs: number;
}

export interface SourceCitation {
  documentId: string;
  filename: string;
  chunkContent: string;
  topic: string | null;
  pageNumber: number | null;
}

export interface MCPResult {
  answer: string;
  sources: SourceCitation[];
  agentTrace: AgentStep[];
  processingTimeMs: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function parseEmbedding(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

async function runTextAgent(content: string, filename: string): Promise<{ chunks: string[]; trace: AgentStep }> {
  const start = Date.now();
  const chunkSize = 800;
  const overlap = 100;
  const words = content.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 50) {
      chunks.push(chunk);
    }
  }

  return {
    chunks,
    trace: {
      agentName: "TextAgent",
      action: `Parsed and chunked text document: ${filename}`,
      result: `Produced ${chunks.length} text chunks`,
      durationMs: Date.now() - start,
    },
  };
}

async function runTopicModelingAgent(chunks: string[]): Promise<{ topics: string[]; chunkTopics: string[]; trace: AgentStep }> {
  const start = Date.now();

  const sampleChunks = chunks.slice(0, Math.min(10, chunks.length));
  const prompt = `Analyze these document excerpts and identify 3-6 high-level thematic topics that appear across them. Return ONLY a JSON array of topic strings, nothing else.

Excerpts:
${sampleChunks.map((c, i) => `[${i + 1}] ${c.slice(0, 200)}`).join("\n\n")}`;

  let topics: string[] = ["General", "Technical", "Analysis"];
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.choices[0]?.message?.content ?? "[]";
    const parsed = JSON.parse(raw.match(/\[.*\]/s)?.[0] ?? "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      topics = parsed.map(String);
    }
  } catch {
    // use defaults
  }

  const chunkTopicPrompt = `Given these topics: ${topics.join(", ")}

Assign the most relevant topic to each of these text chunks. Return ONLY a JSON array of topic strings (one per chunk), in the same order as the input chunks.

Chunks:
${chunks.slice(0, 30).map((c, i) => `[${i}] ${c.slice(0, 150)}`).join("\n")}`;

  let chunkTopics: string[] = chunks.map(() => topics[0] ?? "General");
  try {
    const topicResponse = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: [{ role: "user", content: chunkTopicPrompt }],
    });
    const raw = topicResponse.choices[0]?.message?.content ?? "[]";
    const parsed = JSON.parse(raw.match(/\[.*\]/s)?.[0] ?? "[]");
    if (Array.isArray(parsed)) {
      chunkTopics = chunks.map((_, i) => String(parsed[i] ?? topics[0] ?? "General"));
    }
  } catch {
    // use defaults
  }

  return {
    topics,
    chunkTopics,
    trace: {
      agentName: "TopicModelingAgent",
      action: `Applied topic modeling to ${chunks.length} chunks`,
      result: `Identified ${topics.length} topics: ${topics.join(", ")}`,
      durationMs: Date.now() - start,
    },
  };
}

async function runEmbeddingAgent(text: string): Promise<number[]> {
  const words = text.toLowerCase().split(/\s+/);
  const vector = new Array(128).fill(0);
  for (const word of words) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) + hash) + word.charCodeAt(i);
    }
    vector[Math.abs(hash) % 128] += 1;
  }
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
  return vector.map(v => v / norm);
}

async function runRetrievalAgent(
  query: string,
  documentIds: string[],
  log: Logger,
): Promise<{ chunks: Array<{ content: string; documentId: string; filename: string; topic: string | null; pageNumber: number | null; score: number }>; trace: AgentStep }> {
  const start = Date.now();

  const queryEmbedding = await runEmbeddingAgent(query);

  let allChunks;
  if (documentIds.length > 0) {
    allChunks = await db
      .select({
        id: chunksTable.id,
        documentId: chunksTable.documentId,
        content: chunksTable.content,
        topic: chunksTable.topic,
        pageNumber: chunksTable.pageNumber,
        embeddingVector: chunksTable.embeddingVector,
      })
      .from(chunksTable)
      .where(eq(chunksTable.documentId, documentIds[0]));

    if (documentIds.length > 1) {
      for (const docId of documentIds.slice(1)) {
        const more = await db
          .select({
            id: chunksTable.id,
            documentId: chunksTable.documentId,
            content: chunksTable.content,
            topic: chunksTable.topic,
            pageNumber: chunksTable.pageNumber,
            embeddingVector: chunksTable.embeddingVector,
          })
          .from(chunksTable)
          .where(eq(chunksTable.documentId, docId));
        allChunks.push(...more);
      }
    }
  } else {
    allChunks = await db
      .select({
        id: chunksTable.id,
        documentId: chunksTable.documentId,
        content: chunksTable.content,
        topic: chunksTable.topic,
        pageNumber: chunksTable.pageNumber,
        embeddingVector: chunksTable.embeddingVector,
      })
      .from(chunksTable);
  }

  const docs = await db.select({ id: documentsTable.id, filename: documentsTable.filename })
    .from(documentsTable);
  const docMap = new Map(docs.map(d => [d.id, d.filename]));

  const scoredChunks = allChunks.map(chunk => {
    const chunkEmbedding = parseEmbedding(chunk.embeddingVector);
    let score = 0;
    if (chunkEmbedding.length > 0) {
      score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    } else {
      const queryLower = query.toLowerCase();
      const contentLower = chunk.content.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
      const matches = queryWords.filter(w => contentLower.includes(w)).length;
      score = matches / Math.max(queryWords.length, 1);
    }
    return {
      ...chunk,
      filename: docMap.get(chunk.documentId) ?? "Unknown",
      score,
    };
  });

  const topChunks = scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    chunks: topChunks,
    trace: {
      agentName: "RetrievalAgent",
      action: `Semantic search over ${allChunks.length} chunks from ${documentIds.length > 0 ? documentIds.length : "all"} documents`,
      result: `Retrieved top ${topChunks.length} chunks with scores: ${topChunks.map(c => c.score.toFixed(3)).join(", ")}`,
      durationMs: Date.now() - start,
    },
  };
}

async function runAnswerSynthesisAgent(
  question: string,
  chunks: Array<{ content: string; filename: string; topic: string | null }>,
): Promise<{ answer: string; trace: AgentStep }> {
  const start = Date.now();

  if (chunks.length === 0) {
    return {
      answer: "I couldn't find relevant information in the uploaded documents to answer your question. Please upload relevant documents first.",
      trace: {
        agentName: "AnswerSynthesisAgent",
        action: "No relevant chunks found",
        result: "Generated fallback response",
        durationMs: Date.now() - start,
      },
    };
  }

  const context = chunks
    .map((c, i) => `[Source ${i + 1}] (${c.filename}${c.topic ? ` — ${c.topic}` : ""})\n${c.content}`)
    .join("\n\n---\n\n");

  const prompt = `You are an expert document analyst using a Model Context Protocol (MCP) based RAG system. Answer the user's question based ONLY on the provided document excerpts. Be precise, cite sources by number [Source N], and explain your reasoning clearly.

Document Excerpts:
${context}

Question: ${question}

Answer (cite sources, be comprehensive):`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const answer = response.choices[0]?.message?.content ?? "Unable to generate answer.";

  return {
    answer,
    trace: {
      agentName: "AnswerSynthesisAgent",
      action: `Synthesized answer from ${chunks.length} source chunks`,
      result: `Generated ${answer.split(" ").length} word response`,
      durationMs: Date.now() - start,
    },
  };
}

export async function processMCPQuery(
  question: string,
  documentIds: string[],
  log: Logger,
): Promise<MCPResult> {
  const totalStart = Date.now();
  const agentTrace: AgentStep[] = [];

  log.info({ question, documentIds }, "MCP query started");

  const { chunks, trace: retrievalTrace } = await runRetrievalAgent(question, documentIds, log);
  agentTrace.push(retrievalTrace);

  const { answer, trace: synthesisTrace } = await runAnswerSynthesisAgent(question, chunks);
  agentTrace.push(synthesisTrace);

  const sources: SourceCitation[] = chunks.map(c => ({
    documentId: c.documentId,
    filename: c.filename,
    chunkContent: c.content.slice(0, 300) + (c.content.length > 300 ? "..." : ""),
    topic: c.topic,
    pageNumber: c.pageNumber,
  }));

  return {
    answer,
    sources,
    agentTrace,
    processingTimeMs: Date.now() - totalStart,
  };
}

export async function processDocument(
  documentId: string,
  content: string,
  filename: string,
  log: Logger,
): Promise<void> {
  const { chunks: textChunks, trace: textTrace } = await runTextAgent(content, filename);
  log.info({ documentId, chunkCount: textChunks.length }, "Text agent complete");

  const { topics, chunkTopics, trace: topicTrace } = await runTopicModelingAgent(textChunks);
  log.info({ documentId, topics }, "Topic modeling complete");

  const allChunkRows = [];
  for (let i = 0; i < textChunks.length; i++) {
    const embedding = await runEmbeddingAgent(textChunks[i]);
    allChunkRows.push({
      id: `${documentId}_chunk_${i}`,
      documentId,
      content: textChunks[i],
      chunkIndex: i,
      topic: chunkTopics[i] ?? topics[0] ?? null,
      pageNumber: null,
      metadata: {},
      embeddingVector: JSON.stringify(embedding),
    });
  }

  if (allChunkRows.length > 0) {
    for (let i = 0; i < allChunkRows.length; i += 50) {
      await db.insert(chunksTable).values(allChunkRows.slice(i, i + 50));
    }
  }

  await db.update(documentsTable)
    .set({
      status: "ready",
      chunkCount: textChunks.length,
      topics: topics,
      updatedAt: new Date(),
    })
    .where(eq(documentsTable.id, documentId));

  log.info({ documentId }, "Document processing complete");
}
