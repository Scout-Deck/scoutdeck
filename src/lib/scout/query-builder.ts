import type { OpportunityType, ScoutProfile } from './types';

const typePhrases: Record<OpportunityType, { primary: string; discovery: string }> = {
  fellowship: { primary: 'fellowship applications', discovery: 'fellowship open call apply' },
  builder_program: { primary: 'builder program applications', discovery: 'startup builder cohort apply' },
  ambassador_program: { primary: 'ambassador program applications', discovery: 'campus ambassador programme apply' },
  hackathon: { primary: 'hackathon registration', discovery: 'hackathon open registration apply' },
  scholarship: { primary: 'scholarship applications', discovery: 'scholarship open call apply' },
  grant: { primary: 'grant applications', discovery: 'grant open call apply' },
};

const defaultTypes: OpportunityType[] = ['hackathon', 'fellowship', 'builder_program'];

export type SearchIntent = {
  id: string;
  type: OpportunityType;
  lane: 'direct' | 'discovery';
  query: string;
};

function meaningfulTerms(value: string, limit: number): string[] {
  return value
    .split(/[,;\n.!?]/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1)
    .slice(0, limit);
}

function quote(value: string): string {
  return value.includes(' ') ? `"${value}"` : value;
}

export function buildSearchQueries(profile: ScoutProfile): SearchIntent[] {
  const types = profile.opportunityTypes.length > 0
    ? profile.opportunityTypes
    : defaultTypes;
  const skills = profile.skills.filter(Boolean).slice(0, 2);
  const interests = meaningfulTerms(profile.interests, 2);
  const context = [
    ...skills.map(quote),
    ...interests.map(quote),
    profile.fieldOfStudy.trim(),
    profile.location.trim(),
  ].filter(Boolean).slice(0, 5);
  const audience = [profile.educationLevel.trim(), profile.experienceLevel.replace('_', ' ')].filter(Boolean).join(' ');
  const year = new Date().getUTCFullYear();

  return types.flatMap((type) => {
    const phrase = typePhrases[type];
    const shared = [...context, audience, profile.remoteOk ? 'remote' : ''].filter(Boolean).join(' ');
    return [
      { id: `${type}:direct`, type, lane: 'direct' as const, query: `${year} ${phrase.primary} "applications open" ${shared}`.trim() },
      { id: `${type}:discovery`, type, lane: 'discovery' as const, query: `${year} ${phrase.discovery} ${shared} deadline`.trim() },
    ];
  });
}
