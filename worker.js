// worker.js - Frontend-driven approach
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Webhook endpoint - now broadcasts immediately
    if (path === '/api/webhook/searchWebhook' && request.method === 'POST') {
      try {
        const body = await request.json();
        console.log('Webhook received:', JSON.stringify(body));
        
        // Create event with timestamp-based ID
        const eventId = Date.now();
        const newEvent = {
          id: eventId,
          timestamp: new Date().toISOString(),
          customerId: body.customerId,
          source: body.source || 'Reis_KYC',
          search_query_id: body.searchQueryId,
          isPEP: body.isPEP || false,
          isSanctioned: body.isSanctioned || false,
          isAdverseMedia: body.isAdverseMedia || false,
          pepDecision: body.pepDecision || (body.isPEP ? 'HIT' : 'NO_HIT'),
          sanctionDecision: body.sanctionDecision || (body.isSanctioned ? 'HIT' : 'NO_HIT'),
          message: `Screening completed for customer ${body.customerId}`,
          originalData: body
        };
        
        // Store in Cloudflare Cache API (accessible across instances)
        const cacheKey = new Request(`https://your-domain.com/webhook-event-${eventId}`);
        await caches.default.put(cacheKey, new Response(JSON.stringify(newEvent), {
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=300' // 5 minutes
          }
        }));
        
        console.log(`Stored event ${eventId} in cache`);
        
        return new Response(JSON.stringify({
          status: 'ok',
          message: 'Webhook received and cached',
          eventId: eventId,
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
      } catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ 
          error: 'Processing error', 
          details: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Events endpoint - now checks cache for new events
    if (path === '/api/events' && request.method === 'GET') {
      try {
        const lastTimestamp = parseInt(url.searchParams.get('since')) || 0;
        const events = [];
        
        // Check cache for recent events (last 5 minutes)
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        // Check for events in cache
        for (let timestamp = Math.max(lastTimestamp + 1, fiveMinutesAgo); timestamp <= now; timestamp += 1000) {
          const cacheKey = new Request(`https://your-domain.com/webhook-event-${timestamp}`);
          const cached = await caches.default.match(cacheKey);
          if (cached) {
            const eventData = await cached.json();
            events.push(eventData);
          }
        }
        
        return new Response(JSON.stringify({
          events: events,
          timestamp: now,
          totalFound: events.length
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
      } catch (error) {
        console.error('Events API error:', error);
        return new Response(JSON.stringify({ 
          error: 'Processing error', 
          details: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Health check
    if (path === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'KYC Simulator API - Cache-based Version',
        timestamp: new Date().toISOString(),
        storage: 'cloudflare-cache',
        mode: 'production'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Not found', 
      path: path 
    }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
};