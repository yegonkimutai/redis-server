const net = require('net');
const process = require('process');

const store = {};
const args = process.argv.slice(2);
let port = 6379;
let replicaOf = null;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
        port = parseInt(args[i + 1], 10);
    } else if (args[i] === '--replicaof' && args[i + 1] && args[i + 2]) {
        replicaOf = { host: args[i + 1], port: parseInt(args[i + 2], 10) };
    }
}

console.log(`Starting Redis replica server on port ${port}`);
if (replicaOf) {
    console.log(`Configured as replica of ${replicaOf.host}:${replicaOf.port}`);
}

if (replicaOf) {
    console.log(`Connecting to master at ${replicaOf.host}:${replicaOf.port}`);
    const client = net.createConnection({ host: replicaOf.host, port: replicaOf.port }, () => {
        console.log('Connected to master, sending PING');
        client.write('*1\r\n$4\r\nPING\r\n');
    });

    client.on('data', (data) => {
        console.log(`Received from master: ${data}`);

        if (data.toString().includes('+PONG')) {
            console.log('Received PONG, sending REPLCONF listening-port');
            client.write(`*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$${port.toString().length}\r\n${port}\r\n`);
        } else if (data.toString().includes('+OK')) {
            if (!client.replconfSent1) {
                client.replconfSent1 = true;
                console.log('Received OK for listening-port, sending REPLCONF capa psync2');
                client.write(`*3\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n`);
            } else if (!client.replconfSent2) {
                client.replconfSent2 = true;
                console.log('Received OK for capa psync2, sending PSYNC ? -1');
                client.write(`*3\r\n$5\r\nPSYNC\r\n$1\r\n?\r\n$2\r\n-1\r\n`);
            }
        }
    });

    client.on('end', () => {
        console.log('Disconnected from master');
    });

    client.on('error', (err) => {
        console.error('Error connecting to master:', err.message);
    });
}

const parseRESP = (data) => {
    const lines = data.toString().split('\r\n');
    const command = lines[2].toUpperCase();
    const args = lines.slice(4, lines.length - 1).filter((_, index) => index % 2 === 0);

    return { command, args };
};

const isExpired = (key) => {
    const record = store[key];
    if (!record) return true;
    if (record.expiry && Date.now() > record.expiry) {
        delete store[key];
        return true;
    }
    return false;
};

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
        } else if (command === 'INFO' && args[0].toUpperCase() === 'REPLICATION') {
            const infoResponse = `role:slave\r\nmaster_replid:8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb\r\nmaster_repl_offset:0\r\n`;
            socket.write(`$${infoResponse.length}\r\n${infoResponse}\r\n`);
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

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
