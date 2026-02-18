// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { check, index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `issacompass-hack_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("name_idx").on(t.name)],
);

export const masterPrompt = createTable(
  "master_prompt",
  (d) => ({
    // Enforced singleton row id.
    id: d.integer().primaryKey().default(1).notNull(),
    prompt: d.text().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [check("master_prompt_singleton_id_check", sql`${t.id} = 1`)],
);

export const promptRun = createTable("prompt_run", (d) => ({
  id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
  createdAt: d
    .timestamp({ withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  inputClientSequence: d.text().notNull(),
  inputChatHistoryJson: d.jsonb().notNull(),
  consultantReply: d.text(),
  iterations: d.integer().notNull(),
  bestDelta: d.doublePrecision().notNull(),
  bestPrompt: d.text().notNull(),
  runLogJson: d.jsonb().notNull(),
}));
