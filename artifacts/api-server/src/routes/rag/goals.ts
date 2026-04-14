import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, goalsTable, goalStepsTable, dailyTasksTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const PLAN_SYSTEM = `You are an expert life coach and strategic planner. A user will share their goal.
Analyse it deeply and create a thorough, personalised plan.

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "category": "<one of: Health, Career, Education, Finance, Creative, Relationships, Personal Growth>",
  "motivation": "<2-3 warm, personal sentences about why this goal matters and the transformation it will create>",
  "overview": "<4-6 sentences: what the goal really means, realistic challenges they may face, the strategic approach, and what success looks like>",
  "targetWeeks": <realistic integer number of weeks>,
  "steps": [
    {
      "title": "<phase name>",
      "description": "<2-3 sentences: what this phase involves, why it matters>",
      "durationDays": <integer days for this phase>,
      "dailyTasks": ["<specific, actionable task achievable in one day>", ...] 
    }
  ]
}

Rules:
- 4-7 steps that together cover the full journey
- Each step must have 6-10 distinct daily tasks (they will be cycled each day)
- Tasks must be specific and actionable — not vague. E.g. "Write 500 words on chapter 1" not "Write something"
- Be motivating, realistic, and deeply personal to the stated goal
- Output ONLY the JSON object`;

const SUMMARY_SYSTEM = `You are an encouraging life coach reviewing a user's goal progress.
Given the goal, its steps, and completed tasks, write a warm and motivating progress summary.
Keep it to 3-5 sentences. Celebrate what they've done, acknowledge effort, and encourage next steps.
Output only the summary text, no formatting.`;

/* ─── helpers ─────────────────────────────────────────────── */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function generateTasksForStep(
  goalId: string,
  step: typeof goalStepsTable.$inferSelect,
  startDate: string,
  count = 7,
): (typeof dailyTasksTable.$inferInsert)[] {
  const pool = step.taskPool as string[];
  if (!pool.length) return [];
  return Array.from({ length: count }, (_, i) => ({
    id:      randomUUID(),
    goalId,
    stepId:  step.id,
    title:   pool[i % pool.length],
    dueDate: addDays(startDate, i),
    completed: false,
    reminderTime: "09:00",
  }));
}

/* ─── GET /api/goals ─────────────────────────────────────── */
router.get("/goals", async (_req, res) => {
  const goals = await db.select().from(goalsTable).orderBy(desc(goalsTable.createdAt));

  const results = await Promise.all(goals.map(async (g) => {
    const tasks = await db.select().from(dailyTasksTable).where(eq(dailyTasksTable.goalId, g.id));
    const steps = await db.select().from(goalStepsTable).where(eq(goalStepsTable.goalId, g.id)).orderBy(goalStepsTable.stepNumber);
    const today = todayStr();
    const todayTasks = tasks.filter(t => t.dueDate === today);
    const completedToday = todayTasks.filter(t => t.completed).length;
    const totalCompleted = tasks.filter(t => t.completed).length;
    return { ...g, steps, todayTasks: todayTasks.length, completedToday, totalCompleted, totalTasks: tasks.length };
  }));

  res.json(results);
});

/* ─── POST /api/goals ────────────────────────────────────── */
router.post("/goals", async (req, res) => {
  const { rawGoal } = req.body ?? {};
  if (!rawGoal?.trim()) { res.status(400).json({ error: "Goal description is required." }); return; }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 3000,
    messages: [
      { role: "system", content: PLAN_SYSTEM },
      { role: "user", content: rawGoal.trim() },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let plan: { category: string; motivation: string; overview: string; targetWeeks: number; steps: { title: string; description: string; durationDays: number; dailyTasks: string[] }[] };
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    plan = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse AI plan." }); return;
  }

  const goalId = randomUUID();
  const title = rawGoal.trim().slice(0, 120);

  const [goal] = await db.insert(goalsTable).values({
    id: goalId, title, rawGoal: rawGoal.trim(),
    category: plan.category ?? "Personal Growth",
    motivation: plan.motivation ?? "",
    overview: plan.overview ?? "",
    status: "active",
    targetWeeks: plan.targetWeeks ?? 4,
  }).returning();

  const steps = await Promise.all((plan.steps ?? []).map(async (s, i) => {
    const [step] = await db.insert(goalStepsTable).values({
      id: randomUUID(), goalId,
      stepNumber: i + 1,
      title: s.title,
      description: s.description ?? "",
      durationDays: s.durationDays ?? 7,
      status: i === 0 ? "active" : "pending",
      taskPool: s.dailyTasks ?? [],
    }).returning();
    return step;
  }));

  // Generate 7 days of tasks from first step
  const firstStep = steps[0];
  if (firstStep) {
    const tasks = generateTasksForStep(goalId, firstStep, todayStr(), Math.min(firstStep.durationDays, 7));
    if (tasks.length) await db.insert(dailyTasksTable).values(tasks);
  }

  res.status(201).json({ ...goal, steps });
});

