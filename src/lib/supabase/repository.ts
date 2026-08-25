import { createClient, requireUserId } from '@/lib/supabase/server';
import { opportunityTypes, type OpportunityType } from '@/lib/scout/types';

export type ApiProfile = {
  name: string;
  educationLevel: string;
  fieldOfStudy: string;
  skills: string[];
  interests: string;
  location: string;
  remoteOk: boolean;
  opportunityTypes: OpportunityType[];
  experienceLevel: 'student' | 'recent_grad' | 'early_career';
};

export type ApiOpportunity = {
  id: string;
  title: string;
  organization: string;
  summary: string;
  sourceUrl: string;
  type: OpportunityType;
  score: number;
  why: string;
  deadline: string | null;
  compensation: string | null;
  sourceType: 'scraped' | 'user_submitted';
  requiredSkills: string[];
  eligibility: { educationLevel: string; experience: string; location: string; remoteOk: boolean; otherCriteria: string };
  isSaved: boolean;
};

type OpportunityRow = {
  id: string; title: string; organization: string; summary: string; source_url: string;
  type: OpportunityType; score: number | string; why: string; deadline: string | null;
  compensation: string | null; source_type: ApiOpportunity['sourceType']; required_skills: string[] | null;
  education_level: string; experience: string; location: string; remote_ok: boolean; other_criteria: string;
};

const validTypes = new Set<string>(opportunityTypes);

function toProfile(row: Record<string, unknown>): ApiProfile {
  return {
    name: String(row.name ?? ''), educationLevel: String(row.education_level ?? ''),
    fieldOfStudy: String(row.field_of_study ?? ''), skills: Array.isArray(row.skills) ? row.skills.filter((skill): skill is string => typeof skill === 'string') : [],
    interests: String(row.interests ?? ''), location: String(row.location ?? ''), remoteOk: Boolean(row.remote_ok),
    opportunityTypes: Array.isArray(row.opportunity_types) ? row.opportunity_types.filter((type): type is OpportunityType => typeof type === 'string' && validTypes.has(type)) : [],
    experienceLevel: row.experience_level === 'recent_grad' || row.experience_level === 'early_career' ? row.experience_level : 'student',
  };
}

function toOpportunity(row: OpportunityRow, savedIds: Set<string>, match?: { match_score: number | string; match_reason: string }): ApiOpportunity {
  return {
    id: row.id, title: row.title, organization: row.organization, summary: row.summary, sourceUrl: row.source_url,
    type: row.type, score: Number(match?.match_score ?? row.score), why: match?.match_reason ?? row.why,
    deadline: row.deadline, compensation: row.compensation, sourceType: row.source_type,
    requiredSkills: row.required_skills ?? [],
    eligibility: { educationLevel: row.education_level, experience: row.experience, location: row.location, remoteOk: row.remote_ok, otherCriteria: row.other_criteria },
    isSaved: savedIds.has(row.id),
  };
}

async function savedIds(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('saved_opportunities').select('opportunity_id').eq('user_id', userId);
  if (error) throw new Error('Unable to load saved opportunities.');
  return new Set((data ?? []).map((row) => row.opportunity_id));
}

export async function getProfile(): Promise<ApiProfile> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' }).select().single();
  if (error || !data) throw new Error('Unable to load your profile.');
  return toProfile(data);
}

export async function updateProfile(input: Partial<ApiProfile>): Promise<ApiProfile> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const update = {
    id: userId, ...(input.name !== undefined && { name: input.name }), ...(input.educationLevel !== undefined && { education_level: input.educationLevel }),
    ...(input.fieldOfStudy !== undefined && { field_of_study: input.fieldOfStudy }), ...(input.skills !== undefined && { skills: input.skills }),
    ...(input.interests !== undefined && { interests: input.interests }), ...(input.location !== undefined && { location: input.location }),
    ...(input.remoteOk !== undefined && { remote_ok: input.remoteOk }), ...(input.opportunityTypes !== undefined && { opportunity_types: input.opportunityTypes }),
    ...(input.experienceLevel !== undefined && { experience_level: input.experienceLevel }),
  };
  const { data, error } = await supabase.from('profiles').upsert(update, { onConflict: 'id' }).select().single();
  if (error || !data) throw new Error('Unable to save your profile.');
  return toProfile(data);
}

export async function listOpportunities(params?: { type?: string | null; userSubmittedOnly?: boolean }): Promise<ApiOpportunity[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const selectedSavedIds = await savedIds(userId);
  let matches = supabase.from('opportunity_matches').select('match_score, match_reason, opportunities!inner(*)').eq('profile_id', userId).order('match_score', { ascending: false });
  if (params?.type) matches = matches.eq('opportunities.type', params.type);
  if (params?.userSubmittedOnly) matches = matches.eq('opportunities.source_type', 'user_submitted');
  const { data, error } = await matches;
  if (error) throw new Error('Unable to load your opportunities.');
  return (data ?? []).flatMap((match) => {
    const opportunity = match.opportunities as unknown as OpportunityRow | null;
    return opportunity ? [toOpportunity(opportunity, selectedSavedIds, match)] : [];
  });
}

export async function getOpportunity(id: string): Promise<ApiOpportunity | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.from('opportunity_matches').select('match_score, match_reason, opportunities!inner(*)').eq('profile_id', userId).eq('opportunity_id', id).maybeSingle();
  if (error) throw new Error('Unable to load the opportunity.');
  const opportunity = data?.opportunities as unknown as OpportunityRow | null;
  return opportunity ? toOpportunity(opportunity, await savedIds(userId), data) : null;
}

export async function submitOpportunity(input: { url: string; notes?: string }): Promise<ApiOpportunity> {
  const userId = await requireUserId();
  const supabase = await createClient();
  let hostname = 'Submitted opportunity';
  try {
    hostname = new URL(input.url).hostname.replace(/^www\./, '') || hostname;
  } catch {
    throw new Error('Please provide a valid opportunity URL.');
  }
  const { data, error } = await supabase.from('opportunities').insert({ title: hostname, organization: hostname, summary: input.notes?.trim() || 'User submitted opportunity pending review.', source_url: input.url, type: 'job', score: 50, why: 'Submitted by you for review.', source_type: 'user_submitted', submitted_by: userId }).select().single();
  if (error || !data) throw new Error('Unable to submit the opportunity.');
  return toOpportunity(data as OpportunityRow, new Set());
}

export async function listSavedOpportunities(): Promise<ApiOpportunity[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.from('saved_opportunities').select('opportunities!inner(*)').eq('user_id', userId).order('saved_at', { ascending: false });
  if (error) throw new Error('Unable to load saved opportunities.');
  return (data ?? []).flatMap((row) => {
    const opportunity = row.opportunities as unknown as OpportunityRow | null;
    return opportunity ? [toOpportunity(opportunity, new Set([opportunity.id]))] : [];
  });
}

export async function saveOpportunity(id: string): Promise<boolean> {
  const userId = await requireUserId();
  if (!await getOpportunity(id)) return false;
  const supabase = await createClient();
  const { error } = await supabase.from('saved_opportunities').upsert({ user_id: userId, opportunity_id: id }, { onConflict: 'user_id,opportunity_id' });
  if (error) throw new Error('Unable to save the opportunity.');
  return true;
}

export async function unsaveOpportunity(id: string): Promise<void> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from('saved_opportunities').delete().eq('user_id', userId).eq('opportunity_id', id);
  if (error) throw new Error('Unable to remove the saved opportunity.');
}
