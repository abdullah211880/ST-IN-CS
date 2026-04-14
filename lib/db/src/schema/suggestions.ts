import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const suggestionsTable = pgTable("suggestions", {
  id:          text("id").primaryKey(),
  title:       text("title").notNull(),
  category:    text("category").notNull().default("Feature"),
  description: text("description").notNull(),
  email:       text("email"),
  status:      text("status").notNull().default("pending"),
  votes:       integer("votes").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});
