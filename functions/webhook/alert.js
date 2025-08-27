// functions/webhook/alert.js
import { broadcast } from '../events.js';

let requestLog = [];

export async function onRequestPost(context) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    headers: Object.fromEntries(context.request.headers.entries()),
    url: context.request.url,
    method: context.request.method
  };
  
  requestLog.push(logEntry);
  console.log(`[${timestamp}] Webhook POST received - Total requests: ${requestLog.length}`);
  
  // Keep only last 100 requests
  if (requestLog.length > 100) {
    requestLog = requestLog.slice(-100);
  }
  
  try {
    const body = await context.request.text();
    console.log(`[${timestamp}] Raw webhook body:`, body);
    
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
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await broadcast(payload);
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Webhook received and processed',
      receivedAt: timestamp
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${timestamp}] Webhook processing error:`, error);
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Processing failed',
      details: error.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'healthy',
    totalWebhooksReceived: requestLog.length,
    lastRequests: requestLog.slice(-5),
    message: 'Webhook endpoint operational'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}