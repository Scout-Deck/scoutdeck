import {
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
} from "drizzle-orm/pg-core";

export const opportunityTypeEnum = pgEnum("opportunity_type", [
  "fellowship",
  "builder_program",
  "ambassador_program",
  "hackathon",
  "scholarship",
  "grant",
]);

export const opportunitySourceTypeEnum = pgEnum("opportunity_source_type", [
  "scraped",
  "user_submitted",
]);

export type Eligibility = {
  educationLevel: string;
  experience: string;
  location: string;
  remoteOk: boolean;
  otherCriteria: string;
};

export const opportunitiesTable = pgTable("opportunities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  organization: text("organization").notNull(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url").notNull(),
  type: opportunityTypeEnum("type").notNull(),
  score: real("score").notNull(),
  why: text("why").notNull(),
  deadline: text("deadline"),
  compensation: text("compensation"),
  sourceType: opportunitySourceTypeEnum("source_type").notNull(),
  requiredSkills: jsonb("required_skills").$type<string[]>().notNull(),
  eligibility: jsonb("eligibility").$type<Eligibility>().notNull(),
  notes: text("notes"),
});

export type OpportunityRow = typeof opportunitiesTable.$inferSelect;
export type InsertOpportunity = typeof opportunitiesTable.$inferInsert;
