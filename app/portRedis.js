const net = require('net');
const minimist = require('minimist');

// Default port
let port = 6380;

// Parse command line arguments
const args = minimist(process.argv.slice(2));
if (args.port) {
    port = args.port;
}

// Server role - initially, it's a master
let role = 'master';

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
            case 'INFO':
                if (command[1] && command[1].toUpperCase() === 'REPLICATION') {
                    let response = '# Replication\n';
                    response += `role:${role}\n`;
                    response += 'connected_slaves:0\n';
                    response += 'master_replid:8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb\n';
                    response += 'master_repl_offset:0\n';
                    response += 'second_repl_offset:-1\n';
                    response += 'repl_backlog_active:0\n';
                    response += 'repl_backlog_size:1048576\n';
                    response += 'repl_backlog_first_byte_offset:0\n';
                    response += 'repl_backlog_histlen:\n';
                    socket.write(response + '\n');
                } else {
                    socket.write('ERROR: Unknown INFO section\n');
                }
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
