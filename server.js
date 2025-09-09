// server.js
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let clients = [];
let eventId = 0;
let storedEvents = []; // Store events for polling

// IMPORTANT: API routes MUST come before the catch-all route
// API endpoint for polling (fallback)
app.get('/api/events', (req, res) => {
  const lastId = parseInt(req.query.lastId) || 0;
  
  console.log(`Polling request - lastId: ${lastId}, current eventId: ${eventId}, stored events: ${storedEvents.length}`);
  
  // Filter events that are newer than lastId
  const newEvents = storedEvents.filter(event => event.id > lastId);
  
  console.log(`Returning ${newEvents.length} new events`);
  
  res.json({
    events: newEvents,
    lastEventId: eventId
  });
});

// Webhook to receive alert updates
app.post('/webhook/alert', (req, res) => {
  console.log('Webhook received:', req.body);
  
  // Increment event ID
  eventId++;
  
  // Create event data matching your frontend format
  const eventData = {
    id: eventId,
    timestamp: new Date().toISOString(),
    ...req.body // Include all webhook data
  };
  
  // Store event for polling clients
  storedEvents.push(eventData);
  
  // Keep only last 100 events to prevent memory issues
  if (storedEvents.length > 100) {
    storedEvents = storedEvents.slice(-100);
  }
  
  console.log(`Stored event ${eventId}, total stored: ${storedEvents.length}`);
  
  // Broadcast to all connected SSE clients
  broadcast(eventData);
  
  res.status(200).json({ status: 'ok', eventId: eventId, totalEvents: storedEvents.length });
});

// SSE endpoint for front-end to listen
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  res.flushHeaders();
  
  // Add client to the list
  clients.push(res);
  console.log(`SSE client connected. Total clients: ${clients.length}`);
  
  // Send initial connection event
  const connectionEvent = {
    id: ++eventId,
    type: 'connection',
    message: 'Connected to event stream',
    timestamp: new Date().toISOString()
  };
  
  res.write(`data: ${JSON.stringify(connectionEvent)}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
    console.log(`SSE client disconnected. Total clients: ${clients.length}`);
  });

  req.on('error', (err) => {
    console.error('SSE connection error:', err);
    clients = clients.filter(c => c !== res);
  });
});

// Function to broadcast data to all connected clients
function broadcast(data) {
  if (clients.length === 0) {
    console.log('No SSE clients connected to broadcast to');
    return;
  }
  
  console.log(`Broadcasting to ${clients.length} clients:`, data);
  
  const eventData = `data: ${JSON.stringify(data)}\n\n`;
  
  clients.forEach((client, index) => {
    try {
      client.write(eventData);
    } catch (error) {
      console.error(`Error broadcasting to client ${index}:`, error);
      // Remove failed client
      clients.splice(index, 1);
    }
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    eventId: eventId,
    storedEvents: storedEvents.length,
    connectedClients: clients.length
  });
});

// IMPORTANT: This catch-all route MUST come LAST
app.get('*', (req, res) => {
  // Don't serve HTML for API routes that weren't matched above
  if (req.path.startsWith('/api/') || req.path.startsWith('/webhook/')) {
    res.status(404).json({ error: 'API endpoint not found', path: req.path });
    return;
  }
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API endpoints available at:`);
  console.log(`- GET /api/events?lastId=0`);
  console.log(`- POST /webhook/alert`);
  console.log(`- GET /events (SSE)`);
  console.log(`- GET /api/health`);
});