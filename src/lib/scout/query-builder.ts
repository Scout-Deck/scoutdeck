import type { OpportunityType, ScoutProfile } from './types';

export const MAX_SCOUT_QUERIES = 3;

const typePhrases: Record<OpportunityType, string> = {
  fellowship: 'fellowship programme application',
  builder_program: 'builder programme application',
  ambassador_program: 'ambassador programme application',
  hackathon: 'hackathon registration application',
  scholarship: 'scholarship application',
  grant: 'grant application',
};

export const defaultTypes: OpportunityType[] = ['hackathon', 'fellowship', 'builder_program'];

function meaningfulTerms(value: string, limit: number): string[] {
  return value
    .split(/[,;\n]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function buildSearchQueries(profile: ScoutProfile): string[] {
  const types = profile.opportunityTypes.length > 0
    ? profile.opportunityTypes
    : defaultTypes;
  const skills = profile.skills.filter(Boolean).slice(0, 3);
  const experience = meaningfulTerms(profile.experience, 2);
  const interests = meaningfulTerms(profile.interests, 2);
  const context = [
    ...skills,
    ...experience,
    ...interests,
    profile.educationLevel.trim(),
    profile.fieldOfStudy.trim(),
    profile.location.trim(),
  ].filter(Boolean).slice(0, 6);

  return types.map((type) => [
    typePhrases[type],
    ...context,
    profile.remoteOk ? 'remote friendly' : '',
    '2026',
  ].filter(Boolean).join(' ')).slice(0, MAX_SCOUT_QUERIES);
}
