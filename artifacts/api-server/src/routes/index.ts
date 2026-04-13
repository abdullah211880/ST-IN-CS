import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import { documentsRouter } from "./rag/documents.js";
import { sessionsRouter } from "./rag/sessions.js";
import { statsRouter } from "./rag/stats.js";
import { ttsRouter } from "./rag/tts.js";
import { questionsRouter } from "./rag/questions.js";
import { summaryRouter } from "./rag/summary.js";
import { assistantRouter } from "./rag/assistant.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(sessionsRouter);
router.use(statsRouter);
router.use(ttsRouter);
router.use(questionsRouter);
router.use(summaryRouter);
router.use(assistantRouter);

export default router;
