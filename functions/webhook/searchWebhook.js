// functions/webhook/searchWebhook.js
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
  console.log(`[${timestamp}] Search Webhook POST received - Total requests: ${requestLog.length}`);
  
  // Keep only last 100 requests
  if (requestLog.length > 100) {
    requestLog = requestLog.slice(-100);
  }
  
  try {
    const body = await context.request.text();
    console.log(`[${timestamp}] Raw Reis KYC webhook body:`, body);
    
    let payload;
    try {
      payload = JSON.parse(body);
      console.log(`[${timestamp}] Parsed search webhook payload:`, JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error(`[${timestamp}] JSON parsing error:`, parseError.message);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Invalid JSON payload',
        details: parseError.message
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Transform screening payload to your app's notification format
    const notification = {
      customerId: payload.customerId,
      businessKey: payload.businessKey,
      message: `${payload.ServiceType} completed - Customer ${payload.customerId}`,
      search_query_id: payload.searchQueryId,
      systemId: payload.systemId,
      systemName: payload.systemName,
      serviceType: payload.ServiceType,
      // Risk indicators
      isPEP: payload.isPEP,
      isSanctioned: payload.isSanctioned,
      isAdverseMedia: payload.isAdverseMedia,
      pepDecision: payload.pepDecision,
      sanctionDecision: payload.sanctionDecision,
      // Metadata
      timestamp: timestamp,
      source: 'Reis_KYC',
      hash: payload._hash,
      originalData: payload
    };

    console.log(`[${timestamp}] Broadcasting Reis KYC notification:`, JSON.stringify(notification, null, 2));
    
    // Broadcast the notification (or original payload - adjust as needed)
    await broadcast(notification);
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Reis KYC webhook received and processed',
      searchQueryId: payload.searchQueryId,
      receivedAt: timestamp
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${timestamp}] Search webhook processing error:`, error);
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
    endpoint: 'Reis KYC Webhook',
    totalWebhooksReceived: requestLog.length,
    lastRequests: requestLog.slice(-5),
    message: 'Reis KYC webhook endpoint operational',
    expectedFormat: {
      customerId: 'string (required)',
      searchQueryId: 'integer (required)',
      systemId: 'string (required)', 
      systemName: 'string (required)',
      ServiceType: 'string (required)',
      businessKey: 'string (required)',
      isPEP: 'boolean',
      isSanctioned: 'boolean',
      isAdverseMedia: 'boolean',
      pepDecision: 'string (optional)',
      sanctionDecision: 'string (optional)',
      _hash: 'string (optional)'
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}