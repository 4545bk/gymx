/**
 * SSE (Server-Sent Events) Manager.
 * In-process broker for real-time check-in event broadcasting.
 * Connected clients: check-in page live feed, receptionist dashboard.
 * One persistent HTTP connection per client — no polling needed.
 */

// Active SSE client connections
const clients = new Set();

/**
 * Register a new SSE client connection.
 * Sets up proper headers and handles disconnect cleanup.
 */
const addClient = (req, res) => {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection event
  res.write('data: {"type":"connected"}\n\n');

  // Add to active clients
  clients.add(res);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
};

/**
 * Broadcast a check-in event to all connected SSE clients.
 * Called after every attendance record write (granted or denied).
 * 
 * @param {Object} data - Check-in result data
 */
const broadcast = (data) => {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(payload);
    } catch (err) {
      // Client disconnected — remove silently
      clients.delete(client);
    }
  });
};

/**
 * Get count of active SSE connections.
 */
const getClientCount = () => clients.size;

module.exports = { addClient, broadcast, getClientCount };