/* ─── GET /api/goals/:id ─────────────────────────────────── */
router.get("/goals/:id", async (req, res) => {
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, req.params.id));
  if (!goal) { res.status(404).json({ error: "Goal not found." }); return; }

  const steps = await db.select().from(goalStepsTable)
    .where(eq(goalStepsTable.goalId, goal.id))
    .orderBy(goalStepsTable.stepNumber);

  const tasks = await db.select().from(dailyTasksTable)
    .where(eq(dailyTasksTable.goalId, goal.id))
    .orderBy(dailyTasksTable.dueDate);

  res.json({ ...goal, steps, tasks });
});

/* ─── PATCH /api/goals/:id/status ───────────────────────── */
router.patch("/goals/:id/status", async (req, res) => {
  const { status } = req.body ?? {};
  const VALID = ["active", "paused", "completed", "abandoned"];
  if (!VALID.includes(status)) { res.status(400).json({ error: "Invalid status." }); return; }
  const [updated] = await db.update(goalsTable).set({ status, updatedAt: new Date() })
    .where(eq(goalsTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Goal not found." }); return; }
  res.json(updated);
});

/* ─── DELETE /api/goals/:id ──────────────────────────────── */
router.delete("/goals/:id", async (req, res) => {
  await db.delete(dailyTasksTable).where(eq(dailyTasksTable.goalId, req.params.id));
  await db.delete(goalStepsTable).where(eq(goalStepsTable.goalId, req.params.id));
  const [deleted] = await db.delete(goalsTable).where(eq(goalsTable.id, req.params.id)).returning();
  if (!deleted) { res.status(404).json({ error: "Goal not found." }); return; }
  res.json({ success: true });
});

/* ─── POST /api/goals/:id/tasks/generate ─────────────────── */
router.post("/goals/:id/tasks/generate", async (req, res) => {
  const { stepId } = req.body ?? {};

  const steps = await db.select().from(goalStepsTable)
    .where(eq(goalStepsTable.goalId, req.params.id))
    .orderBy(goalStepsTable.stepNumber);

  const step = stepId
    ? steps.find(s => s.id === stepId)
    : steps.find(s => s.status === "active") ?? steps.find(s => s.status === "pending");

  if (!step) { res.status(404).json({ error: "No step found to generate tasks for." }); return; }

  // Find latest dueDate for this goal
  const existing = await db.select().from(dailyTasksTable)
    .where(eq(dailyTasksTable.goalId, req.params.id))
    .orderBy(desc(dailyTasksTable.dueDate));

  const latestDate = existing[0]?.dueDate ?? todayStr();
  const startDate = addDays(latestDate, 1);
  const count = Math.min(step.durationDays, 7);
  const tasks = generateTasksForStep(req.params.id, step, startDate, count);

  if (!tasks.length) { res.status(422).json({ error: "Step has no tasks in its pool." }); return; }

  // Activate the step if needed
  if (step.status === "pending") {
    await db.update(goalStepsTable).set({ status: "active" }).where(eq(goalStepsTable.id, step.id));
  }

  const inserted = await db.insert(dailyTasksTable).values(tasks).returning();
  res.json(inserted);
});

/* ─── PATCH /api/tasks/:id/toggle ───────────────────────── */
router.patch("/tasks/:id/toggle", async (req, res) => {
  const [task] = await db.select().from(dailyTasksTable).where(eq(dailyTasksTable.id, req.params.id));
  if (!task) { res.status(404).json({ error: "Task not found." }); return; }

  const [updated] = await db.update(dailyTasksTable)
    .set({ completed: !task.completed, completedAt: !task.completed ? new Date() : null })
    .where(eq(dailyTasksTable.id, task.id))
    .returning();

  res.json(updated);
});

/* ─── PATCH /api/tasks/:id/reminder ─────────────────────── */
router.patch("/tasks/:id/reminder", async (req, res) => {
  const { reminderTime } = req.body ?? {};
  const [updated] = await db.update(dailyTasksTable)
    .set({ reminderTime: reminderTime || null })
    .where(eq(dailyTasksTable.id, req.params.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Task not found." }); return; }
  res.json(updated);
});

/* ─── GET /api/goals/:id/summary ────────────────────────── */
router.get("/goals/:id/summary", async (req, res) => {
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, req.params.id));
  if (!goal) { res.status(404).json({ error: "Goal not found." }); return; }

  const steps = await db.select().from(goalStepsTable)
    .where(eq(goalStepsTable.goalId, goal.id))
    .orderBy(goalStepsTable.stepNumber);

  const tasks = await db.select().from(dailyTasksTable)
    .where(and(eq(dailyTasksTable.goalId, goal.id), eq(dailyTasksTable.completed, true)));

  const completedList = tasks.slice(-10).map(t => `• ${t.title} (${t.dueDate})`).join("\n");
  const totalDone = tasks.length;
  const currentStep = steps.find(s => s.status === "active") ?? steps[0];

  const context = [
    `Goal: "${goal.title}"`,
    `Category: ${goal.category}`,
    `Current phase: ${currentStep?.title ?? "Starting out"}`,
    `Total tasks completed: ${totalDone}`,
    totalDone > 0 ? `Recent completions:\n${completedList}` : "No tasks completed yet.",
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 300,
    messages: [
      { role: "system", content: SUMMARY_SYSTEM },
      { role: "user", content: context },
    ],
  });

  res.json({ summary: completion.choices[0]?.message?.content?.trim() ?? "" });
});

export { router as goalsRouter };
