export async function onRequestGet(context) {
  // Basic SSE implementation for Cloudflare
  // Note: Full SSE requires Durable Objects for persistent connections
  
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
      
      // For demo purposes, close after initial message
      // In production, you'd use Durable Objects for persistent connections
      setTimeout(() => {
        controller.close();
      }, 1000);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}