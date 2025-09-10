// worker.js - Deploy this to Cloudflare Workers
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

    // Store events in memory (will reset when worker restarts)
    // In production, you'd use Cloudflare KV or Durable Objects
    if (!globalThis.storedEvents) {
      globalThis.storedEvents = [];
      globalThis.eventId = 0;
    }

    // Webhook endpoint - supporting both paths
    if ((path === '/webhook/alert' || path === '/api/webhook/searchWebhook') && request.method === 'POST') {
      try {
        const body = await request.json();
        console.log('Webhook received:', body);
        
        // Increment event ID and store event
        globalThis.eventId++;
        const eventData = {
          id: globalThis.eventId,
          timestamp: new Date().toISOString(),
          ...body
        };
        
        globalThis.storedEvents.push(eventData);
        
        // Keep only last 100 events
        if (globalThis.storedEvents.length > 100) {
          globalThis.storedEvents = globalThis.storedEvents.slice(-100);
        }
        
        console.log(`Stored event ${globalThis.eventId}, total stored: ${globalThis.storedEvents.length}`);
        
        return new Response(
          JSON.stringify({ 
            status: 'ok', 
            message: 'Webhook received successfully',
            eventId: globalThis.eventId,
            timestamp: new Date().toISOString()
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
      
      // Initialize if not exists
      if (!globalThis.storedEvents) {
        globalThis.storedEvents = [];
        globalThis.eventId = 0;
      }
      
      // Filter events newer than lastId
      const newEvents = globalThis.storedEvents.filter(event => event.id > lastId);
      
      console.log(`API request - lastId: ${lastId}, returning ${newEvents.length} events`);
      
      return new Response(
        JSON.stringify({
          events: newEvents,
          lastEventId: globalThis.eventId,
          timestamp: new Date().toISOString(),
          totalStored: globalThis.storedEvents.length
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
          eventId: globalThis.eventId || 0,
          storedEvents: globalThis.storedEvents?.length || 0
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    // Test endpoint to simulate webhook
    if (path === '/api/test-webhook' && request.method === 'POST') {
      const testData = {
        customerId: `TEST_${Date.now()}`,
        source: 'Reis_KYC',
        isPEP: false,
        isSanctioned: false,
        isAdverseMedia: false,
        pepDecision: 'NO_MATCH',
        sanctionDecision: 'NO_MATCH',
        search_query_id: `test_${Date.now()}`,
        message: 'Test webhook from API'
      };

      // Process like a real webhook
      globalThis.eventId++;
      const eventData = {
        id: globalThis.eventId,
        timestamp: new Date().toISOString(),
        ...testData
      };
      
      if (!globalThis.storedEvents) globalThis.storedEvents = [];
      globalThis.storedEvents.push(eventData);
      
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          message: 'Test webhook created',
          eventData: eventData
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
          'POST /webhook/alert',
          'GET /api/events?lastId=0',
          'GET /api/health',
          'POST /api/test-webhook'
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