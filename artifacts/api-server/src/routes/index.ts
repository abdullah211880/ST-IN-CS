import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import { documentsRouter } from "./rag/documents.js";
import { sessionsRouter } from "./rag/sessions.js";
import { statsRouter } from "./rag/stats.js";
import { ttsRouter } from "./rag/tts.js";
import { questionsRouter } from "./rag/questions.js";
import { summaryRouter } from "./rag/summary.js";
import { assistantRouter } from "./rag/assistant.js";
import { quizRouter } from "./rag/quiz.js";
import { mindmapRouter } from "./rag/mindmap.js";
import { suggestionsRouter } from "./rag/suggestions.js";
import { goalsRouter } from "./rag/goals.js";
import { bugfinderRouter } from "./rag/bugfinder.js";
import { scamCheckerRouter } from "./rag/scamchecker.js";
import { virusTotalRouter } from "./rag/virustotal.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(sessionsRouter);
router.use(statsRouter);
router.use(ttsRouter);
router.use(questionsRouter);
router.use(summaryRouter);
router.use(assistantRouter);
router.use(quizRouter);
router.use(mindmapRouter);
router.use(suggestionsRouter);
router.use(goalsRouter);
router.use(bugfinderRouter);
router.use(scamCheckerRouter);
router.use(virusTotalRouter);

export default router;
