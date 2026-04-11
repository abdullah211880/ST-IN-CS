import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import { documentsRouter } from "./rag/documents.js";
import { sessionsRouter } from "./rag/sessions.js";
import { statsRouter } from "./rag/stats.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(sessionsRouter);
router.use(statsRouter);

export default router;
