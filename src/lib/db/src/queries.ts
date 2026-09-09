import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import {
  DEFAULT_PROFILE_ID,
  type OpportunityRow,
  opportunitiesTable,
  profilesTable,
  savedOpportunitiesTable,
  type ProfileRow,
} from "./schema";
import type { OpportunityType } from "@/lib/scout/types";

export type ApiOpportunity = {
  id: string;
  title: string;
  organization: string;
  summary: string;
  sourceUrl: string;
  type: OpportunityRow["type"];
  score: number;
  why: string;
  deadline: string | null;
  compensation: string | null;
  sourceType: OpportunityRow["sourceType"];
  requiredSkills: string[];
  eligibility: OpportunityRow["eligibility"];
  isSaved: boolean;
};

export type ApiProfile = {
  name: string;
  educationLevel: string;
  fieldOfStudy: string;
  skills: string[];
  experience: string;
  interests: string;
  location: string;
  remoteOk: boolean;
  opportunityTypes: ProfileRow["opportunityTypes"];
  experienceLevel: ProfileRow["experienceLevel"];
};

export type ProfileInput = Partial<ApiProfile>;

const defaultEligibility = {
  educationLevel: "Any",
  experience: "Any",
  location: "Any",
  remoteOk: true,
  otherCriteria: "",
};

function toApiOpportunity(
  row: OpportunityRow,
  savedIds: Set<string>,
): ApiOpportunity {
  return {
    id: row.id,
    title: row.title,
    organization: row.organization,
    summary: row.summary,
    sourceUrl: row.sourceUrl,
    type: row.type,
    score: row.score,
    why: row.why,
    deadline: row.deadline,
    compensation: row.compensation,
    sourceType: row.sourceType,
    requiredSkills: row.requiredSkills,
    eligibility: row.eligibility,
    isSaved: savedIds.has(row.id),
  };
}

function toApiProfile(row: ProfileRow): ApiProfile {
  return {
    name: row.name,
    educationLevel: row.educationLevel,
    fieldOfStudy: row.fieldOfStudy,
    skills: row.skills,
    experience: row.experience ?? "",
    interests: row.interests,
    location: row.location,
    remoteOk: row.remoteOk,
    opportunityTypes: row.opportunityTypes,
    experienceLevel: row.experienceLevel,
  };
}

async function getSavedIds(): Promise<Set<string>> {
  const db = getDb();
  const rows = await db.select().from(savedOpportunitiesTable);
  return new Set(rows.map((row) => row.opportunityId));
}

export async function listOpportunities(params?: {
  type?: string | null;
  userSubmittedOnly?: boolean;
}): Promise<ApiOpportunity[]> {
  const db = getDb();
  const savedIds = await getSavedIds();
  const conditions = [];

  if (params?.type) {
    conditions.push(eq(opportunitiesTable.type, params.type as OpportunityRow["type"]));
  }

  if (params?.userSubmittedOnly) {
    conditions.push(eq(opportunitiesTable.sourceType, "user_submitted"));
  }

  const rows = await db
    .select()
    .from(opportunitiesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(opportunitiesTable.score));

  return rows.map((row) => toApiOpportunity(row, savedIds));
}

export async function getOpportunity(
  id: string,
): Promise<ApiOpportunity | null> {
  const db = getDb();
  const savedIds = await getSavedIds();
  const [row] = await db
    .select()
    .from(opportunitiesTable)
    .where(eq(opportunitiesTable.id, id))
    .limit(1);

  return row ? toApiOpportunity(row, savedIds) : null;
}

export async function submitOpportunity(input: {
  url: string;
  type: OpportunityType;
  notes?: string;
}): Promise<ApiOpportunity> {
  const db = getDb();
  let hostname = "Submitted opportunity";
  try {
    hostname = new URL(input.url).hostname.replace(/^www\./, "");
  } catch {
    // Keep default title when URL parsing fails.
  }

  const id = crypto.randomUUID();
  const [row] = await db
    .insert(opportunitiesTable)
    .values({
      id,
      title: hostname,
      organization: hostname,
      summary: input.notes?.trim() || "User submitted opportunity pending review.",
      sourceUrl: input.url,
      type: input.type,
      score: 50,
      why: "Submitted by you for review.",
      deadline: null,
      compensation: null,
      sourceType: "user_submitted",
      requiredSkills: [],
      eligibility: defaultEligibility,
      notes: input.notes,
    })
    .returning();

  return toApiOpportunity(row, new Set());
}

function defaultProfileRow(): ProfileRow {
  return {
    id: DEFAULT_PROFILE_ID,
    name: "",
    educationLevel: "",
    fieldOfStudy: "",
    skills: [],
    experience: null,
    interests: "",
    location: "",
    remoteOk: true,
    opportunityTypes: [],
    experienceLevel: "student",
  };
}

export async function getProfile(): Promise<ApiProfile> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, DEFAULT_PROFILE_ID))
    .limit(1);

  return toApiProfile(row ?? defaultProfileRow());
}

export async function updateProfile(input: ProfileInput): Promise<ApiProfile> {
  const db = getDb();
  const current = await getProfile();
  const merged = { ...current, ...input };

  const [row] = await db
    .insert(profilesTable)
    .values({
      id: DEFAULT_PROFILE_ID,
      name: merged.name,
      educationLevel: merged.educationLevel,
      fieldOfStudy: merged.fieldOfStudy,
      skills: merged.skills,
      experience: merged.experience || null,
      interests: merged.interests,
      location: merged.location,
      remoteOk: merged.remoteOk,
      opportunityTypes: merged.opportunityTypes,
      experienceLevel: merged.experienceLevel,
    })
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: {
        name: merged.name,
        educationLevel: merged.educationLevel,
        fieldOfStudy: merged.fieldOfStudy,
        skills: merged.skills,
        experience: merged.experience || null,
        interests: merged.interests,
        location: merged.location,
        remoteOk: merged.remoteOk,
        opportunityTypes: merged.opportunityTypes,
        experienceLevel: merged.experienceLevel,
      },
    })
    .returning();

  return toApiProfile(row);
}

export async function listSavedOpportunities(): Promise<ApiOpportunity[]> {
  const db = getDb();
  const savedIds = await getSavedIds();
  if (savedIds.size === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(opportunitiesTable)
    .innerJoin(
      savedOpportunitiesTable,
      eq(opportunitiesTable.id, savedOpportunitiesTable.opportunityId),
    )
    .orderBy(desc(opportunitiesTable.score));

  return rows.map(({ opportunities: row }) =>
    toApiOpportunity(row, savedIds),
  );
}

export async function saveOpportunity(id: string): Promise<boolean> {
  const db = getDb();
  const opportunity = await getOpportunity(id);
  if (!opportunity) {
    return false;
  }

  await db
    .insert(savedOpportunitiesTable)
    .values({ opportunityId: id })
    .onConflictDoNothing();

  return true;
}

export async function unsaveOpportunity(id: string): Promise<void> {
  const db = getDb();
  await db
    .delete(savedOpportunitiesTable)
    .where(eq(savedOpportunitiesTable.opportunityId, id));
}
