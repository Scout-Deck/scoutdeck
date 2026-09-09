import { z } from 'zod';

export const opportunityTypes = [
  'fellowship',
  'builder_program',
  'ambassador_program',
  'hackathon',
  'scholarship',
  'grant',
] as const;

export const OpportunityTypeSchema = z.enum(opportunityTypes);
export type OpportunityType = z.infer<typeof OpportunityTypeSchema>;

const NullableText = z.string().trim().max(4_000).nullable();

export const ScoutProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  educationLevel: z.string(),
  fieldOfStudy: z.string(),
  skills: z.array(z.string()).default([]),
  experience: z.string().default(''),
  interests: z.string(),
  location: z.string(),
  remoteOk: z.boolean(),
  opportunityTypes: z.array(OpportunityTypeSchema).default([]),
  experienceLevel: z.enum(['student', 'recent_grad', 'early_career']),
});
export type ScoutProfile = z.infer<typeof ScoutProfileSchema>;

export const ExtractedOpportunitySchema = z.object({
  title: z.string().trim().min(1).max(240),
  type: OpportunityTypeSchema,
  sourceUrl: z.string().url(),
  organization: NullableText,
  description: NullableText,
  eligibility: z.object({
    educationLevel: NullableText,
    experience: NullableText,
    location: NullableText,
    remoteOk: z.boolean().nullable(),
    otherCriteria: NullableText,
  }),
  requiredSkills: z.array(z.string().trim().min(1).max(120)).max(30),
  location: NullableText,
  isRemote: z.boolean().nullable(),
  deadline: NullableText,
  experienceLevel: z.enum(['student', 'recent_grad', 'early_career']).nullable(),
  stipend: NullableText,
  confidence: z.enum(['high', 'medium', 'low']),
});
export type ExtractedOpportunity = z.infer<typeof ExtractedOpportunitySchema>;

export type ScoutCandidate = ExtractedOpportunity & {
  candidateId: string;
  source: 'live' | 'fallback';
  databaseId?: string;
};

export const RankingResponseSchema = z.object({
  matches: z.array(z.object({
    candidateId: z.string().min(1),
    score: z.number().min(0).max(100),
    matchReason: z.string().trim().min(20).max(1_000),
  })).max(5),
});

export type RankedScoutMatch = z.infer<typeof RankingResponseSchema>['matches'][number] & {
  opportunity: ScoutCandidate;
};

export type ScoutProgress = {
  stage: 'searching' | 'sources_found' | 'extracting' | 'checking_eligibility' | 'ranking' | 'done';
  message: string;
  count?: number;
};
