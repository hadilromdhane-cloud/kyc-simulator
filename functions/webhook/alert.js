// api/webhook/alert.js
import { broadcast } from '../events.js';

let requestLog = [];

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    headers: req.headers,
    url: req.url,
    method: req.method
  };
  
  requestLog.push(logEntry);
  console.log(`[${timestamp}] Alert Webhook ${req.method} received - Total requests: ${requestLog.length}`);
  
  // Keep only last 100 requests
  if (requestLog.length > 100) {
    requestLog = requestLog.slice(-100);
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'healthy',
      totalWebhooksReceived: requestLog.filter(r => r.method === 'POST').length,
      lastRequests: requestLog.slice(-5),
      message: 'Alert webhook endpoint operational'
    });
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body;
      console.log(`[${timestamp}] Parsed alert webhook payload:`, JSON.stringify(payload, null, 2));

      broadcast(payload);
      
      return res.status(200).json({
        status: 'success',
        message: 'Alert webhook received and processed',
        receivedAt: timestamp
      });

    } catch (error) {
      console.error(`[${timestamp}] Alert webhook processing error:`, error);
      return res.status(500).json({
        status: 'error',
        message: 'Processing failed',
        details: error.message
      });
    }
  }

  // Method not allowed
  res.status(405).json({ message: 'Method not allowed' });
}