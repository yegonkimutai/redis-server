const net = require('net');

const REPL_ID = '8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb';
const REPL_OFFSET = 0;

const store = {};
const expiryTimes = {};
const replicas = [];

// Hex representation of an empty RDB file
const emptyRdbFile = Buffer.from([
    0x52, 0x45, 0x44, 0x49, 0x53, 0x30, 0x30, 0x30, // REDIS000
    0x06, // RDB version
    0xFF, // EOF
    0x00, 0x00, 0x00, 0x00, // Checksum
    0x00, 0x00, 0x00, 0x00  // Checksum
]);

// Helper function to parse RESP array
const parseRespArray = (data) => {
    const lines = data.split('\r\n');
    const length = parseInt(lines[0].substring(1));
    const command = [];
    for (let i = 1; i < lines.length; i += 2) {
        if (lines[i][0] === '$') {
            command.push(lines[i + 1]);
        }
    }
    return command;
};

// Propagate write command to all connected replicas
const propagateToReplicas = (command) => {
    const respCommand = `*${command.length}\r\n` + command.map(arg => `$${arg.length}\r\n${arg}\r\n`).join('');
    replicas.forEach(replica => {
        console.log(`Propagating to replica: ${respCommand.trim()}`);
        replica.write(respCommand)
});
};

const handleCommand = (command, connection) => {
    const args = command.trim().split(' ');
    const cmd = args[0].toUpperCase();

    if (cmd === 'PING') {
        return '+PONG\r\n';
    } else if (cmd === 'ECHO' && args.length > 1) {
        const message = args.slice(1).join(' ');
        return `$${message.length}\r\n${message}\r\n`;
    } else if (cmd === 'SET' && args.length >= 3) {
        const key = args[1];
        const value = args[2];
        store[key] = value;

        if (args.length > 3 && args[3].toUpperCase() === 'PX' && !isNaN(args[4])) {
            const expiryTime = parseInt(args[4], 10);
            const expiryTimestamp = Date.now() + expiryTime;

            if (expiryTimes[key]) {
                clearTimeout(expiryTimes[key].timeoutId);
            }

            expiryTimes[key] = {
                expiryTimestamp,
                timeoutId: setTimeout(() => {
                    delete store[key];
                    delete expiryTimes[key];
                }, expiryTime)
            };
        }

        propagateToReplicas(['SET', key, value]);
        return '+OK\r\n';
    } else if (cmd === 'GET' && args.length > 1) {
        const key = args[1];
        if (key in store) {
            const value = store[key];
            return `$${value.length}\r\n${value}\r\n`;
        } else {
            return '$-1\r\n';
        }
    } else if (cmd === 'REPLCONF') {
        return '+OK\r\n';
    } else if (cmd === 'PSYNC' && args.length === 3) {
        const replid = REPL_ID;
        const offset = REPL_OFFSET;
        connection.write(`+FULLRESYNC ${replid} ${offset}\r\n`);
        const lengthOfFile = emptyRdbFile.length;
        connection.write(`$${lengthOfFile}\r\n`);
        connection.write(emptyRdbFile);
        replicas.push(connection);
        return null;
    } else {
        return '-ERR unknown command\r\n';
    }
};

// Create a TCP server
const server = net.createServer((connection) => {
    console.log('Replica connected');

    connection.on('data', (data) => {
        try {
            const commandArray = parseRespArray(data.toString());
            const response = handleCommand(commandArray.join(' '), connection);
            if (response) {
                connection.write(response);
            }
        } catch (err) {
            console.error(`Error processing command: ${err.message}`);
            connection.write('-ERR internal server error\r\n');
        }
    });

    connection.on('end', () => {
        console.log('Client disconnected');
        // Remove the connection from the replicas list
        const index = replicas.indexOf(connection);
        if (index !== -1) {
            replicas.splice(index, 1);
        }
    });

    connection.on('error', (err) => {
        console.error(`Connection error: ${err.message}`);
         // Remove the connection from the replicas list on error
         const index = replicas.indexOf(connection);
         if (index !== -1) {
             replicas.splice(index, 1);
         }
    });
});

server.listen(6380, "127.0.0.1", () => {
    console.log('Server listening on port 6380');
});
