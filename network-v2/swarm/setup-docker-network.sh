#!/bin/bash

source ./.env

# ---------------------------------------------------------------------------
# Clear screen
# ---------------------------------------------------------------------------
clear

# ---------------------------------------------------------------------------
# Update Node ID
# ---------------------------------------------------------------------------
docker node update --label-add name=manager $NODE1_ID
docker node update --label-add name=worker1 $NODE2_ID
docker inspect $NODE1_ID
docker inspect $NODE2_ID

# ---------------------------------------------------------------------------
# Create a network
# ---------------------------------------------------------------------------
docker network create --driver=overlay --attachable $DOCKER_NETWORK_NAME