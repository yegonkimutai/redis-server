const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const server = net.createServer((connection) => {
  // Handle connection
  connection.on('data', (data) => {
    console.log(`Received data: ${data}`);
    const response = '+PONG\r\n';
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
