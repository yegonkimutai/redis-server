const server = require('./server');

// Parse command-line arguments
const args = process.argv.slice(2);
let port = 6379;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
  }
}

// Start the server on the specified port
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
