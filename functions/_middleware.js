// /functions/_middleware.js
export async function onRequest(context) {
  const { request } = context;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] ${request.method} ${request.url}`);
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    console.log(`[${timestamp}] CORS preflight request`);
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token, x-auth-tenant',
        'Access-Control-Max-Age': '86400', // 24 hours
      }
    });
  }
  
  // Process the request
  const response = await context.next();
  
  // Add CORS headers to all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token, x-auth-tenant',
  };

  // Apply CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Log response status
  console.log(`[${timestamp}] Response: ${response.status} ${response.statusText}`);
  
  return response;
}