let clients = [];

export async function onRequestGet(context) {
  const { request } = context;

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  };

  const stream = new WritableStream({
    start(controller) {
      // Keep connection open
      clients.push(controller);
      controller.enqueue(`data: Connected\n\n`);
    },
    close() {
      // Remove client when disconnected
      clients = clients.filter(c => c !== controller);
    }
  });

  return new Response(stream, { headers });
}

// Helper to broadcast events to all connected clients
export function broadcast(eventData) {
  const data = `data: ${JSON.stringify(eventData)}\n\n`;
  clients.forEach(client => client.enqueue(data));
}
