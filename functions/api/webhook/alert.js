// /functions/webhook/alert.js
import { broadcast } from '../../events';

export async function onRequestPost(context) {
  try {
    // Parse the webhook JSON
    const payload = await context.request.json();

    // Enhanced logging with timestamp
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Webhook Alert Received:`, JSON.stringify(payload, null, 2));
    
    // Log specific fields for better debugging
    console.log(`[${timestamp}] Alert Details:`, {
      customerId: payload.customerId || 'N/A',
      searchQueryId: payload.search_query_id || 'N/A',
      alertType: payload.alertType || 'Unknown',
      timestamp: payload.timestamp || 'N/A'
    });

    // Add server timestamp to payload before broadcasting
    const enrichedPayload = {
      ...payload,
      serverTimestamp: timestamp,
      source: 'webhook-alert'
    };

    // Broadcast to any connected SSE clients
    broadcast(enrichedPayload);
    console.log(`[${timestamp}] Alert broadcasted to connected clients`);

    // Return success response with detailed info
    const response = {
      status: 'success',
      message: 'Alert received and processed',
      receivedAt: timestamp,
      payloadKeys: Object.keys(payload),
      clientsNotified: true
    };

    console.log(`[${timestamp}] Response:`, response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Webhook processing error:`, error);
    console.error(`[${timestamp}] Error stack:`, error.stack);

    const errorResponse = {
      status: 'error',
      message: 'Invalid webhook payload',
      details: error.message,
      timestamp: timestamp
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Enhanced GET endpoint for health check with more info
export async function onRequestGet(context) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Health check request received`);
  
  const healthResponse = {
    status: 'healthy',
    message: 'Webhook endpoint is operational',
    timestamp: timestamp,
    endpoint: '/functions/webhook/alert',
    methods: ['GET', 'POST'],
    version: '1.1'
  };

  return new Response(JSON.stringify(healthResponse), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Handle OPTIONS requests for CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}