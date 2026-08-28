import { boolean, jsonb, pgEnum, pgTable, text } from "drizzle-orm/pg-core";

export const experienceLevelEnum = pgEnum("experience_level", [
  "student",
  "recent_grad",
  "early_career",
]);

export const profileOpportunityTypeEnum = pgEnum("profile_opportunity_type", [
  "fellowship",
  "builder_program",
  "ambassador_program",
  "hackathon",
  "scholarship",
  "grant",
]);

export const profilesTable = pgTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  educationLevel: text("education_level").notNull(),
  fieldOfStudy: text("field_of_study").notNull(),
  skills: jsonb("skills").$type<string[]>().notNull(),
  experience: text("experience"),
  interests: text("interests").notNull(),
  location: text("location").notNull(),
  remoteOk: boolean("remote_ok").notNull(),
  opportunityTypes: jsonb("opportunity_types")
    .$type<
      (
        | "fellowship"
        | "builder_program"
        | "ambassador_program"
        | "hackathon"
        | "scholarship"
        | "grant"
      )[]
    >()
    .notNull(),
  experienceLevel: experienceLevelEnum("experience_level").notNull(),
});

export type ProfileRow = typeof profilesTable.$inferSelect;
export type InsertProfile = typeof profilesTable.$inferInsert;

export const DEFAULT_PROFILE_ID = "default";
