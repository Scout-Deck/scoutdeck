import { pgTable, text } from "drizzle-orm/pg-core";
import { opportunitiesTable } from "./opportunities";

export const savedOpportunitiesTable = pgTable("saved_opportunities", {
  opportunityId: text("opportunity_id")
    .primaryKey()
    .references(() => opportunitiesTable.id, { onDelete: "cascade" }),
});

export type SavedOpportunityRow = typeof savedOpportunitiesTable.$inferSelect;
