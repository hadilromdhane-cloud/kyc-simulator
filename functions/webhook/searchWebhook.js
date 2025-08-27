import { broadcast } from '../events.js';

let requestCount = 0;

export async function onRequestPost(context) {
  requestCount++;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] === REIS KYC WEBHOOK ${requestCount} ===`);
  
  try {
    const body = await context.request.text();
    console.log(`[${timestamp}] Raw body:`, body);
    
    let payload;
    try {
      payload = JSON.parse(body);
      console.log(`[${timestamp}] Parsed Reis KYC payload:`, JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error(`[${timestamp}] JSON parsing error:`, parseError.message);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Invalid JSON payload'
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Transform Reis KYC format to your app's notification format
    const notification = {
      customerId: payload.customerId || `Customer-${payload.systemId}`,
      message: 'KYC screening and match resolution completed',
      search_query_id: payload.searchQueryId,
      systemId: payload.systemId,
      systemName: payload.systemName,
      timestamp: timestamp,
      source: 'Reis_KYC',
      originalData: payload
    };

    console.log(`[${timestamp}] Broadcasting notification:`, JSON.stringify(notification, null, 2));
    
    // Broadcast to your SSE clients
    broadcast(notification);
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'KYC webhook processed successfully',
      searchQueryId: payload.searchQueryId,
      receivedAt: timestamp
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error(`[${timestamp}] Processing error:`, error);
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Webhook processing failed',
      details: error.message,
      timestamp: timestamp
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'healthy',
    message: 'Reis KYC webhook endpoint operational',
    endpoint: '/searchWebhook',
    totalWebhooksReceived: requestCount,
    expectedFormat: {
      customerId: 'integer (optional)',
      searchQueryId: 'integer (required)',
      systemId: 'string (required)', 
      systemName: 'string (required)'
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
