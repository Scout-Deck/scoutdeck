import { z } from 'zod';
import {
  ExtractedOpportunitySchema,
  RankingResponseSchema,
  type ExtractedOpportunity,
  type ScoutCandidate,
  type ScoutProfile,
} from './types';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const AI_TIMEOUT_MS = 8_000;

class ProviderError extends Error {}

function parseJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(trimmed);
}

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestGroq(model: string, system: string, prompt: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new ProviderError('Groq is not configured.');

  const response = await timedFetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.log('[groq] failed:', response.status, errorBody);
    throw new ProviderError('Groq request failed.');
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new ProviderError('Groq returned an empty response.');
  return parseJson(content);
}

async function requestGemini(system: string, prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ProviderError('Gemini is not configured.');

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const response = await timedFetch(`${GEMINI_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.log('[gemini] failed:', response.status, errorBody);
    throw new ProviderError('Gemini request failed.');
  }

  const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
  if (!content) throw new ProviderError('Gemini returned an empty response.');

  return parseJson(content);
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function requestOpenRouter(system: string, prompt: string): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new ProviderError('OpenRouter is not configured.');

  const response = await timedFetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      temperature: 0.2,
      messages: [
        // No enforced JSON mode on this model, so we push extra hard in the prompt itself.
        { role: 'system', content: `${system}\n\nRespond with ONLY raw JSON. No markdown code fences, no explanation, no preamble — the first character of your response must be "{".` },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.log('[openrouter] failed:', response.status, errorBody);
    throw new ProviderError('OpenRouter request failed.');
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new ProviderError('OpenRouter returned an empty response.');
  return parseJson(content);
}


async function generateStructured<T>(schema: z.ZodType<T>, system: string, prompt: string, model: string): Promise<T> {
  try {
    return schema.parse(await requestGroq(model, system, prompt));
  } catch (groqError) {
    console.log('[ai] groq failed, trying gemini:', groqError);
    try {
      return schema.parse(await requestGemini(system, prompt));
    } catch (geminiError) {
      console.log('[ai] gemini also failed, trying openrouter:', geminiError);
      try {
        return schema.parse(await requestOpenRouter(system, prompt));
      } catch (openRouterError) {
        console.log('[ai] openrouter also failed:', openRouterError);
        throw groqError instanceof Error ? groqError : new ProviderError('AI request failed.');
      }
    }
  }
}

const extractionSystem = `You extract opportunity listings from source text. Return only JSON. Do not invent facts. Every nullable field must be null when the source does not state it. The eligibility object must always be present. Confidence reflects how clearly this page describes a currently actionable opportunity.`;

export async function extractOpportunity(input: { url: string; markdown: string }): Promise<ExtractedOpportunity> {
  const prompt = `Extract one opportunity from this source. Return exactly this JSON shape:\n${JSON.stringify({
    title: 'string', type: 'fellowship|builder_program|ambassador_program|hackathon|scholarship|grant', sourceUrl: input.url,
    organization: 'string|null', description: 'string|null',
    eligibility: { educationLevel: 'string|null', experience: 'string|null', location: 'string|null', remoteOk: 'boolean|null', otherCriteria: 'string|null' },
    requiredSkills: ['string'], location: 'string|null', isRemote: 'boolean|null', deadline: 'string|null',
    experienceLevel: 'student|recent_grad|early_career|null', stipend: 'string|null', confidence: 'high|medium|low',
  })}\n\nSource URL: ${input.url}\n\nSource text:\n${input.markdown.slice(0, 5_000)}`;

  const extracted = await generateStructured(ExtractedOpportunitySchema, extractionSystem, prompt, 'openai/gpt-oss-20b');
  return { ...extracted, sourceUrl: input.url };
}

const rankingSystem = `You are ScoutDeck's opportunity-ranking engine. Return only JSON. Rank candidates comparatively. Return no more than five genuine fits. Each matchReason must cite two or three concrete profile facts and specific opportunity details; generic wording is forbidden. Only use facts present in the candidate fields. If a candidate is sparse, do not infer a deadline, organisation, eligibility, compensation, location, or required skills.`;

export async function rankCandidates(profile: ScoutProfile, candidates: ScoutCandidate[]) {
  const prompt = `Profile:\n${JSON.stringify(profile)}\n\nCandidates:\n${JSON.stringify(candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    title: candidate.title,
    type: candidate.type,
    organization: candidate.organization,
    description: candidate.description?.slice(0, 1_500) ?? null,
    requiredSkills: candidate.requiredSkills,
    location: candidate.location,
    isRemote: candidate.isRemote,
    eligibility: candidate.eligibility,
    deadline: candidate.deadline,
  })))}\n\nReturn {"matches":[{"candidateId":"...","score":0-100,"matchReason":"specific explanation"}]}.`;
  return generateStructured(RankingResponseSchema, rankingSystem, prompt, 'openai/gpt-oss-120b');
}
