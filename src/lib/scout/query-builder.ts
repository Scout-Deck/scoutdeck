import type { OpportunityType, ScoutProfile } from './types';

const typePhrases: Record<OpportunityType, string> = {
  internship: 'internship programme application',
  fellowship: 'fellowship programme application',
  hackathon: 'hackathon registration application',
  scholarship: 'scholarship application',
  grant: 'grant application',
  job: 'entry level job early career role',
};

export const defaultTypes: OpportunityType[] = ['hackathon', 'fellowship', 'internship'];

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
  const interests = meaningfulTerms(profile.interests, 2);
  const context = [
    ...skills,
    ...interests,
    profile.fieldOfStudy.trim(),
    profile.location.trim(),
  ].filter(Boolean).slice(0, 6);

  return types.map((type) => [
    typePhrases[type],
    ...context,
    profile.remoteOk ? 'remote friendly' : '',
    '2026',
  ].filter(Boolean).join(' '));
}
