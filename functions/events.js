// /functions/events.js
let clients = [];

export async function onRequestGet(context) {
  const { request } = context;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] New SSE client connecting`);

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  };

  const stream = new ReadableStream({
    start(controller) {
      console.log(`[${timestamp}] SSE stream started for client`);
      clients.push(controller);

      // Send initial connection message
      const welcomeMessage = {
        type: 'connection',
        message: 'Connected to real-time notifications',
        timestamp: timestamp,
        clientId: clients.length
      };
      
      controller.enqueue(`data: ${JSON.stringify(welcomeMessage)}\n\n`);
      console.log(`[${timestamp}] Welcome message sent to client ${clients.length}`);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        const disconnectTime = new Date().toISOString();
        console.log(`[${disconnectTime}] Client disconnected`);
        clients = clients.filter(c => c !== controller);
        console.log(`[${disconnectTime}] Remaining clients: ${clients.length}`);
      });

      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(`: keep-alive ${new Date().toISOString()}\n\n`);
        } catch (error) {
          console.log(`[${new Date().toISOString()}] Client connection closed, clearing keep-alive`);
          clearInterval(keepAlive);
        }
      }, 30000);

      // Clear interval when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
      });
    }
  });

  return new Response(stream, { headers });
}

// Enhanced broadcast function with better error handling
export function broadcast(payload) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Broadcasting message to ${clients.length} clients:`, JSON.stringify(payload));

  if (clients.length === 0) {
    console.log(`[${timestamp}] No clients connected, message not sent`);
    return;
  }

  const message = JSON.stringify({
    ...payload,
    broadcastTimestamp: timestamp
  });

  // Track successful and failed broadcasts
  let successful = 0;
  let failed = 0;

  clients.forEach((controller, index) => {
    try {
      controller.enqueue(`data: ${message}\n\n`);
      successful++;
    } catch (error) {
      console.error(`[${timestamp}] Failed to send to client ${index + 1}:`, error.message);
      failed++;
    }
  });

  // Remove failed clients
  if (failed > 0) {
    clients = clients.filter((controller, index) => {
      try {
        // Test if controller is still active by trying to enqueue a comment
        controller.enqueue(`: test\n\n`);
        return true;
      } catch (error) {
        console.log(`[${timestamp}] Removing inactive client ${index + 1}`);
        return false;
      }
    });
  }

  console.log(`[${timestamp}] Broadcast complete - Success: ${successful}, Failed: ${failed}, Active clients: ${clients.length}`);
}

// Health check function for monitoring
export function getConnectionStats() {
  return {
    activeClients: clients.length,
    timestamp: new Date().toISOString()
  };
}