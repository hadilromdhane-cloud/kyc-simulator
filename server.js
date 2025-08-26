// server.js
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Webhook to receive alert updates
app.post('/webhook/alert', (req, res) => {
  console.log('Webhook received:', req.body);
  // Broadcast to connected clients via WebSocket or store in memory
  // Example: send message to front-end via SSE or WebSocket
  res.status(200).send({ status: 'ok' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



let clients = [];

// SSE endpoint for front-end to listen
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // optional but ensures headers are sent
  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

// Function to broadcast data to all connected clients
function broadcast(data) {
  clients.forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));
}






const PORT = 4000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
