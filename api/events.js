// api/events.js - Polling-based solution for Vercel
let eventQueue = [];
let lastEventId = 0;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle POST requests to add events (from webhooks)
  if (req.method === 'POST') {
    try {
      const payload = req.body;
      console.log('Received event via POST:', JSON.stringify(payload));
      
      lastEventId++;
      const event = {
        id: lastEventId,
        timestamp: new Date().toISOString(),
        ...payload
      };
      
      eventQueue.push(event);
      console.log(`Event added to queue (ID: ${lastEventId}):`, JSON.stringify(event));
      
      // Clean old events (keep only last 50)
      if (eventQueue.length > 50) {
        eventQueue = eventQueue.slice(-50);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Event added successfully',
        eventId: lastEventId,
        queueSize: eventQueue.length
      });
      
    } catch (error) {
      console.error('Error adding event:', error);
      return res.status(500).json({
        error: 'Failed to add event',
        details: error.message
      });
    }
  }

  // Handle GET requests for polling
  if (req.method === 'GET') {
    const { lastId } = req.query;
    const clientLastId = parseInt(lastId) || 0;

    console.log(`Polling request - Client last ID: ${clientLastId}, Server last ID: ${lastEventId}, Queue size: ${eventQueue.length}`);

    // Get events newer than client's last received ID
    const newEvents = eventQueue.filter(event => event.id > clientLastId);

    return res.status(200).json({
      events: newEvents,
      lastEventId: lastEventId,
      timestamp: new Date().toISOString(),
      totalEvents: eventQueue.length
    });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

// Keep these for backward compatibility (though they won't work in serverless)
export function addEvent(eventData) {
  lastEventId++;
  const event = {
    id: lastEventId,
    timestamp: new Date().toISOString(),
    ...eventData
  };
  
  eventQueue.push(event);
  console.log(`Event added to queue (ID: ${lastEventId}):`, JSON.stringify(eventData));
  
  return event;
}

export function broadcast(payload) {
  console.log(`Broadcasting event:`, JSON.stringify(payload));
  return addEvent({
    ...payload,
    broadcastTimestamp: new Date().toISOString()
  });
}