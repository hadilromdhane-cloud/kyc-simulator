// /functions/events.js
let clients = [];

export async function onRequestGet(context) {
  const { request } = context;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] New SSE client connecting`);

  // Essential SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'Access-Control-Allow-Methods': 'GET',
    'X-Accel-Buffering': 'no' // Disable nginx buffering for real-time streaming
  };

  // Create a readable stream for SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Add client to our list
  const clientId = Date.now() + Math.random();
  const client = {
    id: clientId,
    writer: writer,
    connected: true
  };
  
  clients.push(client);
  console.log(`[${timestamp}] Client ${clientId} connected. Total clients: ${clients.length}`);

  // Send initial connection message immediately
  const welcomeMessage = {
    type: 'connection',
    message: 'Connected to real-time notifications',
    timestamp: timestamp,
    clientId: clientId
  };

  try {
    await writer.write(encoder.encode(`data: ${JSON.stringify(welcomeMessage)}\n\n`));
    console.log(`[${timestamp}] Welcome message sent to client ${clientId}`);
  } catch (error) {
    console.error(`[${timestamp}] Failed to send welcome message:`, error);
  }

  // Keep-alive mechanism
  const keepAliveInterval = setInterval(async () => {
    if (!client.connected) {
      clearInterval(keepAliveInterval);
      return;
    }

    try {
      // Send keep-alive comment (invisible to client)
      await writer.write(encoder.encode(`: keep-alive ${new Date().toISOString()}\n\n`));
    } catch (error) {
      console.log(`[${new Date().toISOString()}] Client ${clientId} disconnected during keep-alive`);
      client.connected = false;
      clearInterval(keepAliveInterval);
      removeClient(clientId);
    }
  }, 30000); // Every 30 seconds

  // Handle client disconnect
  const handleDisconnect = () => {
    const disconnectTime = new Date().toISOString();
    console.log(`[${disconnectTime}] Client ${clientId} disconnecting`);
    client.connected = false;
    clearInterval(keepAliveInterval);
    removeClient(clientId);
    
    // Close the writer
    try {
      writer.close();
    } catch (error) {
      // Writer might already be closed
      console.log(`[${disconnectTime}] Writer already closed for client ${clientId}`);
    }
  };

  // Listen for disconnect
  request.signal?.addEventListener('abort', handleDisconnect);

  // Return the response with the readable stream
  return new Response(readable, { headers });
}

// Helper function to remove disconnected clients
function removeClient(clientId) {
  const initialLength = clients.length;
  clients = clients.filter(client => client.id !== clientId && client.connected);
  console.log(`[${new Date().toISOString()}] Removed client ${clientId}. Clients: ${initialLength} -> ${clients.length}`);
}

// Enhanced broadcast function
export async function broadcast(payload) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Broadcasting message to ${clients.length} clients:`, JSON.stringify(payload, null, 2));

  if (clients.length === 0) {
    console.log(`[${timestamp}] No clients connected, message not sent`);
    return;
  }

  const message = JSON.stringify({
    ...payload,
    broadcastTimestamp: timestamp
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(`data: ${message}\n\n`);

  // Track results
  let successful = 0;
  let failed = 0;
  const failedClients = [];

  // Send to all connected clients
  for (const client of clients) {
    if (!client.connected) {
      failedClients.push(client.id);
      continue;
    }

    try {
      await client.writer.write(data);
      successful++;
    } catch (error) {
      console.error(`[${timestamp}] Failed to send to client ${client.id}:`, error.message);
      client.connected = false;
      failedClients.push(client.id);
      failed++;
    }
  }

  // Remove failed clients
  if (failedClients.length > 0) {
    clients = clients.filter(client => !failedClients.includes(client.id));
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