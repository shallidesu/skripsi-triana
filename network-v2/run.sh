#!/bin/bash

. scripts/utils.sh
: ${CONTAINER_CLI:="docker"}

# ---------------------------------------------------------------------------
# Clear screen
# ---------------------------------------------------------------------------
clear

# # ---------------------------------------------------------------------------
# # Generating CA
# # ---------------------------------------------------------------------------
# function createOrgs() {
#     if [ -d "organizations/peerOrganizations" ]; then
#         echo "# ---------------------------------------------------------------------------"
#         echo "# Remove old artifacts"
#         echo "# ---------------------------------------------------------------------------"
#         rm -Rf organizations/peerOrganizations && rm -Rf organizations/ordererOrganizations
#     fi

#     # ---------------------------------------------------------------------------
#     # Create crypto material using Fabric CA
#     # ---------------------------------------------------------------------------
#     echo 
#     echo "# ---------------------------------------------------------------------------"
#     echo "# Generating certificates using Fabric CA"
#     echo "# ---------------------------------------------------------------------------"
#     docker stack deploy -c $COMPOSE_FILE_CA hlf 2>&1
#     . organizations/fabric-ca/registerEnroll.sh

#     while :
#     do
#         if [ ! -f "organizations/fabric-ca/pemilihan/tls-cert.pem" ]; then
#         sleep 1
#         else
#         break
#         fi
#     done

#     echo
#     echo "# ---------------------------------------------------------------------------"
#     echo "# Creating Pemilihan Identities"
#     createPemilihan
#     echo "# ---------------------------------------------------------------------------"
#     echo "# Creating Orderer Org Identities"
#     createOrderer

#     echo
#     echo "# ---------------------------------------------------------------------------"
#     echo "# Generating CCP files for Pemilihan"
#     ./organizations/ccp-generate.sh
# }

# ---------------------------------------------------------------------------
# Up network
# ---------------------------------------------------------------------------
function networkUp() {
    if [ ! -d "organizations/peerOrganizations" ]; then
        createOrgs
    fi

    ${CONTAINER_CLI} stack deploy -c  ${CONTAINER_CLI}/$COMPOSE_FILE_BASE -c  ${CONTAINER_CLI}/$COMPOSE_FILE_COUCH -c  ${CONTAINER_CLI}/$COMPOSE_FILE_CLI hlf 2>&1

    ${CONTAINER_CLI} ps -a
    if [ $? -ne 0 ]; then
        fatalln "Unable to start network"
    fi
}

# ---------------------------------------------------------------------------
# Create channel, join peers of orgs, and update anchor peers
# ---------------------------------------------------------------------------
function createChannel() {
  scripts/createChannel.sh $CHANNEL_NAME $CLI_DELAY $MAX_RETRY $VERBOSE
}

# ---------------------------------------------------------------------------
# Use this as the default docker-compose yaml definition
# ---------------------------------------------------------------------------
COMPOSE_FILE_BASE=docker-compose-network.yaml
COMPOSE_FILE_COUCH=docker-compose-couch.yaml
COMPOSE_FILE_CA=docker-compose-ca.yaml
COMPOSE_FILE_CLI=docker-compose-cli.yaml

# ---------------------------------------------------------------------------
# Determine mode of operation and printing out what we asked for
# ---------------------------------------------------------------------------
if [ "$MODE" == "up" ]; then
  networkUp
elif [ "$MODE" == "createChannel" ]; then
  infoln "Creating channel '${CHANNEL_NAME}'."
  createChannel
elif [ "$MODE" == "down" ]; then
  infoln "Stopping network"
  networkDown
elif [ "$MODE" == "restart" ]; then
  infoln "Restarting network"
  networkDown
  networkUp
elif [ "$MODE" == "deployCC" ]; then
  infoln "deploying chaincode on channel '${CHANNEL_NAME}'"
  deployCC
elif [ "$MODE" == "cc" ] && [ "$SUBCOMMAND" == "package" ]; then
  packageChaincode
elif [ "$MODE" == "cc" ] && [ "$SUBCOMMAND" == "invoke" ]; then
  invokeChaincode
elif [ "$MODE" == "cc" ] && [ "$SUBCOMMAND" == "query" ]; then
  queryChaincode
else
  exit 1
fi