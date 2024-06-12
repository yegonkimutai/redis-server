const net = require("net");

const handleCommand = (command) => {
    const args = command.trim().split(' ');
    const cmd = args[0].toUpperCase();
  
    if (cmd === 'PING') {
      return '+PONG\r\n';
    } else if (cmd === 'ECHO' && args.length > 1) {
      const message = args.slice(1).join(' ');
      return `$${message.length}\r\n${message}\r\n`;
    } else if (cmd === 'SET' && args.length >= 3) {
        const key = args[1];
    const value = args[2];
    store[key] = value;

    if (args.length > 3 && args[3].toUpperCase() === 'PX' && !isNaN(args[4])) {
      const expiryTime = parseInt(args[4], 10);
      const expiryTimestamp = Date.now() + expiryTime;

      if (expiryTimes[key]) {
        clearTimeout(expiryTimes[key].timeoutId);
      }

      expiryTimes[key] = {
        expiryTimestamp,
        timeoutId: setTimeout(() => {
          delete store[key];
          delete expiryTimes[key];
        }, expiryTime)
      };
    }

    return '+OK\r\n';
      } else if (cmd === 'GET' && args.length > 1) {
        const key = args[1];
        if (key in store) {
          const value = store[key];
          return `$${value.length}\r\n${value}\r\n`;
        } else {
          return '$-1\r\n';
        }
      }else {
      return '-ERR unknown command\r\n';
    }
  };

// Uncomment this block to pass the first stage
const server = net.createServer((connection) => {
  // Handle connection
  connection.on('data', (data) => {
    const response = handleCommand(data.toString());
    connection.write(response);
  });

  connection.on('end', () => {
    console.log('Client disconnected');
  });

  connection.on('error', (err) => {
    console.error(`Connection error: ${err.message}`);
  });
});

server.listen(6380, "127.0.0.1", () => {
    console.log('Server listening on port 6380');
  });
