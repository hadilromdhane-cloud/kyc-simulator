export async function onRequestPost(context) {
  const { request } = context;
  
  try {
    const body = await request.json();
    console.log('Webhook received:', body);
    
    // Store in Cloudflare KV or Durable Objects if needed
    // For now, just return success
    
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}