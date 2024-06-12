const net = require('net');
const minimist = require('minimist');

// Default port
let port = 6380;

// Parse command line arguments
const args = minimist(process.argv.slice(2));
if (args.port) {
    port = args.port;
}

// Sample in-memory store
let dataStore = {};

// Handle incoming connections
const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        const command = data.toString().trim().split(' ');

        switch (command[0].toUpperCase()) {
            case 'SET':
                dataStore[command[1]] = command[2];
                socket.write('OK\n');
                break;
            case 'GET':
                socket.write((dataStore[command[1]] || '') + '\n');
                break;
            default:
                socket.write('ERROR: Unknown command\n');
        }
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

// Start the server on the specified port
server.listen(port, () => {
    console.log(`Redis server started on port ${port}`);
});