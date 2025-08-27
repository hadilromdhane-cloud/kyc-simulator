let clients = [];

export async function onRequestGet(context) {
  const { request } = context;

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  };

  const stream = new ReadableStream({
    start(controller) {
      clients.push(controller);

      // Remove client when disconnected
      request.signal.addEventListener('abort', () => {
        clients = clients.filter(c => c !== controller);
      });
    }
  });

  return new Response(stream, { headers });
}

// Broadcast function
export function broadcast(payload) {
  clients.forEach(controller => {
    controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
  });
}
