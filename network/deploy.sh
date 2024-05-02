#!/bin/bash

# ---------------------------------------------------------------------------
# Clear screen
# ---------------------------------------------------------------------------
clear

echo 
echo "# ---------------------------------------------------------------------------"
echo "# Deploy Nodes"
echo "# ---------------------------------------------------------------------------"
    docker stack deploy -c docker/docker-compose-network.yaml -c docker/docker-compose-couch.yaml -c docker/docker-compose-cli.yaml hlf --with-registry-auth 2>&1
    sleep 10
    docker ps -a
    sleep 10
    docker service ls
