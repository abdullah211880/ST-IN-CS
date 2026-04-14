import { pgTable, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const goalsTable = pgTable("goals", {
  id:          text("id").primaryKey(),
  title:       text("title").notNull(),
  rawGoal:     text("raw_goal").notNull(),
  category:    text("category").notNull().default("Personal Growth"),
  motivation:  text("motivation").notNull().default(""),
  overview:    text("overview").notNull().default(""),
  status:      text("status").notNull().default("active"),
  targetWeeks: integer("target_weeks").notNull().default(4),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export const goalStepsTable = pgTable("goal_steps", {
  id:          text("id").primaryKey(),
  goalId:      text("goal_id").notNull(),
  stepNumber:  integer("step_number").notNull(),
  title:       text("title").notNull(),
  description: text("description").notNull().default(""),
  durationDays:integer("duration_days").notNull().default(7),
  status:      text("status").notNull().default("pending"),
  taskPool:    jsonb("task_pool").notNull().$type<string[]>().default([]),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const dailyTasksTable = pgTable("daily_tasks", {
  id:           text("id").primaryKey(),
  goalId:       text("goal_id").notNull(),
  stepId:       text("step_id"),
  title:        text("title").notNull(),
  dueDate:      text("due_date").notNull(),
  completed:    boolean("completed").notNull().default(false),
  completedAt:  timestamp("completed_at"),
  reminderTime: text("reminder_time"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});
