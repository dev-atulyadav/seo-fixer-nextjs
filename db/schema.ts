import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { defineRelations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// 1. Audit Status Enum
export const auditStatusEnum = pgEnum("audit_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

// 2. Domains Table
export const domains = pgTable("domains", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  url: text("url").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 3. Audits Table
export const audits = pgTable("audits", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  domainId: text("domain_id")
    .notNull()
    .references(() => domains.id, { onDelete: "cascade" }),
  status: auditStatusEnum("status").default("PENDING").notNull(),
  performanceScore: integer("performance_score"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 4. Page Results Table
export const pageResults = pgTable("page_results", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  auditId: text("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  statusCode: integer("status_code").notNull(),
  title: text("title"),
  metaDesc: text("meta_desc"),
  h1: text("h1"),
  missingAlt: integer("missing_alt").default(0).notNull(),
  brokenLinks: integer("broken_links").default(0).notNull(),
  suggestedDesc: text("suggested_desc"),
});

// --- Relations (for Drizzle Relational Queries / `db.query`) ---

export const relations = defineRelations(
  { domains, audits, pageResults },
  (r) => ({
    domains: {
      audits: r.many.audits(),
    },
    audits: {
      domain: r.one.domains({
        from: r.audits.domainId,
        to: r.domains.id,
      }),
      pageResults: r.many.pageResults(),
    },
    pageResults: {
      audit: r.one.audits({
        from: r.pageResults.auditId,
        to: r.audits.id,
      }),
    },
  })
);

// --- TypeScript Inferred Types ---
export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;

export type Audit = typeof audits.$inferSelect;
export type NewAudit = typeof audits.$inferInsert;

export type PageResult = typeof pageResults.$inferSelect;
export type NewPageResult = typeof pageResults.$inferInsert;