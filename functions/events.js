// functions/events.js
let clients = [];

export async function onRequestGet(context) {
  console.log('SSE connection requested');
  
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  };

  // Create a simple readable stream
  let controller;
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      
      // Add this client to the list
      const client = { controller: ctrl, active: true };
      clients.push(client);
      console.log(`Client connected. Total clients: ${clients.length}`);
      
      // Send welcome message
      const welcomeMessage = `data: ${JSON.stringify({
        type: 'connection',
        message: 'Connected to real-time notifications',
        timestamp: new Date().toISOString()
      })}\n\n`;
      
      try {
        ctrl.enqueue(new TextEncoder().encode(welcomeMessage));
      } catch (error) {
        console.error('Failed to send welcome message:', error);
      }
      
      // Keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        if (!client.active) {
          clearInterval(keepAlive);
          return;
        }
        try {
          ctrl.enqueue(new TextEncoder().encode(`: heartbeat\n\n`));
        } catch (error) {
          console.log('Client disconnected during heartbeat');
          client.active = false;
          clearInterval(keepAlive);
          // Remove from clients list
          const index = clients.indexOf(client);
          if (index > -1) clients.splice(index, 1);
        }
      }, 30000);
      
      // Handle cleanup when client disconnects
      context.request.signal?.addEventListener('abort', () => {
        console.log('Client disconnected');
        client.active = false;
        clearInterval(keepAlive);
        const index = clients.indexOf(client);
        if (index > -1) clients.splice(index, 1);
        console.log(`Client disconnected. Remaining clients: ${clients.length}`);
      });
    }
  });

  return new Response(stream, { headers });
}

// Broadcast function for sending messages to all connected clients
export function broadcast(payload) {
  console.log(`Broadcasting to ${clients.length} clients:`, JSON.stringify(payload));
  
  if (clients.length === 0) {
    console.log('No clients to broadcast to');
    return;
  }

  const message = `data: ${JSON.stringify({
    ...payload,
    broadcastTimestamp: new Date().toISOString()
  })}\n\n`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Send to all active clients
  clients = clients.filter(client => {
    if (!client.active) return false;
    
    try {
      client.controller.enqueue(data);
      return true;
    } catch (error) {
      console.error('Failed to send to client:', error);
      client.active = false;
      return false;
    }
  });
  
  console.log(`Broadcast completed. Active clients: ${clients.length}`);
}