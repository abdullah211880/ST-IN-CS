import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const VALID_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VALID_VOICES)[number];

const CHUNK_SIZE = 4000;
const MAX_CHARS = 24_000;

function splitText(text: string): string[] {
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    let end = offset + CHUNK_SIZE;
    if (end < text.length) {
      const nl = text.lastIndexOf("\n", end);
      if (nl > offset + CHUNK_SIZE / 2) end = nl + 1;
      else {
        const sp = text.lastIndexOf(" ", end);
        if (sp > offset + CHUNK_SIZE / 2) end = sp + 1;
      }
    }
    const chunk = text.slice(offset, end).trim();
    if (chunk) chunks.push(chunk);
    offset = end;
  }
  return chunks;
}

router.post("/documents/:id/tts", async (req, res) => {
  const doc = await db
    .select()
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

  const rawVoice = (req.body?.voice as string) || "alloy";
  const voice: Voice = VALID_VOICES.includes(rawVoice as Voice) ? (rawVoice as Voice) : "alloy";

  const text = doc.content.slice(0, MAX_CHARS);
  const chunks = splitText(text);
  const truncated = doc.content.length > MAX_CHARS;

  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: chunk,
      response_format: "mp3",
    });
    buffers.push(Buffer.from(await speech.arrayBuffer()));
  }

  const audio = Buffer.concat(buffers);
  const safeName = doc.filename.replace(/[^a-z0-9._-]/gi, "_");

  res.set({
    "Content-Type": "audio/mpeg",
    "Content-Length": String(audio.length),
    "Content-Disposition": `attachment; filename="${safeName}.mp3"`,
    "X-Char-Count": String(text.length),
    "X-Total-Chars": String(doc.content.length),
    "X-Truncated": String(truncated),
  });
  res.send(audio);
});

export { router as ttsRouter };
