// /controls/internalServer.js

const express = require('express');

let server = null;
let currentPort = null;
const sockets = new Set();

function startInternalServer(port = 8383) {
  if (server) {
    console.log(`[InternalServer] Already running on port ${currentPort}`);
    return;
  }

  const app = express();

  app.get('/', (req, res) => {
    res.send('<h1>Formidable Internal Server</h1><p>It works!</p>');
  });

  server = app.listen(port, () => {
    const addr = server.address();
    currentPort = (addr && typeof addr === "object") ? addr.port : port;
    console.log(`[InternalServer] Running at http://localhost:${currentPort}/`);
  });

  // Track sockets
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });
}

function stopInternalServer() {
  return new Promise((resolve, reject) => {
    if (server) {
      console.log(`[InternalServer] Stopping server... closing connections (${sockets.size})`);

      // Force-close all open sockets
      for (const socket of sockets) {
        socket.destroy();
      }

      server.close((err) => {
        if (err) {
          console.log(`[InternalServer] Error stopping:`, err);
          return reject(err);
        }
        console.log(`[InternalServer] Stopped`);
        server = null;
        currentPort = null;
        resolve();
      });
    } else {
      resolve(); // already stopped
    }
  });
}

function getStatus() {
  return {
    running: !!server,
    port: currentPort,
  };
}

module.exports = {
  startInternalServer,
  stopInternalServer,
  getStatus,
};
