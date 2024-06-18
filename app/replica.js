const net = require('net');

// Configuration
const masterHost = '127.0.0.1'; 
const masterPort = 6380;

// Create a socket connection to the master
const client = new net.Socket();

// Connect to the master
client.connect(masterPort, masterHost, () => {
    console.log(`Connected to master at ${masterHost}:${masterPort}`);
    sendPing();
});

// Function to send PING command
function sendPing() {
    const pingMessage = '*1\r\n$4\r\nPING\r\n';  // Redis protocol for PING command
    client.write(pingMessage);
}

// Handle data received from the master
client.on('data', (data) => {
    console.log('Received from master:', data.toString());
    // Handle the response here (e.g., verify it's a PONG)
    if (data.toString().includes('PONG')) {
        console.log('Handshake step 1: PONG received');
        // Proceed to the next steps (REPLCONF)
        // sendReplconf();
    } else {
        console.error('Unexpected response:', data.toString());
    }
    // Close the connection after receiving PONG for this example
    client.destroy();
});

// Handle connection close
client.on('close', () => {
    console.log('Connection to master closed');
});

// Handle connection error
client.on('error', (error) => {
    console.error('Connection error:', error);
});