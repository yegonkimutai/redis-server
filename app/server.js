const net = require('net');

const store = {};
const args = process.argv.slice(2);
let port = 6379;

const masterReplId = '8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb';
let masterReplOffset = 0;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
        port = parseInt(args[i + 1], 10);
    }
}

console.log(`Starting Redis master server on port ${port}`);

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

            masterReplOffset += Buffer.byteLength(data);
        } else if (command === 'GET') {
            const key = args[0];
            if (isExpired(key)) {
                socket.write('$-1\r\n');
            } else {
                const value = store[key].value;
                socket.write(`$${value.length}\r\n${value}\r\n`);
            }
        } else if (command === 'INFO' && args[0].toUpperCase() === 'REPLICATION') {
            let infoResponse = `role:master\r\n`;
            infoResponse += `master_replid:${masterReplId}\r\nmaster_repl_offset:${masterReplOffset}\r\n`;
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
