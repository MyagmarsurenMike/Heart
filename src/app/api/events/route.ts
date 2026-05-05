import { subscribeToStorage } from "@/server/index/watcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      const send = (line: string) => {
        try {
          controller.enqueue(enc.encode(line));
        } catch {
          // controller closed
        }
      };
      send(`retry: 2000\n\n`);
      send(`: connected ${Date.now()}\n\n`);

      const unsubscribe = subscribeToStorage((event) => {
        send(`event: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => send(`: ping\n\n`), 30_000);

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
