const net = require('net');

// Connect to the Redis server on port 6381
const client = new net.Socket();
client.connect(6381, '127.0.0.1', () => {
    console.log('Connected to Redis server');
    client.write('INFO replication\n');
});

client.on('data', (data) => {
    console.log('Received: ' + data.toString());
    client.destroy(); // kill client after server's response
});

client.on('close', () => {
    console.log('Connection closed');
});
