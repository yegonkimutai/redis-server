#!/bin/bash

# Extract port and replicaof arguments
PORT=6379
REPLICAOF=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --port) PORT="$2"; shift ;;
        --replicaof) REPLICAOF="$2 $3"; shift; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Start the Redis server
node app/server.js --port $PORT --replicaof $REPLICAOF
