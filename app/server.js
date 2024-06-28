const net = require('net');

// In-memory key-value store with expiry support
const store = {};

const parseRESP = (data) => {
  const lines = data.toString().split('\r\n');
  const command = lines[2].toUpperCase(); // Command is the third element
  const args = lines.slice(4, lines.length - 1).filter((_, index) => index % 2 === 0); // Arguments are every second element starting from the fifth

  return { command, args };
};

// Check if a key is expired
const isExpired = (key) => {
  const record = store[key];
  if (!record) return true;
  if (record.expiry && Date.now() > record.expiry) {
    delete store[key];
    return true;
  }
  return false;
};

// Create and export the server instance
const server = net.createServer((socket) => {
  console.log('Client connected');

  socket.on('data', (data) => {
    console.log(`Received: ${data}`);

    const { command, args } = parseRESP(data);

    if (command === 'PING') {
      socket.write('+PONG\r\n');
    } else if (command === 'ECHO') {
      const response = `$${args[0].length}\r\n${args[0]}\r\n`;
      socket.write(response);
    } else if (command === 'SET') {
      const key = args[0];
      const value = args[1];
      let expiry = null;

      // Handle PX argument
      const pxIndex = args.findIndex(arg => arg.toUpperCase() === 'PX');
      if (pxIndex !== -1 && args[pxIndex + 1]) {
        const ttl = parseInt(args[pxIndex + 1], 10);
        if (!isNaN(ttl)) {
          expiry = Date.now() + ttl;
        }
      }

      store[key] = { value, expiry };
      socket.write('+OK\r\n');
    } else if (command === 'GET') {
      const key = args[0];
      if (isExpired(key)) {
        socket.write('$-1\r\n');
      } else {
        const value = store[key].value;
        socket.write(`$${value.length}\r\n${value}\r\n`);
      }
    } else {
      socket.write('-ERR unknown command\r\n');
    }
  });

  socket.on('end', () => {
    console.log('Client disconnected');
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
  });
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
});

module.exports = server;
