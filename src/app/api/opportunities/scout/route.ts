import { requireUserId, UnauthorizedError } from '@/lib/supabase/server';
import { runScoutPipeline } from '@/lib/scout/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

const encoder = new TextEncoder();

function eventMessage(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ message: 'Not authenticated' }, { status: 401 });
    }
    return Response.json({ message: 'Scout service is unavailable.' }, { status: 500 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void runScoutPipeline({
        userId,
        onProgress(progress) {
          controller.enqueue(eventMessage('progress', progress));
        },
      })
        .then((result) => controller.enqueue(eventMessage('result', result)))
        .catch((error: unknown) => {
          console.error('Scout pipeline failed:', error);
          controller.enqueue(eventMessage('error', {
            message: 'ScoutDeck could not finish this search. Please try again.',
          }));
        })
        .finally(() => controller.close());
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
