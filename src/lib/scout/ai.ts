import { z } from "zod";
import {
  ExtractedOpportunitySchema,
  RankingResponseSchema,
  type ExtractedOpportunity,
  type ScoutCandidate,
  type ScoutProfile,
} from "./types";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const AI_TIMEOUT_MS = 12_000;

class ProviderError extends Error {}

function parseJson(content: string): unknown {
  const trimmed = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(trimmed);
}

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, AI_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   GEMINI
   ========================================================= */

async function requestGemini(
  system: string,
  prompt: string,
  model = "gemini-3.5-flash-lite",
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new ProviderError("Gemini is not configured.");
  }

  const response = await timedFetch(
    `${GEMINI_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }],
        },

        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],

        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");

    console.log("[gemini] failed:", response.status, errorBody);

    throw new ProviderError(`Gemini request failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const content = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");

  if (!content) {
    throw new ProviderError("Gemini returned an empty response.");
  }

  return parseJson(content);
}

/* =========================================================
   OPENROUTER
   ========================================================= */

async function requestOpenRouter(
  system: string,
  prompt: string,
): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new ProviderError("OpenRouter is not configured.");
  }

  const response = await timedFetch(OPENROUTER_URL, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: "nvidia/nemotron-3-ultra-550b-a55b:free",

      temperature: 0.1,

      messages: [
        {
          role: "system",
          content: `${system}

Respond with ONLY valid JSON.
No markdown.
No code fences.
No explanation.
The first character must be "{".`,
        },

        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");

    console.log("[openrouter] failed:", response.status, errorBody);

    throw new ProviderError(`OpenRouter request failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new ProviderError("OpenRouter returned an empty response.");
  }

  return parseJson(content);
}

/* =========================================================
   STRUCTURED GENERATION
   ========================================================= */

async function generateStructured<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
  model: "extraction" | "ranking",
): Promise<T> {
  try {
    console.log(`[ai] gemini:${model}:start`);

    const result = await requestGemini(
      system,
      prompt,
      model === "extraction" ? "gemini-3.5-flash-lite" : "gemini-3.5-flash",
    );

    // Gemini responded successfully.
    // If the data is invalid, don't waste another API call.
    const parsed = schema.parse(result);

    console.log(`[ai] gemini:${model}:success`);

    return parsed;
  } catch (error) {
    // IMPORTANT:
    // Only fall back when Gemini itself failed.
    //
    // ZodError means Gemini responded but produced
    // something that doesn't match our schema.

    if (error instanceof z.ZodError) {
      console.log(`[ai] gemini:${model}:invalid-schema`, error.issues);

      throw error;
    }

    console.log(
      `[ai] gemini:${model}:request-failed, trying openrouter`,
      error,
    );
  }

  try {
    console.log(`[ai] openrouter:${model}:start`);

    const result = await requestOpenRouter(system, prompt);

    const parsed = schema.parse(result);

    console.log(`[ai] openrouter:${model}:success`);

    return parsed;
  } catch (error) {
    console.log(`[ai] openrouter:${model}:failed`, error);

    throw new ProviderError("All AI providers failed.");
  }
}

/* =========================================================
   EXTRACTION
   ========================================================= */

const extractionSystem = `
You extract opportunity listings from source text.

Return ONLY valid JSON.

Do not invent facts.

Every nullable field must be null when the source
does not explicitly state it.

The eligibility object must always be present.

Confidence reflects how clearly the page describes
a currently actionable opportunity.

If the page is not actually an opportunity,
still extract what is available but use confidence
"low".
`;

export async function extractOpportunity(input: {
  url: string;
  markdown: string;
}): Promise<ExtractedOpportunity> {
  const prompt = `
Extract one opportunity from this source.

Return exactly this JSON shape:

${JSON.stringify({
  title: "string",
  type: "fellowship|builder_program|ambassador_program|hackathon|scholarship|grant",
  sourceUrl: input.url,

  organization: "string|null",
  description: "string|null",

  eligibility: {
    educationLevel: "string|null",
    experience: "string|null",
    location: "string|null",
    remoteOk: "boolean|null",
    otherCriteria: "string|null",
  },

  requiredSkills: ["string"],

  location: "string|null",
  isRemote: "boolean|null",
  deadline: "string|null",

  experienceLevel: "student|recent_grad|early_career|null",

  stipend: "string|null",

  confidence: "high|medium|low",
})}

Source URL:
${input.url}

Source text:
${input.markdown.slice(0, 3_500)}
`;

  const extracted = await generateStructured(
    ExtractedOpportunitySchema,
    extractionSystem,
    prompt,
    "extraction",
  );

  return {
    ...extracted,
    sourceUrl: input.url,
  };
}

/* =========================================================
   RANKING
   ========================================================= */

const rankingSystem = `
You are ScoutDeck's opportunity-ranking engine.

Return ONLY valid JSON.

Rank candidates comparatively.

Return no more than five genuine fits.

Do not invent eligibility requirements.

Each matchReason must cite:
- two or three concrete profile facts
- specific opportunity details

Generic wording is forbidden.
`;

export async function rankCandidates(
  profile: ScoutProfile,
  candidates: ScoutCandidate[],
) {
  const prompt = `
Profile:

${JSON.stringify(profile)}

Candidates:

${JSON.stringify(
  candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    title: candidate.title,
    type: candidate.type,
    organization: candidate.organization,

    description: candidate.description?.slice(0, 1_000) ?? null,

    requiredSkills: candidate.requiredSkills,

    location: candidate.location,

    isRemote: candidate.isRemote,

    eligibility: candidate.eligibility,

    deadline: candidate.deadline,
  })),
)}

Return exactly:

{
  "matches": [
    {
      "candidateId": "string",
      "score": 0,
      "matchReason": "specific explanation"
    }
  ]
}
`;

  return generateStructured(
    RankingResponseSchema,
    rankingSystem,
    prompt,
    "ranking",
  );
}
