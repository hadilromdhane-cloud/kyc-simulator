// worker.js - Improved version for frontend integration
let lastWebhook = null;
let eventCounter = 0;

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
        console.log('Webhook received:', JSON.stringify(body));
        
        // Store the latest webhook temporarily
        eventCounter++;
        lastWebhook = {
          id: eventCounter,
          timestamp: new Date().toISOString(),
          customerId: body.customerId,
          source: body.source || 'Reis_KYC',
          search_query_id: body.searchQueryId,
          isPEP: body.isPEP,
          isSanctioned: body.isSanctioned,
          isAdverseMedia: body.isAdverseMedia,
          pepDecision: body.pepDecision || (body.isPEP ? 'HIT' : 'NO_HIT'),
          sanctionDecision: body.sanctionDecision || (body.isSanctioned ? 'HIT' : 'NO_HIT'),
          message: `Screening completed for customer ${body.customerId}`,
          // Store original data
          originalData: body
        };
        
        console.log('Stored webhook for frontend:', JSON.stringify(lastWebhook));
        
        return new Response(
          JSON.stringify({ 
            status: 'ok', 
            message: 'Webhook received successfully',
            timestamp: new Date().toISOString(),
            customerId: body.customerId,
            eventId: eventCounter,
            debug: {
              receivedData: body,
              storedForFrontend: true
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

    // Events endpoint - return the last webhook received
    if (path === '/api/events' && request.method === 'GET') {
      const lastId = parseInt(url.searchParams.get('lastId')) || 0;
      
      let events = [];
      
      // If we have a webhook and it's newer than requested lastId
      if (lastWebhook && lastWebhook.id > lastId) {
        events = [lastWebhook];
      }
      
      console.log(`Events API called - lastId: ${lastId}, returning ${events.length} events`);
      
      return new Response(
        JSON.stringify({
          events: events,
          lastEventId: eventCounter,
          timestamp: new Date().toISOString(),
          totalStored: lastWebhook ? 1 : 0,
          debug: {
            lastId: lastId,
            currentEventId: eventCounter,
            hasWebhook: !!lastWebhook,
            lastWebhookId: lastWebhook?.id || null
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
          environment: 'cloudflare-workers-free',
          lastWebhookReceived: lastWebhook?.timestamp || 'none',
          eventCounter: eventCounter,
          connectivity: 'ok'
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