import { createClient } from '@/lib/supabase/server';
import {
  OpportunityTypeSchema,
  ScoutProfileSchema,
  type RankedScoutMatch,
  type ScoutCandidate,
  type ScoutProfile,
} from './types';

function createCandidateId(sourceUrl: string): string {
  return `fallback:${sourceUrl}`;
}

export async function getScoutProfile(userId: string): Promise<ScoutProfile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, education_level, field_of_study, skills, interests, location, remote_ok, opportunity_types, experience_level')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error('Unable to load your profile.');
  if (!data) throw new Error('Complete your profile before scouting opportunities.');

  return ScoutProfileSchema.parse({
    id: data.id,
    name: data.name,
    educationLevel: data.education_level,
    fieldOfStudy: data.field_of_study,
    skills: data.skills ?? [],
    interests: data.interests,
    location: data.location,
    remoteOk: data.remote_ok,
    opportunityTypes: data.opportunity_types ?? [],
    experienceLevel: data.experience_level,
  });
}

export async function getPreFetchedFallback(profile: ScoutProfile): Promise<ScoutCandidate[]> {
  if (profile.opportunityTypes.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select('id, title, organization, summary, source_url, type, deadline, compensation, required_skills, education_level, experience, location, remote_ok, other_criteria')
    .eq('is_prefetched', true)
    .in('type', profile.opportunityTypes)
    .limit(80);

  // A missing fallback column/table should not suppress otherwise good live results.
  if (error || !data) return [];

  return data.flatMap((row) => {
    const type = OpportunityTypeSchema.safeParse(row.type);
    if (!type.success) return [];
    return [{
      candidateId: createCandidateId(row.source_url),
      databaseId: row.id,
      source: 'fallback' as const,
      title: row.title,
      type: type.data,
      sourceUrl: row.source_url,
      organization: row.organization || null,
      description: row.summary || null,
      eligibility: {
        educationLevel: row.education_level || null,
        experience: row.experience || null,
        location: row.location || null,
        remoteOk: row.remote_ok,
        otherCriteria: row.other_criteria || null,
      },
      requiredSkills: row.required_skills ?? [],
      location: row.location || null,
      isRemote: row.remote_ok,
      deadline: row.deadline,
      experienceLevel: null,
      stipend: row.compensation,
      confidence: 'high' as const,
    }];
  });
}

export async function persistLiveCandidate(candidate: ScoutCandidate, userId: string): Promise<ScoutCandidate> {
  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from('opportunities')
    .select('id')
    .eq('source_url', candidate.sourceUrl)
    .limit(1)
    .maybeSingle();

  if (lookupError) throw new Error('Unable to persist scouted opportunities.');
  if (existing) return { ...candidate, databaseId: existing.id };

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      title: candidate.title,
      organization: candidate.organization || 'Unknown organisation',
      summary: candidate.description || 'No description was available from the source.',
      source_url: candidate.sourceUrl,
      type: candidate.type,
      score: 0,
      why: '',
      deadline: candidate.deadline,
      compensation: candidate.stipend,
      source_type: 'scraped',
      is_prefetched: false,
      required_skills: candidate.requiredSkills,
      education_level: candidate.eligibility.educationLevel || '',
      experience: candidate.eligibility.experience || '',
      location: candidate.location || candidate.eligibility.location || '',
      remote_ok: candidate.isRemote ?? candidate.eligibility.remoteOk ?? false,
      other_criteria: candidate.eligibility.otherCriteria || '',
      submitted_by: userId,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error('Unable to persist scouted opportunities.');
  return { ...candidate, databaseId: data.id };
}

export async function persistMatches(profileId: string, matches: RankedScoutMatch[]): Promise<void> {
  const rows = matches.flatMap((match) => match.opportunity.databaseId ? [{
    profile_id: profileId,
    opportunity_id: match.opportunity.databaseId,
    match_score: match.score,
    match_reason: match.matchReason,
  }] : []);
  if (rows.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from('opportunity_matches')
    .upsert(rows, { onConflict: 'profile_id,opportunity_id' });
  if (error) throw new Error('Unable to save your scout results.');
}
