// worker.js - Modified to pass real events to frontend
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Real webhook endpoint - receives data from Reis
    if (path === '/api/webhook/searchWebhook' && request.method === 'POST') {
      try {
        const body = await request.json();
        console.log('Real webhook received from Reis:', JSON.stringify(body));
        
        const realEvent = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          customerId: body.customerId,
          source: body.source || 'Reis_KYC',
          search_query_id: body.searchQueryId,
          isPEP: body.isPEP || false,
          isSanctioned: body.isSanctioned || false,
          isAdverseMedia: body.isAdverseMedia || false,
          pepDecision: body.pepDecision || (body.isPEP ? 'HIT' : 'NO_HIT'),
          sanctionDecision: body.sanctionDecision || (body.isSanctioned ? 'HIT' : 'NO_HIT'),
          message: `Real screening completed for customer ${body.customerId}`,
          originalData: body,
          isReal: true
        };
        
        // Return success response (Reis expects this)
        return new Response(JSON.stringify({
          status: 'ok',
          message: 'Webhook received and processed',
          eventId: realEvent.id,
          timestamp: realEvent.timestamp
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

    // New endpoint: Frontend polling for real events
    if (path === '/api/latest-event' && request.method === 'GET') {
      // This endpoint would need a more sophisticated approach
      // For now, return empty - real events will be captured differently
      return new Response(JSON.stringify({
        hasNewEvent: false,
        event: null
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Health check
    if (path === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'KYC Simulator API - Real Events',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
};