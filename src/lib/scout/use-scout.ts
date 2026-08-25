'use client';

import { useCallback, useState } from 'react';
import type { RankedScoutMatch, ScoutProgress } from './types';

type ScoutState = {
  pending: boolean;
  progress: ScoutProgress | null;
  error: string | null;
  matches: RankedScoutMatch[];
};

export function useScout(onComplete: () => void) {
  const [state, setState] = useState<ScoutState>({ pending: false, progress: null, error: null, matches: [] });

  const scout = useCallback(async () => {
    setState({ pending: true, progress: { stage: 'searching', message: 'Starting your scout…' }, error: null, matches: [] });
    try {
      const response = await fetch('/api/opportunities/scout', { method: 'POST' });
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
          if (name === 'result') setState((current) => ({ ...current, matches: (data as { matches?: RankedScoutMatch[] }).matches ?? [] }));
          if (name === 'error') throw new Error((data as { message?: string }).message ?? 'ScoutDeck could not finish this search.');
        }
      }
      await onComplete();
      setState((current) => ({ ...current, pending: false, progress: { stage: 'done', message: 'Your shortlist is ready.' }, error: null }));
    } catch (error) {
      setState((current) => ({ ...current, pending: false, error: error instanceof Error ? error.message : 'ScoutDeck could not finish this search.' }));
    }
  }, [onComplete]);

  return { ...state, scout };
}
