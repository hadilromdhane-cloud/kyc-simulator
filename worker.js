// worker.js - Fixed version with proper state management
let storedEvents = [];
let eventId = 0;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Webhook endpoint
    if (path === '/api/webhook/searchWebhook' && request.method === 'POST') {
      try {
        const body = await request.json();
        console.log('Webhook received:', body);
        
        // Increment event ID and store event
        eventId++;
        const eventData = {
          id: eventId,
          timestamp: new Date().toISOString(),
          ...body
        };
        
        storedEvents.push(eventData);
        
        // Keep only last 100 events
        if (storedEvents.length > 100) {
          storedEvents = storedEvents.slice(-100);
        }
        
        console.log(`Stored event ${eventId}, total stored: ${storedEvents.length}`);
        console.log('Current stored events:', storedEvents.map(e => ({ id: e.id, customerId: e.customerId })));
        
        return new Response(
          JSON.stringify({ 
            status: 'ok', 
            message: 'Webhook received successfully',
            eventId: eventId,
            timestamp: new Date().toISOString(),
            debug: {
              storedCount: storedEvents.length,
              eventData: eventData
            }
          }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        );
      } catch (error) {
        console.error('Webhook error:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON', details: error.message }), 
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        );
      }
    }

    // API events endpoint (for polling)
    if (path === '/api/events' && request.method === 'GET') {
      const lastId = parseInt(url.searchParams.get('lastId')) || 0;
      
      // Filter events newer than lastId
      const newEvents = storedEvents.filter(event => event.id > lastId);
      
      console.log(`API request - lastId: ${lastId}, currentEventId: ${eventId}, storedEvents: ${storedEvents.length}, returning ${newEvents.length} events`);
      console.log('All stored events:', storedEvents.map(e => ({ id: e.id, customerId: e.customerId })));
      
      return new Response(
        JSON.stringify({
          events: newEvents,
          lastEventId: eventId,
          timestamp: new Date().toISOString(),
          totalStored: storedEvents.length,
          debug: {
            lastId: lastId,
            currentEventId: eventId,
            allEvents: storedEvents.map(e => ({ id: e.id, customerId: e.customerId, timestamp: e.timestamp })),
            filteredEvents: newEvents.map(e => ({ id: e.id, customerId: e.customerId }))
          }
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    // Health check endpoint
    if (path === '/api/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'KYC Simulator API',
          timestamp: new Date().toISOString(),
          environment: 'cloudflare-workers',
          eventId: eventId,
          storedEvents: storedEvents.length,
          debug: {
            allEvents: storedEvents.map(e => ({ id: e.id, customerId: e.customerId }))
          }
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    // For all other requests, return 404
    return new Response(
      JSON.stringify({ 
        error: 'Not found', 
        path: path,
        method: request.method,
        availableEndpoints: [
          'POST /api/webhook/searchWebhook',
          'GET /api/events?lastId=0',
          'GET /api/health'
        ]
      }), 
      { 
        status: 404, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
};