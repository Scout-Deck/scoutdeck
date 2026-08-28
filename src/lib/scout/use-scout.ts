'use client';

import { useCallback, useState } from 'react';
import type { RankedScoutMatch, ScoutProgress } from './types';

type ScoutState = {
  pending: boolean;
  progress: ScoutProgress | null;
  error: string | null;
  matches: RankedScoutMatch[];
};

type UseScoutOptions = {
  endpoint?: string;
  onComplete?: (matches: RankedScoutMatch[]) => void | Promise<void>;
};

export function useScout({ endpoint = '/api/opportunities/scout', onComplete }: UseScoutOptions = {}) {
  const [state, setState] = useState<ScoutState>({ pending: false, progress: null, error: null, matches: [] });

  const scout = useCallback(async (body?: unknown) => {
    setState({ pending: true, progress: { stage: 'searching', message: 'Starting your scout…' }, error: null, matches: [] });
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok || !response.body) throw new Error('ScoutDeck could not start this search.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          const name = event.match(/^event: (.+)$/m)?.[1];
          const rawData = event.match(/^data: (.+)$/m)?.[1];
          if (!name || !rawData) continue;
          const data: unknown = JSON.parse(rawData);
          if (name === 'progress') setState((current) => ({ ...current, progress: data as ScoutProgress }));
          if (name === 'result') {
            const matches = (data as { matches?: RankedScoutMatch[] }).matches ?? [];
            setState((current) => ({ ...current, matches, pending: false }));
            await onComplete?.(matches);
          }
          if (name === 'error') throw new Error((data as { message?: string }).message ?? 'ScoutDeck could not finish this search.');
        }
      }
      setState((current) => ({ ...current, pending: false, progress: { stage: 'done', message: 'Your shortlist is ready.' }, error: null }));
    } catch (error) {
      setState((current) => ({ ...current, pending: false, error: error instanceof Error ? error.message : 'ScoutDeck could not finish this search.' }));
    }
  }, [endpoint, onComplete]);

  return { ...state, scout };
}
