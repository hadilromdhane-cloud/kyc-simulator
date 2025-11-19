
const SUPABASE_URL = 'https://nkfduoyzmmjolxtaansw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmR1b3l6bW1qb2x4dGFhbnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MjI4NDAsImV4cCI6MjA3OTA5ODg0MH0.k2RoRjHGxHOd-tJwuam9OL1KwzLiCiZuwGmjZ_ia0kU'
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Webhook endpoint
    if (path === '/api/webhook/searchWebhook' && request.method === 'POST') {
      try {
        const body = await request.json();
        console.log('Webhook received:', JSON.stringify(body));
        
        const eventData = {
          customer_id: body.customerId,
          search_query_id: body.searchQueryId,
          source: body.source || 'Reis_KYC',
          is_pep: body.isPEP || false,
          is_sanctioned: body.isSanctioned || false,
          is_adverse_media: body.isAdverseMedia || false,
          pep_decision: body.pepDecision || (body.isPEP ? 'HIT' : 'NO_HIT'),
          sanction_decision: body.sanctionDecision || (body.isSanctioned ? 'HIT' : 'NO_HIT'),
          message: `Screening completed for customer ${body.customerId}`,
          original_data: body
        };
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/webhook_events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(eventData)
        });
        
        if (!response.ok) {
          throw new Error(`Database insert failed: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Event stored in database');
        
        return new Response(JSON.stringify({
          status: 'ok',
          message: 'Webhook received and stored',
          eventId: result[0]?.id
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

    // Events endpoint
    if (path === '/api/events' && request.method === 'GET') {
      try {
        const lastId = parseInt(url.searchParams.get('since')) || 0;
        
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/webhook_events?id=gt.${lastId}&order=id.asc`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`Database query failed: ${response.status}`);
        }
        
        const events = await response.json();
        
        const transformedEvents = events.map(event => ({
          id: event.id,
          timestamp: event.created_at,
          customerId: event.customer_id,
          source: event.source,
          search_query_id: event.search_query_id,
          isPEP: event.is_pep,
          isSanctioned: event.is_sanctioned,
          isAdverseMedia: event.is_adverse_media,
          pepDecision: event.pep_decision,
          sanctionDecision: event.sanction_decision,
          message: event.message,
          originalData: event.original_data || {}
        }));
        
        return new Response(JSON.stringify({
          events: transformedEvents,
          totalFound: transformedEvents.length,
          lastEventId: transformedEvents.length > 0 ? Math.max(...transformedEvents.map(e => e.id)) : lastId
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
        service: 'KYC Simulator API - Supabase',
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