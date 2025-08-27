// /functions/webhook/alert.js
import { broadcast } from '../events';

export async function onRequestPost(context) {
  try {
    // Parse the webhook JSON
    const payload = await context.request.json();

    // Log the payload for debugging
    console.log('Received alert:', JSON.stringify(payload, null, 2));

    // Broadcast to any connected SSE clients
    broadcast(payload);

    // Return HTTP 200 success response
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Alert received',
      receivedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // optional for CORS
      }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);

    return new Response(JSON.stringify({
      status: 'error',
      message: 'Invalid webhook payload',
      details: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Optional GET endpoint for health check
export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'healthy',
    message: 'Webhook endpoint is up',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
