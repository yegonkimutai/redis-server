const net = require('net');

// Configuration
const masterHost = '127.0.0.1'; 
const masterPort = 6380;
const replicaPort = 6381;

const store = {};

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

// Function to send REPLCONF commands
function sendReplconfListeningPort() {
    const replconfListeningPortMessage = '*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$4\r\n6381\r\n';
    client.write(replconfListeningPortMessage);
    console.log('REPLCONF listening-port sent to master');
}

function sendReplconfCapaPsync2() {
    const replconfCapaPsync2Message = '*3\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n';
    client.write(replconfCapaPsync2Message);
    console.log('REPLCONF capa psync2 sent to master');
}

// Function to send PSYNC command
function sendPsync() {
    const psyncMessage = '*3\r\n$5\r\nPSYNC\r\n$1\r\n?\r\n$2\r\n-1\r\n';
    client.write(psyncMessage);
    console.log('PSYNC sent to master');
}

// Handle write commands
function handleWriteCommand(commandArray) {
    const cmd = commandArray[0].toUpperCase();

    if (cmd === 'SET' && commandArray.length >= 3) {
        const key = commandArray[1];
        const value = commandArray[2];
        store[key] = value;
        console.log(`SET command received. Key: ${key}, Value: ${value}`);
    } else {
        console.log('Unknown write command:', commandArray);
    }
}

// Handle data received from the master
client.on('data', (data) => {
    const message = data.toString();
    console.log('Received from master:', message);

    if (message.includes('PONG')) {
        sendReplconfListeningPort();
    } else if (message.includes('OK')) {
        if (message.includes('REPLCONF listening-port')) {
            console.log('Handshake step 2: REPLCONF listening-port acknowledged');
            sendReplconfCapaPsync2();
        } else if (message.includes('REPLCONF capa psync2')) {
            console.log('Handshake step 3: REPLCONF capa psync2 acknowledged');
            sendPsync();
        }
    } else if (message.startsWith('+FULLRESYNC')) {
        console.log('PSYNC response received:', message.trim());
    } else if (message.startsWith('$')) {
        console.log('RDB file received:', message.trim());
    } else if (message.startsWith('*')) {
        const lines = message.split('\r\n');
        const length = parseInt(lines[0].substring(1));
        const commandArray = [];
        for (let i = 1; i < lines.length; i += 2) {
            if (lines[i][0] === '$') {
                commandArray.push(lines[i + 1]);
            }
        }
        handleWriteCommand(commandArray);
    } else {
        console.error('Unexpected response:', message);
    }
});

// Handle connection close
client.on('close', () => {
    console.log('Connection to master closed');
});

// Handle connection error
client.on('error', (error) => {
    console.error('Connection error:', error);
});
