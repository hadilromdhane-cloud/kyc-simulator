// /functions/webhook/alert.js
import { broadcast } from '../events.js';

export async function onRequestPost(context) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Webhook POST request received`);
  
  try {
    // Get the raw request body
    const body = await context.request.text();
    console.log(`[${timestamp}] Raw webhook body:`, body);
    
    // Parse the webhook JSON
    let payload;
    try {
      payload = JSON.parse(body);
      console.log(`[${timestamp}] Parsed webhook payload:`, JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error(`[${timestamp}] JSON parsing error:`, parseError.message);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Invalid JSON payload',
        details: parseError.message
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Broadcast to any connected SSE clients
    console.log(`[${timestamp}] Broadcasting to SSE clients...`);
    await broadcast(payload);
    console.log(`[${timestamp}] Broadcast completed`);

    // Return HTTP 200 success response
    const response = {
      status: 'success',
      message: 'Webhook received and processed',
      receivedAt: timestamp,
      payloadReceived: payload
    };

    console.log(`[${timestamp}] Sending success response:`, response);

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
    console.error(`[${timestamp}] Webhook processing error:`, error);

    return new Response(JSON.stringify({
      status: 'error',
      message: 'Webhook processing failed',
      details: error.message,
      timestamp: timestamp
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// GET endpoint for health check and testing
export async function onRequestGet(context) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Webhook GET request (health check)`);
  
  return new Response(JSON.stringify({
    status: 'healthy',
    message: 'Webhook endpoint is operational',
    timestamp: timestamp,
    endpoint: '/webhook/alert',
    methods: ['GET', 'POST'],
    instructions: {
      'POST': 'Send JSON payload to trigger webhook',
      'GET': 'Health check - returns this message'
    }
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// OPTIONS for CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}