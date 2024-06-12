const net = require("net");

const handleCommand = (command) => {
    const args = command.trim().split(' ');
    const cmd = args[0].toUpperCase();
  
    if (cmd === 'PING') {
      return '+PONG\r\n';
    } else if (cmd === 'ECHO' && args.length > 1) {
      const message = args.slice(1).join(' ');
      return `$${message.length}\r\n${message}\r\n`;
    } else {
      return '-ERR unknown command\r\n';
    }
  };

// Uncomment this block to pass the first stage
const server = net.createServer((connection) => {
  // Handle connection
  connection.on('data', (data) => {
    console.log(`Received data: ${data}`);
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
