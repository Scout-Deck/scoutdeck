import { runGuestScoutPipeline } from '@/lib/scout/pipeline';
import { ScoutProfileSchema } from '@/lib/scout/types';

export const runtime = 'nodejs';
export const maxDuration = 55;

const encoder = new TextEncoder();

function eventMessage(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 16_000) {
    return Response.json({ message: 'Guest profile is too large.' }, { status: 413 });
  }
  const parsed = ScoutProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.name.trim() || !parsed.data.fieldOfStudy.trim() || !parsed.data.interests.trim() || !parsed.data.skills.length || !parsed.data.opportunityTypes.length) {
    return Response.json({ message: 'Please complete the guest profile before scouting.' }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (!closed) controller.enqueue(eventMessage(event, data));
      };
      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };
      const deadline = setTimeout(() => {
        send('error', { message: 'This guest scout run took too long. Please try again.' });
        close();
      }, 48_000);
      void runGuestScoutPipeline({
        profile: parsed.data,
        onProgress(progress) {
          send('progress', progress);
        },
      })
        .then((result) => send('result', result))
        .catch((error: unknown) => {
          console.error('Guest scout pipeline failed:', error);
          send('error', { message: 'ScoutDeck could not finish this guest search. Please try again.' });
        })
        .finally(() => {
          clearTimeout(deadline);
          close();
        });
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
